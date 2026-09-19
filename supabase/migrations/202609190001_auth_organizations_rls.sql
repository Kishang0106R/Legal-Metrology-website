-- Legal Metrology Stage 2: identity, organization separation, and authorization.
-- Apply with Supabase CLI or the SQL editor before enabling the authenticated UI.

create extension if not exists pgcrypto;

do $$ begin
  create type public.user_type as enum ('government', 'business');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.profile_role as enum ('super_admin', 'controller', 'assistant_controller', 'inspector', 'clerk', 'laboratory_user', 'manufacturer', 'packer', 'importer', 'dealer', 'retailer');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.profile_status as enum ('pending', 'active', 'inactive', 'suspended');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.office_status as enum ('active', 'inactive');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.business_status as enum ('pending', 'active', 'inactive', 'suspended');
exception when duplicate_object then null; end $$;

create table if not exists public.offices (
  id uuid primary key default gen_random_uuid(),
  office_code text not null unique,
  office_name text not null,
  office_type text not null check (office_type in ('controller_office', 'assistant_controller_office', 'regional_office', 'district_office', 'inspector_office', 'other')),
  state text not null,
  district text not null,
  address text,
  phone text,
  email text,
  status public.office_status not null default 'active',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.businesses (
  id uuid primary key default gen_random_uuid(),
  business_code text not null unique,
  legal_name text not null,
  business_type text not null check (business_type in ('manufacturer', 'packer', 'importer', 'dealer', 'retailer')),
  registration_number text,
  gstin text,
  address text,
  state text not null,
  district text not null,
  pincode text,
  contact_person text,
  phone text,
  email text,
  status public.business_status not null default 'pending',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null,
  phone text,
  user_type public.user_type not null,
  role public.profile_role not null,
  office_id uuid references public.offices(id) on delete restrict,
  business_id uuid references public.businesses(id) on delete restrict,
  status public.profile_status not null default 'pending',
  avatar_url text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint profiles_one_organization check (not (office_id is not null and business_id is not null)),
  constraint profiles_valid_organization check (
    (user_type = 'government' and office_id is not null and business_id is null and role in ('super_admin', 'controller', 'assistant_controller', 'inspector', 'clerk', 'laboratory_user'))
    or
    (user_type = 'business' and business_id is not null and office_id is null and role in ('manufacturer', 'packer', 'importer', 'dealer', 'retailer'))
  )
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create or replace function public.current_profile()
returns public.profiles
language sql stable security definer set search_path = public
as $$ select p from public.profiles p where p.auth_user_id = auth.uid() limit 1 $$;

create or replace function public.is_super_admin()
returns boolean
language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.profiles where auth_user_id = auth.uid() and role = 'super_admin' and status = 'active') $$;

create or replace function public.audit_auth_event()
returns trigger
language plpgsql security definer set search_path = public
as $$ begin
  insert into public.audit_logs (user_id, action, entity_type, entity_id, new_data)
  values (new.auth_user_id, 'user_created', 'profile', new.id, to_jsonb(new));
  return new;
end; $$;

drop trigger if exists profiles_audit_insert on public.profiles;
create trigger profiles_audit_insert after insert on public.profiles for each row execute procedure public.audit_auth_event();

create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  new_business_id uuid;
  metadata jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  requested_type text := coalesce(metadata ->> 'user_type', 'business');
  requested_business_type text := coalesce(metadata ->> 'business_type', 'dealer');
begin
  -- Public signup is intentionally business-only. Government identities are provisioned by an administrator service.
  -- The service creates the auth identity first and inserts the government profile separately.
  if requested_type <> 'business' then
    return new;
  end if;
  insert into public.businesses (business_code, legal_name, business_type, registration_number, address, state, district, contact_person, phone, email)
  values ('PENDING-' || upper(substr(replace(new.id::text, '-', ''), 1, 10)), coalesce(metadata ->> 'business_name', 'Pending business'), requested_business_type, metadata ->> 'registration_number', metadata ->> 'address', coalesce(metadata ->> 'state', 'Pending'), coalesce(metadata ->> 'district', 'Pending'), metadata ->> 'full_name', metadata ->> 'phone', new.email)
  returning id into new_business_id;
  insert into public.profiles (auth_user_id, full_name, email, phone, user_type, role, business_id, status)
  values (new.id, coalesce(metadata ->> 'full_name', 'Business user'), new.email, metadata ->> 'phone', 'business', (case when requested_business_type in ('manufacturer', 'packer', 'importer', 'dealer', 'retailer') then requested_business_type else 'dealer' end)::public.profile_role, new_business_id, 'pending');
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

alter table public.offices enable row level security;
alter table public.businesses enable row level security;
alter table public.profiles enable row level security;
alter table public.audit_logs enable row level security;

create policy offices_read_authenticated on public.offices for select to authenticated using (
  public.is_super_admin() or exists (select 1 from public.profiles p where p.auth_user_id = auth.uid() and p.status = 'active' and p.user_type = 'government' and p.office_id = offices.id)
);
create policy offices_admin_write on public.offices for all to authenticated using (public.is_super_admin()) with check (public.is_super_admin());

create policy businesses_read_scoped on public.businesses for select to authenticated using (
  public.is_super_admin()
  or id = (select business_id from public.current_profile())
  or ((select user_type from public.current_profile()) = 'government' and (select status from public.current_profile()) = 'active')
);
create policy businesses_business_update on public.businesses for update to authenticated using (id = (select business_id from public.current_profile())) with check (id = (select business_id from public.current_profile()));
create policy businesses_admin_write on public.businesses for all to authenticated using (public.is_super_admin()) with check (public.is_super_admin());

create policy profiles_read_self_or_admin on public.profiles for select to authenticated using (auth_user_id = auth.uid() or public.is_super_admin());
create policy profiles_admin_write on public.profiles for all to authenticated using (public.is_super_admin()) with check (public.is_super_admin());
create policy profiles_self_update_safe on public.profiles for update to authenticated using (auth_user_id = auth.uid()) with check (auth_user_id = auth.uid() and role = (select role from public.current_profile()) and office_id is not distinct from (select office_id from public.current_profile()) and business_id is not distinct from (select business_id from public.current_profile()));

create policy audit_logs_admin_read on public.audit_logs for select to authenticated using (public.is_super_admin());
create policy audit_logs_insert_authenticated on public.audit_logs for insert to authenticated with check (user_id = auth.uid());

create index if not exists profiles_office_id_idx on public.profiles(office_id);
create index if not exists profiles_business_id_idx on public.profiles(business_id);
create index if not exists audit_logs_user_id_idx on public.audit_logs(user_id);
