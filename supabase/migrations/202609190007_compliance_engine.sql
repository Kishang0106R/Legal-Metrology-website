-- Legal Metrology Stage 8: configurable, versioned, explainable compliance engine.
create table if not exists public.legislations (
  id uuid primary key default gen_random_uuid(),
  legislation_code text not null unique,
  legislation_name text not null,
  legislation_type text,
  year integer,
  description text,
  jurisdiction text,
  status text not null default 'Active' check (status in ('Active', 'Inactive')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.compliance_rules (
  id uuid primary key default gen_random_uuid(),
  legislation_id uuid references public.legislations(id) on delete restrict,
  rule_code text not null,
  section_or_rule text,
  rule_title text not null,
  requirement text not null,
  description text,
  check_type text not null default 'manual_review',
  configuration jsonb not null default '{}'::jsonb,
  applicable_product_category text,
  priority text not null default 'Normal',
  version text not null default '1.0',
  effective_from date,
  effective_to date,
  status text not null default 'Active' check (status in ('Draft', 'Active', 'Inactive', 'Retired')),
  legal_reference text,
  source_document text,
  source_url text,
  legal_notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (rule_code, version)
);

create table if not exists public.compliance_runs (
  id uuid primary key default gen_random_uuid(),
  inspection_id uuid not null references public.inspections(id) on delete restrict,
  rule_set_version text,
  status text not null default 'Queued' check (status in ('Queued', 'Running', 'Completed', 'Failed', 'Needs Review')),
  started_at timestamptz,
  completed_at timestamptz,
  executed_by uuid references public.profiles(id) on delete restrict,
  total_rules integer not null default 0,
  passed_rules integer not null default 0,
  failed_rules integer not null default 0,
  uncertain_rules integer not null default 0,
  not_applicable_rules integer not null default 0,
  requires_review integer not null default 0,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.compliance_checks (
  id uuid primary key default gen_random_uuid(),
  inspection_id uuid not null references public.inspections(id) on delete restrict,
  compliance_run_id uuid references public.compliance_runs(id) on delete restrict,
  rule_id uuid not null references public.compliance_rules(id) on delete restrict,
  rule_version text not null,
  field_name text,
  expected_requirement text,
  observed_value text,
  automated_result text not null check (automated_result in ('Pass', 'Fail', 'Not Detected', 'Uncertain', 'Not Applicable', 'Requires Manual Verification')),
  automated_reason text not null,
  confidence numeric check (confidence is null or confidence between 0 and 100),
  evidence_id uuid references public.inspection_evidence(id) on delete restrict,
  ocr_field_id uuid references public.ocr_extracted_fields(id) on delete restrict,
  officer_result text check (officer_result in ('Confirmed Compliant', 'Confirmed Non-Compliant', 'Not Applicable', 'Requires More Evidence', 'Unable to Determine')),
  officer_remarks text,
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  status text not null default 'Pending Review' check (status in ('Pending Review', 'Reviewed', 'Requires More Evidence')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists compliance_rules_code_version_idx on public.compliance_rules(rule_code, version);
create index if not exists compliance_rules_status_idx on public.compliance_rules(status);
create index if not exists compliance_rules_legislation_idx on public.compliance_rules(legislation_id);
create index if not exists compliance_runs_inspection_idx on public.compliance_runs(inspection_id);
create index if not exists compliance_checks_inspection_idx on public.compliance_checks(inspection_id);
create index if not exists compliance_checks_rule_idx on public.compliance_checks(rule_id);
create index if not exists compliance_checks_result_idx on public.compliance_checks(automated_result);

create or replace function public.is_compliance_reviewer()
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.profiles where auth_user_id = auth.uid() and status = 'active' and user_type = 'government' and role in ('super_admin', 'controller', 'assistant_controller', 'inspector', 'clerk')) $$;

alter table public.legislations enable row level security;
alter table public.compliance_rules enable row level security;
alter table public.compliance_runs enable row level security;
alter table public.compliance_checks enable row level security;
create policy legislations_read_authenticated on public.legislations for select to authenticated using (true);
create policy legislations_admin_write on public.legislations for all to authenticated using (public.is_super_admin()) with check (public.is_super_admin());
create policy rules_read_authenticated on public.compliance_rules for select to authenticated using (true);
create policy rules_admin_write on public.compliance_rules for all to authenticated using (public.is_super_admin()) with check (public.is_super_admin());
create policy compliance_runs_read_scoped on public.compliance_runs for select to authenticated using (exists (select 1 from public.inspections i where i.id = inspection_id and public.inspection_scope(i.office_id, i.business_id, i.inspector_id)));
create policy compliance_runs_government_write on public.compliance_runs for insert to authenticated with check (public.is_compliance_reviewer() and exists (select 1 from public.inspections i where i.id = inspection_id and public.inspection_scope(i.office_id, i.business_id, i.inspector_id)));
create policy compliance_runs_government_update on public.compliance_runs for update to authenticated using (public.is_compliance_reviewer() and exists (select 1 from public.inspections i where i.id = inspection_id and public.inspection_scope(i.office_id, i.business_id, i.inspector_id))) with check (public.is_compliance_reviewer());
create policy compliance_checks_read_scoped on public.compliance_checks for select to authenticated using (exists (select 1 from public.inspections i where i.id = inspection_id and public.inspection_scope(i.office_id, i.business_id, i.inspector_id)));
create policy compliance_checks_government_insert on public.compliance_checks for insert to authenticated with check (public.is_compliance_reviewer() and exists (select 1 from public.inspections i where i.id = inspection_id));
create policy compliance_checks_government_review on public.compliance_checks for update to authenticated using (public.is_compliance_reviewer() and exists (select 1 from public.inspections i where i.id = inspection_id and public.inspection_scope(i.office_id, i.business_id, i.inspector_id))) with check (reviewed_by = (select id from public.current_profile()) or public.is_super_admin());

insert into public.legislations (legislation_code, legislation_name, legislation_type, year, description, jurisdiction) values
('LMA-2009', 'Legal Metrology Act', 'Act', 2009, 'Parent legislation for Legal Metrology administration.', 'India'),
('LMPCR-2011', 'Legal Metrology (Packaged Commodities) Rules', 'Rules', 2011, 'Rules concerning packaged commodities and related declarations.', 'India')
on conflict (legislation_code) do nothing;
insert into public.compliance_rules (legislation_id, rule_code, section_or_rule, rule_title, requirement, description, check_type, configuration, priority, version, effective_from, status, legal_notes)
select l.id, r.rule_code, null, r.title, r.requirement, r.requirement, 'presence', jsonb_build_object('field', r.field_name, 'required', true), 'Normal', '1.0', '2026-01-01', 'Active', 'Application rule identifier only. Applicability requires officer review.'
from public.legislations l cross join (values
('PC-DECLARATION-MANUFACTURER', 'Manufacturer / packer / importer identification', 'A responsible entity declaration was detected.', 'manufacturer_name'),
('PC-DECLARATION-ADDRESS', 'Address information', 'An address declaration was detected.', 'manufacturer_address'),
('PC-DECLARATION-NET-QTY', 'Net quantity declaration', 'A net quantity declaration was detected.', 'net_quantity'),
('PC-DECLARATION-MRP', 'Maximum Retail Price declaration', 'An MRP declaration was detected.', 'mrp'),
('PC-DECLARATION-DATE', 'Relevant date or month-year declaration', 'A date-related declaration was detected.', 'date_of_manufacture'),
('PC-DECLARATION-CONSUMER-CARE', 'Consumer care information', 'Consumer care information was detected.', 'consumer_care_phone'),
('PC-DECLARATION-ORIGIN', 'Country of origin where applicable', 'Country of origin information was detected where applicable.', 'country_of_origin')
) as r(rule_code, title, requirement, field_name) where l.legislation_code = 'LMPCR-2011'
on conflict (rule_code, version) do nothing;
