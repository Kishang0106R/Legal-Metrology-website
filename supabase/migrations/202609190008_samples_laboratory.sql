-- Legal Metrology Stage 9: samples, laboratories, testing, reports, and custody.
alter table public.profiles add column if not exists laboratory_id uuid;

do $$ begin alter type public.profile_status add value if not exists 'suspended'; exception when duplicate_object then null; end $$;

create table if not exists public.laboratories (
  id uuid primary key default gen_random_uuid(), laboratory_code text not null unique, laboratory_name text not null, laboratory_type text, organization_name text, address_line_1 text, address_line_2 text, state text, district text, city text, pincode text, phone text, email text, accreditation_details text, status text not null default 'Active' check (status in ('Active', 'Inactive')), created_at timestamptz not null default timezone('utc', now()), updated_at timestamptz not null default timezone('utc', now())
);
do $$ begin
  alter table public.profiles add constraint profiles_laboratory_fk foreign key (laboratory_id) references public.laboratories(id) on delete restrict;
exception when duplicate_object then null; end $$;

create table if not exists public.samples (
  id uuid primary key default gen_random_uuid(), sample_number text not null unique, inspection_id uuid not null references public.inspections(id) on delete restrict, business_id uuid not null references public.businesses(id) on delete restrict, product_id uuid not null references public.products(id) on delete restrict, sample_type text, sample_description text, quantity numeric check (quantity is null or quantity > 0), quantity_unit text, batch_number text, lot_number text, manufacturing_date text, expiry_date text, collection_date date not null, collection_time time, collected_by uuid references public.profiles(id) on delete restrict, collection_location text, seal_number text, sample_condition text, storage_condition text, remarks text, status text not null default 'Collected' check (status in ('Draft', 'Collected', 'Sealed', 'Dispatched', 'Received by Laboratory', 'Under Testing', 'Testing Completed', 'Report Generated', 'Report Reviewed', 'Returned', 'Cancelled')), created_at timestamptz not null default timezone('utc', now()), updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.sample_custody_events (
  id uuid primary key default gen_random_uuid(), sample_id uuid not null references public.samples(id) on delete restrict, event_type text not null check (event_type in ('Collected', 'Sealed', 'Stored', 'Dispatched', 'Received', 'Transferred', 'Returned', 'Other')), from_location text, to_location text, handled_by uuid references public.profiles(id) on delete restrict, event_date timestamptz not null default timezone('utc', now()), condition_notes text, seal_number text, remarks text, created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.sample_lab_assignments (
  id uuid primary key default gen_random_uuid(), sample_id uuid not null references public.samples(id) on delete restrict, laboratory_id uuid not null references public.laboratories(id) on delete restrict, assigned_by uuid references public.profiles(id) on delete restrict, assigned_at timestamptz not null default timezone('utc', now()), dispatch_date date, dispatch_method text, tracking_number text, expected_receipt_date date, received_date date, received_by uuid references public.profiles(id) on delete set null, status text not null default 'Assigned' check (status in ('Assigned', 'Dispatched', 'Received', 'Testing', 'Completed', 'Cancelled')), remarks text, created_at timestamptz not null default timezone('utc', now()), updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.lab_test_types (
  id uuid primary key default gen_random_uuid(), test_code text not null unique, test_name text not null, description text, unit text, method_reference text, status text not null default 'Active' check (status in ('Active', 'Inactive')), created_at timestamptz not null default timezone('utc', now()), updated_at timestamptz not null default timezone('utc', now())
);
create table if not exists public.lab_tests (
  id uuid primary key default gen_random_uuid(), sample_id uuid not null references public.samples(id) on delete restrict, laboratory_id uuid not null references public.laboratories(id) on delete restrict, test_type_id uuid references public.lab_test_types(id) on delete restrict, test_number text not null unique, assigned_by uuid references public.profiles(id) on delete set null, assigned_at timestamptz not null default timezone('utc', now()), assigned_to uuid references public.profiles(id) on delete set null, started_at timestamptz, completed_at timestamptz, status text not null default 'Assigned' check (status in ('Assigned', 'Accepted', 'In Progress', 'Completed', 'Cancelled', 'Requires Retest')), priority text not null default 'Normal', instructions text, remarks text, created_at timestamptz not null default timezone('utc', now()), updated_at timestamptz not null default timezone('utc', now())
);
create table if not exists public.lab_test_results (
  id uuid primary key default gen_random_uuid(), lab_test_id uuid not null references public.lab_tests(id) on delete restrict, parameter_name text not null, expected_value text, observed_value text, numeric_value numeric, unit text, result_status text not null default 'Not Tested' check (result_status in ('Pass', 'Fail', 'Inconclusive', 'Not Tested', 'Requires Retest')), method_used text, observations text, tested_by uuid references public.profiles(id) on delete set null, tested_at timestamptz, remarks text, created_at timestamptz not null default timezone('utc', now()), updated_at timestamptz not null default timezone('utc', now())
);
create table if not exists public.lab_reports (
  id uuid primary key default gen_random_uuid(), report_number text not null unique, sample_id uuid not null references public.samples(id) on delete restrict, inspection_id uuid not null references public.inspections(id) on delete restrict, laboratory_id uuid not null references public.laboratories(id) on delete restrict, report_date date, report_status text not null default 'Draft' check (report_status in ('Draft', 'Generated', 'Submitted', 'Reviewed', 'Requires Clarification', 'Superseded')), summary text, conclusion text, generated_by uuid references public.profiles(id) on delete set null, reviewed_by uuid references public.profiles(id) on delete set null, reviewed_at timestamptz, file_path text, created_at timestamptz not null default timezone('utc', now()), updated_at timestamptz not null default timezone('utc', now())
);

create sequence if not exists public.sample_number_seq;
create sequence if not exists public.lab_test_number_seq;
create sequence if not exists public.lab_report_number_seq;
create or replace function public.next_sample_number() returns text language sql security definer set search_path = public as $$ select 'SMP-' || extract(year from timezone('utc', now()))::text || '-' || lpad(nextval('public.sample_number_seq')::text, 6, '0') $$;
create or replace function public.next_lab_test_number() returns text language sql security definer set search_path = public as $$ select 'TEST-' || extract(year from timezone('utc', now()))::text || '-' || lpad(nextval('public.lab_test_number_seq')::text, 6, '0') $$;
create or replace function public.next_lab_report_number() returns text language sql security definer set search_path = public as $$ select 'LAB-' || extract(year from timezone('utc', now()))::text || '-' || lpad(nextval('public.lab_report_number_seq')::text, 6, '0') $$;

create or replace function public.validate_sample_relationships() returns trigger language plpgsql security definer set search_path = public as $$ begin if not exists (select 1 from public.inspections where id = new.inspection_id and business_id = new.business_id and product_id = new.product_id) then raise exception 'Sample business and product must match the inspection'; end if; return new; end; $$;
drop trigger if exists validate_sample_relationships on public.samples;
create trigger validate_sample_relationships before insert or update on public.samples for each row execute procedure public.validate_sample_relationships();
create or replace function public.touch_lab_updated_at() returns trigger language plpgsql as $$ begin new.updated_at = timezone('utc', now()); return new; end; $$;
drop trigger if exists samples_updated_at on public.samples;
create trigger samples_updated_at before update on public.samples for each row execute procedure public.touch_lab_updated_at();
drop trigger if exists laboratories_updated_at on public.laboratories;
create trigger laboratories_updated_at before update on public.laboratories for each row execute procedure public.touch_lab_updated_at();
drop trigger if exists assignments_updated_at on public.sample_lab_assignments;
create trigger assignments_updated_at before update on public.sample_lab_assignments for each row execute procedure public.touch_lab_updated_at();
drop trigger if exists lab_tests_updated_at on public.lab_tests;
create trigger lab_tests_updated_at before update on public.lab_tests for each row execute procedure public.touch_lab_updated_at();
drop trigger if exists lab_results_updated_at on public.lab_test_results;
create trigger lab_results_updated_at before update on public.lab_test_results for each row execute procedure public.touch_lab_updated_at();
drop trigger if exists lab_reports_updated_at on public.lab_reports;
create trigger lab_reports_updated_at before update on public.lab_reports for each row execute procedure public.touch_lab_updated_at();

create or replace function public.is_lab_user(target_laboratory_id uuid) returns boolean language sql stable security definer set search_path = public as $$ select exists (select 1 from public.profiles where auth_user_id = auth.uid() and status = 'active' and user_type = 'government' and role = 'laboratory_user' and laboratory_id = target_laboratory_id) $$;
create or replace function public.sample_scope(target_sample_id uuid) returns boolean language sql stable security definer set search_path = public as $$ select exists (select 1 from public.samples s join public.inspections i on i.id = s.inspection_id where s.id = target_sample_id and public.inspection_scope(i.office_id, s.business_id, i.inspector_id)) or exists (select 1 from public.sample_lab_assignments a where a.sample_id = target_sample_id and public.is_lab_user(a.laboratory_id)) $$;

alter table public.laboratories enable row level security; alter table public.samples enable row level security; alter table public.sample_custody_events enable row level security; alter table public.sample_lab_assignments enable row level security; alter table public.lab_test_types enable row level security; alter table public.lab_tests enable row level security; alter table public.lab_test_results enable row level security; alter table public.lab_reports enable row level security;
create policy laboratories_read_authenticated on public.laboratories for select to authenticated using (true);
create policy laboratories_admin_write on public.laboratories for all to authenticated using (public.is_super_admin()) with check (public.is_super_admin());
create policy samples_read_scoped on public.samples for select to authenticated using (public.sample_scope(id));
create policy samples_government_insert on public.samples for insert to authenticated with check ((select user_type from public.current_profile()) = 'government' and exists (select 1 from public.inspections i where i.id = inspection_id and public.inspection_scope(i.office_id, business_id, i.inspector_id)));
create policy samples_government_update on public.samples for update to authenticated using ((select user_type from public.current_profile()) = 'government' and public.sample_scope(id)) with check (public.sample_scope(id));
create policy custody_read_scoped on public.sample_custody_events for select to authenticated using (public.sample_scope(sample_id));
create policy custody_government_insert on public.sample_custody_events for insert to authenticated with check ((select user_type from public.current_profile()) = 'government' and public.sample_scope(sample_id));
create policy assignments_read_scoped on public.sample_lab_assignments for select to authenticated using (public.sample_scope(sample_id));
create policy assignments_admin_write on public.sample_lab_assignments for all to authenticated using (public.is_super_admin() or public.is_compliance_reviewer()) with check (public.is_super_admin() or public.is_compliance_reviewer());
create policy test_types_read_authenticated on public.lab_test_types for select to authenticated using (true);
create policy test_types_admin_write on public.lab_test_types for all to authenticated using (public.is_super_admin()) with check (public.is_super_admin());
create policy lab_tests_read_scoped on public.lab_tests for select to authenticated using (public.sample_scope(sample_id) or public.is_lab_user(laboratory_id));
create policy lab_tests_write_lab_or_admin on public.lab_tests for all to authenticated using (public.is_super_admin() or public.is_lab_user(laboratory_id)) with check (public.is_super_admin() or public.is_lab_user(laboratory_id));
create policy lab_results_read_scoped on public.lab_test_results for select to authenticated using (exists (select 1 from public.lab_tests t where t.id = lab_test_id and (public.sample_scope(t.sample_id) or public.is_lab_user(t.laboratory_id))));
create policy lab_results_write_lab on public.lab_test_results for all to authenticated using (exists (select 1 from public.lab_tests t where t.id = lab_test_id and public.is_lab_user(t.laboratory_id))) with check (exists (select 1 from public.lab_tests t where t.id = lab_test_id and public.is_lab_user(t.laboratory_id)));
create policy reports_read_scoped on public.lab_reports for select to authenticated using (public.sample_scope(sample_id) or public.is_lab_user(laboratory_id));
create policy reports_government_write on public.lab_reports for all to authenticated using (public.is_super_admin() or public.is_compliance_reviewer() or public.is_lab_user(laboratory_id)) with check (public.is_super_admin() or public.is_compliance_reviewer() or public.is_lab_user(laboratory_id));

insert into public.lab_test_types (test_code, test_name, description, status) values ('NET-QTY', 'Net Quantity Verification', 'Record observed net quantity for review.', 'Active'), ('WEIGHT', 'Weight Verification', 'Record weight observations for review.', 'Active'), ('VOLUME', 'Volume Verification', 'Record volume observations for review.', 'Active'), ('PACKAGE', 'Package Measurement', 'Record package measurements for review.', 'Active'), ('OTHER', 'Other', 'Configurable laboratory test.', 'Active') on conflict (test_code) do nothing;
insert into storage.buckets (id, name, public) values ('laboratory-documents', 'laboratory-documents', false) on conflict (id) do nothing;
create policy laboratory_documents_read on storage.objects for select to authenticated using (bucket_id = 'laboratory-documents');
create policy laboratory_documents_write on storage.objects for insert to authenticated with check (bucket_id = 'laboratory-documents' and (public.is_super_admin() or public.is_compliance_reviewer() or public.is_lab_user((storage.foldername(name))[1]::uuid)));

create index if not exists samples_inspection_idx on public.samples(inspection_id); create index if not exists samples_business_idx on public.samples(business_id); create index if not exists samples_product_idx on public.samples(product_id); create index if not exists samples_status_idx on public.samples(status); create index if not exists assignments_sample_idx on public.sample_lab_assignments(sample_id); create index if not exists assignments_lab_idx on public.sample_lab_assignments(laboratory_id); create index if not exists lab_tests_sample_idx on public.lab_tests(sample_id); create index if not exists lab_tests_lab_idx on public.lab_tests(laboratory_id); create index if not exists lab_results_test_idx on public.lab_test_results(lab_test_id); create index if not exists lab_reports_sample_idx on public.lab_reports(sample_id); create index if not exists lab_reports_inspection_idx on public.lab_reports(inspection_id);
