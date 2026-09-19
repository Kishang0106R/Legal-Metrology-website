-- Legal Metrology Stage 4: business records, applications, documents, and ownership RLS.

do $$ begin alter type public.business_status add value if not exists 'under_review'; exception when duplicate_object then null; end $$;

alter table public.businesses add column if not exists pan_number text;
alter table public.businesses add column if not exists address_line_1 text;
alter table public.businesses add column if not exists address_line_2 text;
alter table public.businesses add column if not exists city text;
alter table public.businesses add column if not exists website text;

create sequence if not exists public.business_code_seq;
create sequence if not exists public.business_application_seq;
create or replace function public.next_business_code() returns text language sql security definer set search_path = public as $$ select 'BUS-' || lpad(nextval('public.business_code_seq')::text, 6, '0') $$;
create or replace function public.next_application_number() returns text language sql security definer set search_path = public as $$ select 'APP-' || extract(year from timezone('utc', now()))::text || '-' || lpad(nextval('public.business_application_seq')::text, 6, '0') $$;

create table if not exists public.business_applications (
  id uuid primary key default gen_random_uuid(),
  application_number text not null unique default public.next_application_number(),
  business_id uuid not null references public.businesses(id) on delete restrict,
  submitted_by uuid not null references auth.users(id) on delete restrict,
  application_type text not null check (application_type in ('new_business_registration', 'business_information_update', 'document_update', 'other')),
  status text not null default 'pending' check (status in ('pending', 'under_review', 'requires_correction', 'approved', 'rejected')),
  submitted_at timestamptz not null default timezone('utc', now()),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  review_remarks text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.business_documents (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete restrict,
  document_type text not null,
  document_name text not null,
  file_path text not null unique,
  uploaded_by uuid not null references auth.users(id) on delete restrict,
  uploaded_at timestamptz not null default timezone('utc', now()),
  status text not null default 'active' check (status in ('active', 'archived', 'rejected')),
  remarks text,
  created_at timestamptz not null default timezone('utc', now())
);

create or replace function public.is_business_manager()
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.profiles where auth_user_id = auth.uid() and status = 'active' and role in ('super_admin', 'controller', 'assistant_controller', 'clerk')) $$;

create or replace function public.is_business_owner(target_business_id uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.profiles where auth_user_id = auth.uid() and status = 'active' and user_type = 'business' and business_id = target_business_id) $$;

create or replace function public.prevent_business_owner_restricted_changes()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if exists (select 1 from public.profiles where auth_user_id = auth.uid() and user_type = 'business') and (new.business_code is distinct from old.business_code or new.status is distinct from old.status or new.business_type is distinct from old.business_type) then
    raise exception 'Business users cannot change business ownership, type, code, or status';
  end if;
  return new;
end; $$;

drop trigger if exists business_owner_restricted_changes on public.businesses;
create trigger business_owner_restricted_changes before update on public.businesses for each row execute procedure public.prevent_business_owner_restricted_changes();

alter table public.business_applications enable row level security;
alter table public.business_documents enable row level security;

-- Replace the Part 2 business policies with role-aware policies.
drop policy if exists businesses_read_scoped on public.businesses;
drop policy if exists businesses_business_update on public.businesses;
drop policy if exists businesses_admin_write on public.businesses;
create policy businesses_read_scoped on public.businesses for select to authenticated using (public.is_super_admin() or public.is_business_manager() or id = (select business_id from public.current_profile()));
create policy businesses_manager_write on public.businesses for all to authenticated using (public.is_business_manager()) with check (public.is_business_manager());
create policy businesses_owner_update on public.businesses for update to authenticated using (public.is_business_owner(id)) with check (public.is_business_owner(id));

create policy applications_read_scoped on public.business_applications for select to authenticated using (public.is_super_admin() or public.is_business_manager() or public.is_business_owner(business_id));
create policy applications_business_submit on public.business_applications for insert to authenticated with check (public.is_business_owner(business_id) and submitted_by = auth.uid());
create policy applications_manager_update on public.business_applications for update to authenticated using (public.is_business_manager()) with check (public.is_business_manager());

create policy documents_read_scoped on public.business_documents for select to authenticated using (public.is_super_admin() or public.is_business_manager() or public.is_business_owner(business_id));
create policy documents_business_upload on public.business_documents for insert to authenticated with check (public.is_business_owner(business_id) and uploaded_by = auth.uid());
create policy documents_manager_update on public.business_documents for update to authenticated using (public.is_business_manager()) with check (public.is_business_manager());
create policy documents_manager_archive on public.business_documents for delete to authenticated using (public.is_business_manager());

insert into storage.buckets (id, name, public) values ('business-documents', 'business-documents', false) on conflict (id) do nothing;
create policy business_documents_storage_read on storage.objects for select to authenticated using (bucket_id = 'business-documents' and (public.is_super_admin() or public.is_business_manager() or public.is_business_owner((storage.foldername(name))[1]::uuid)));
create policy business_documents_storage_upload on storage.objects for insert to authenticated with check (bucket_id = 'business-documents' and public.is_business_owner((storage.foldername(name))[1]::uuid));
create policy business_documents_storage_update on storage.objects for update to authenticated using (bucket_id = 'business-documents' and public.is_business_owner((storage.foldername(name))[1]::uuid));
create policy business_documents_storage_delete on storage.objects for delete to authenticated using (bucket_id = 'business-documents' and (public.is_super_admin() or public.is_business_manager()));

create index if not exists businesses_type_status_idx on public.businesses(business_type, status);
create index if not exists businesses_state_district_idx on public.businesses(state, district);
create index if not exists applications_business_id_idx on public.business_applications(business_id);
create index if not exists applications_status_idx on public.business_applications(status);
create index if not exists documents_business_id_idx on public.business_documents(business_id);
