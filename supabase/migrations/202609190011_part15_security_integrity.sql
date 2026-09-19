-- Part 15: role completeness, least-privilege storage, and relational integrity.
-- This migration is intentionally additive and preserves historical records.

alter type public.profile_role add value if not exists 'retailer';

alter table public.offices add column if not exists is_demo boolean not null default false;
alter table public.businesses add column if not exists is_demo boolean not null default false;
alter table public.profiles add column if not exists is_demo boolean not null default false;

alter table public.profiles drop constraint if exists profiles_valid_organization;
alter table public.profiles add constraint profiles_valid_organization check (
  (user_type = 'government' and office_id is not null and business_id is null and role in ('super_admin', 'controller', 'assistant_controller', 'inspector', 'clerk', 'laboratory_user'))
  or
  (user_type = 'business' and business_id is not null and office_id is null and role in ('manufacturer', 'packer', 'importer', 'dealer', 'retailer'))
);

alter table public.inspections drop constraint if exists inspections_inspector_active;
alter table public.inspections add constraint inspections_inspector_active check (inspector_id is not null);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  event_type text not null,
  title text not null,
  message text not null,
  entity_type text,
  entity_id uuid,
  is_read boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  read_at timestamptz
);

alter table public.notifications enable row level security;
drop policy if exists notifications_read_own on public.notifications;
create policy notifications_read_own on public.notifications for select to authenticated using (recipient_id = (select id from public.current_profile()));
drop policy if exists notifications_update_own on public.notifications;
create policy notifications_update_own on public.notifications for update to authenticated using (recipient_id = (select id from public.current_profile())) with check (recipient_id = (select id from public.current_profile()));
drop policy if exists notifications_insert_system on public.notifications;
create policy notifications_insert_system on public.notifications for insert to authenticated with check (public.is_super_admin() or recipient_id = (select id from public.current_profile()));

drop policy if exists laboratory_documents_read on storage.objects;
create policy laboratory_documents_read on storage.objects for select to authenticated using (
  bucket_id = 'laboratory-documents'
  and (public.is_super_admin() or public.is_lab_user((storage.foldername(name))[1]::uuid))
);

drop policy if exists laboratory_documents_write on storage.objects;
create policy laboratory_documents_write on storage.objects for insert to authenticated with check (
  bucket_id = 'laboratory-documents'
  and (public.is_super_admin() or public.is_lab_user((storage.foldername(name))[1]::uuid))
);

drop policy if exists reports_storage_read on storage.objects;
create policy reports_storage_read on storage.objects for select to authenticated using (
  bucket_id = 'reports'
  and exists (
    select 1 from public.reports r
    left join public.inspections i on i.id = r.inspection_id
    where (r.file_path = name or r.editable_file_path = name)
      and public.report_scope(r.id)
  )
);

drop policy if exists reports_storage_write on storage.objects;
create policy reports_storage_write on storage.objects for insert to authenticated with check (
  bucket_id = 'reports' and public.is_report_manager()
);

create index if not exists inspections_office_status_date_idx on public.inspections(office_id, status, inspection_date desc);
create index if not exists ocr_runs_inspection_status_idx on public.ocr_runs(inspection_id, status);
create index if not exists compliance_checks_inspection_status_idx on public.compliance_checks(inspection_id, status);
create index if not exists notifications_recipient_read_idx on public.notifications(recipient_id, is_read, created_at desc);