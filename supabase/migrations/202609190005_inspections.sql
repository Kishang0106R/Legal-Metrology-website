-- Legal Metrology Stage 6: central inspection records, assignments, and private evidence.
create table if not exists public.inspections (
  id uuid primary key default gen_random_uuid(),
  inspection_number text not null unique,
  office_id uuid not null references public.offices(id) on delete restrict,
  inspector_id uuid not null references public.profiles(id) on delete restrict,
  business_id uuid not null references public.businesses(id) on delete restrict,
  product_id uuid not null references public.products(id) on delete restrict,
  inspection_type text not null,
  inspection_date date not null,
  inspection_time time,
  inspection_location text,
  state text,
  district text,
  city text,
  pincode text,
  purpose text,
  remarks text,
  status text not null default 'draft' check (status in ('draft', 'scheduled', 'assigned', 'in_progress', 'awaiting_verification', 'awaiting_laboratory', 'completed', 'closed', 'cancelled')),
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high', 'urgent')),
  started_at timestamptz,
  completed_at timestamptz,
  created_by uuid references public.profiles(id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint inspections_product_belongs_to_business foreign key (product_id, business_id) references public.products(id, business_id)
);

create unique index if not exists products_id_business_id_unique on public.products(id, business_id);
create sequence if not exists public.inspection_number_seq;
create or replace function public.next_inspection_number()
returns text language sql security definer set search_path = public
as $$ select 'INSP-' || extract(year from timezone('utc', now()))::text || '-' || lpad(nextval('public.inspection_number_seq')::text, 6, '0') $$;

create table if not exists public.inspection_assignments (
  id uuid primary key default gen_random_uuid(),
  inspection_id uuid not null references public.inspections(id) on delete restrict,
  office_id uuid not null references public.offices(id) on delete restrict,
  inspector_id uuid not null references public.profiles(id) on delete restrict,
  assigned_by uuid not null references public.profiles(id) on delete restrict,
  assigned_at timestamptz not null default timezone('utc', now()),
  unassigned_at timestamptz,
  status text not null default 'active' check (status in ('active', 'ended'))
);

create table if not exists public.inspection_evidence (
  id uuid primary key default gen_random_uuid(),
  inspection_id uuid not null references public.inspections(id) on delete restrict,
  evidence_type text not null default 'other',
  file_name text not null,
  file_path text not null unique,
  uploaded_by uuid not null references auth.users(id) on delete restrict,
  uploaded_at timestamptz not null default timezone('utc', now()),
  description text,
  status text not null default 'active' check (status in ('active', 'archived'))
);

create or replace function public.validate_inspection_relationships()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if not exists (select 1 from public.products where id = new.product_id and business_id = new.business_id) then raise exception 'The selected product does not belong to the selected business'; end if;
  if not exists (select 1 from public.profiles where id = new.inspector_id and user_type = 'government' and role = 'inspector' and office_id = new.office_id) then raise exception 'The inspector must be an active inspector assigned to the selected office'; end if;
  return new;
end; $$;
drop trigger if exists validate_inspection_relationships on public.inspections;
create trigger validate_inspection_relationships before insert or update on public.inspections for each row execute procedure public.validate_inspection_relationships();

create or replace function public.touch_inspection_updated_at()
returns trigger language plpgsql as $$ begin new.updated_at = timezone('utc', now()); return new; end; $$;
drop trigger if exists inspections_updated_at on public.inspections;
create trigger inspections_updated_at before update on public.inspections for each row execute procedure public.touch_inspection_updated_at();

create or replace function public.inspection_scope(target_office_id uuid, target_business_id uuid, target_inspector_id uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.profiles p where p.auth_user_id = auth.uid() and p.status = 'active' and ((p.user_type = 'business' and p.business_id = target_business_id) or (p.user_type = 'government' and (p.role = 'super_admin' or p.office_id = target_office_id or p.id = target_inspector_id))) ) $$;

alter table public.inspections enable row level security;
alter table public.inspection_assignments enable row level security;
alter table public.inspection_evidence enable row level security;
create policy inspections_read_scoped on public.inspections for select to authenticated using (public.inspection_scope(office_id, business_id, inspector_id));
create policy inspections_insert_government on public.inspections for insert to authenticated with check ((select user_type from public.current_profile()) = 'government' and public.inspection_scope(office_id, business_id, inspector_id));
create policy inspections_update_government on public.inspections for update to authenticated using ((select user_type from public.current_profile()) = 'government' and public.inspection_scope(office_id, business_id, inspector_id)) with check (public.inspection_scope(office_id, business_id, inspector_id));
create policy inspections_business_read_only on public.inspections for update to authenticated using (false);
create policy assignments_read_scoped on public.inspection_assignments for select to authenticated using (public.inspection_scope(office_id, (select business_id from public.inspections where id = inspection_id), inspector_id));
create policy assignments_government_write on public.inspection_assignments for all to authenticated using ((select user_type from public.current_profile()) = 'government' and public.is_super_admin()) with check ((select user_type from public.current_profile()) = 'government' and public.is_super_admin());
create policy evidence_read_scoped on public.inspection_evidence for select to authenticated using (exists (select 1 from public.inspections i where i.id = inspection_id and public.inspection_scope(i.office_id, i.business_id, i.inspector_id)));
create policy evidence_government_upload on public.inspection_evidence for insert to authenticated with check (exists (select 1 from public.inspections i where i.id = inspection_id and (i.inspector_id = (select id from public.current_profile()) or public.is_super_admin())));

insert into storage.buckets (id, name, public) values ('inspection-evidence', 'inspection-evidence', false) on conflict (id) do nothing;
create policy inspection_evidence_storage_read on storage.objects for select to authenticated using (bucket_id = 'inspection-evidence' and exists (select 1 from public.inspections i where i.id = (storage.foldername(name))[1]::uuid and public.inspection_scope(i.office_id, i.business_id, i.inspector_id)));
create policy inspection_evidence_storage_upload on storage.objects for insert to authenticated with check (bucket_id = 'inspection-evidence' and exists (select 1 from public.inspections i where i.id = (storage.foldername(name))[1]::uuid and (i.inspector_id = (select id from public.current_profile()) or public.is_super_admin())));

create index if not exists inspections_number_idx on public.inspections(inspection_number);
create index if not exists inspections_office_idx on public.inspections(office_id);
create index if not exists inspections_inspector_idx on public.inspections(inspector_id);
create index if not exists inspections_business_idx on public.inspections(business_id);
create index if not exists inspections_product_idx on public.inspections(product_id);
create index if not exists inspections_date_idx on public.inspections(inspection_date desc);
create index if not exists inspections_status_idx on public.inspections(status);
create index if not exists inspections_priority_idx on public.inspections(priority);
create index if not exists inspections_created_at_idx on public.inspections(created_at desc);
