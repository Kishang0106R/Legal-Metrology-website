-- Legal Metrology Stage 10: officer-reviewed violations and controlled resolution workflow.
create table if not exists public.violation_types (
  id uuid primary key default gen_random_uuid(), type_name text not null unique, active boolean not null default true, created_at timestamptz not null default timezone('utc', now())
);
create sequence if not exists public.violation_number_seq;
create or replace function public.next_violation_number() returns text language sql security definer set search_path = public as $$ select 'VIO-' || extract(year from timezone('utc', now()))::text || '-' || lpad(nextval('public.violation_number_seq')::text, 6, '0') $$;

create table if not exists public.violations (
  id uuid primary key default gen_random_uuid(), violation_number text not null unique, inspection_id uuid not null references public.inspections(id) on delete restrict, business_id uuid not null references public.businesses(id) on delete restrict, product_id uuid references public.products(id) on delete restrict, compliance_check_id uuid references public.compliance_checks(id) on delete restrict, rule_id uuid references public.compliance_rules(id) on delete restrict, violation_type text not null, violation_title text not null, description text, observed_value text, legal_requirement text, legal_reference text, severity text not null default 'Normal' check (severity in ('Low', 'Normal', 'High', 'Critical')), status text not null default 'Draft' check (status in ('Draft', 'Pending Review', 'Confirmed', 'Notice/Action Pending', 'Under Action', 'Resolved', 'Closed', 'Withdrawn', 'Requires More Evidence')), detected_date date default current_date, confirmed_date date, confirmed_by uuid references public.profiles(id) on delete set null, assigned_to uuid references public.profiles(id) on delete set null, remarks text, created_by uuid references public.profiles(id) on delete restrict, follow_up_inspection_id uuid references public.inspections(id) on delete set null, corrective_action_description text, corrective_action_submitted_by uuid references public.profiles(id) on delete set null, corrective_action_submitted_at timestamptz, corrective_action_reviewed_by uuid references public.profiles(id) on delete set null, corrective_action_reviewed_at timestamptz, corrective_action_status text check (corrective_action_status in ('Not Started', 'Requested', 'Submitted', 'Under Review', 'Accepted', 'Rejected', 'Requires Correction')), review_remarks text, closed_by uuid references public.profiles(id) on delete set null, closed_at timestamptz, closure_remarks text, created_at timestamptz not null default timezone('utc', now()), updated_at timestamptz not null default timezone('utc', now())
);
create table if not exists public.violation_assignments (
  id uuid primary key default gen_random_uuid(), violation_id uuid not null references public.violations(id) on delete restrict, officer_id uuid not null references public.profiles(id) on delete restrict, assigned_by uuid references public.profiles(id) on delete set null, assigned_at timestamptz not null default timezone('utc', now()), unassigned_at timestamptz, status text not null default 'active' check (status in ('active', 'ended')), remarks text, created_at timestamptz not null default timezone('utc', now())
);
create table if not exists public.violation_actions (
  id uuid primary key default gen_random_uuid(), violation_id uuid not null references public.violations(id) on delete restrict, action_type text not null check (action_type in ('Review', 'Notice', 'Correction Requested', 'Follow-Up Inspection', 'Sample Retest', 'Other')), action_date date not null default current_date, initiated_by uuid references public.profiles(id) on delete set null, assigned_to uuid references public.profiles(id) on delete set null, status text not null default 'Open', description text, remarks text, document_path text, created_at timestamptz not null default timezone('utc', now()), updated_at timestamptz not null default timezone('utc', now())
);
create table if not exists public.violation_evidence (
  id uuid primary key default gen_random_uuid(), violation_id uuid not null references public.violations(id) on delete restrict, evidence_type text not null, evidence_id uuid not null, description text, created_at timestamptz not null default timezone('utc', now())
);

create or replace function public.validate_violation_source() returns trigger language plpgsql security definer set search_path = public as $$
declare check_row public.compliance_checks;
begin
  if new.compliance_check_id is null then raise exception 'A violation must originate from an officer-reviewed compliance check'; end if;
  select * into check_row from public.compliance_checks where id = new.compliance_check_id;
  if check_row.id is null or check_row.inspection_id <> new.inspection_id or check_row.officer_result <> 'Confirmed Non-Compliant' then raise exception 'Only officer-confirmed non-compliance findings can create violations'; end if;
  if not exists (select 1 from public.inspections where id = new.inspection_id and business_id = new.business_id and status <> 'cancelled') then raise exception 'Violation inspection and business do not match or the inspection is cancelled'; end if;
  if new.product_id is not null and not exists (select 1 from public.inspections where id = new.inspection_id and product_id = new.product_id) then raise exception 'Violation product does not match the inspection'; end if;
  return new;
end; $$;
drop trigger if exists validate_violation_source on public.violations;
create trigger validate_violation_source before insert or update on public.violations for each row execute procedure public.validate_violation_source();
create or replace function public.touch_violation_updated_at() returns trigger language plpgsql as $$ begin new.updated_at = timezone('utc', now()); return new; end; $$;
drop trigger if exists violations_updated_at on public.violations;
create trigger violations_updated_at before update on public.violations for each row execute procedure public.touch_violation_updated_at();
drop trigger if exists violation_actions_updated_at on public.violation_actions;
create trigger violation_actions_updated_at before update on public.violation_actions for each row execute procedure public.touch_violation_updated_at();

create or replace function public.is_violation_manager() returns boolean language sql stable security definer set search_path = public as $$ select exists (select 1 from public.profiles where auth_user_id = auth.uid() and status = 'active' and user_type = 'government' and role in ('super_admin', 'controller', 'assistant_controller', 'inspector', 'clerk')) $$;
create or replace function public.violation_scope(target_violation_id uuid) returns boolean language sql stable security definer set search_path = public as $$ select exists (select 1 from public.violations v join public.inspections i on i.id = v.inspection_id where v.id = target_violation_id and public.inspection_scope(i.office_id, v.business_id, i.inspector_id)) $$;

alter table public.violation_types enable row level security; alter table public.violations enable row level security; alter table public.violation_assignments enable row level security; alter table public.violation_actions enable row level security; alter table public.violation_evidence enable row level security;
create policy violation_types_read_authenticated on public.violation_types for select to authenticated using (true);
create policy violation_types_admin_write on public.violation_types for all to authenticated using (public.is_super_admin()) with check (public.is_super_admin());
create policy violations_read_scoped on public.violations for select to authenticated using (public.violation_scope(id) or (select business_id from public.current_profile()) = business_id);
create policy violations_government_insert on public.violations for insert to authenticated with check (public.is_violation_manager() and public.violation_scope(id) = false);
create policy violations_government_update on public.violations for update to authenticated using (public.is_violation_manager() and public.violation_scope(id)) with check (public.is_violation_manager() and public.violation_scope(id));
create policy assignments_read_scoped on public.violation_assignments for select to authenticated using (public.violation_scope(violation_id));
create policy assignments_government_write on public.violation_assignments for all to authenticated using (public.is_super_admin() or (public.is_violation_manager() and public.violation_scope(violation_id))) with check (public.is_super_admin() or public.is_violation_manager());
create policy actions_read_scoped on public.violation_actions for select to authenticated using (public.violation_scope(violation_id));
create policy actions_government_write on public.violation_actions for all to authenticated using (public.is_violation_manager() and public.violation_scope(violation_id)) with check (public.is_violation_manager());
create policy evidence_read_scoped on public.violation_evidence for select to authenticated using (public.violation_scope(violation_id));
create policy evidence_government_write on public.violation_evidence for insert to authenticated with check (public.is_violation_manager() and public.violation_scope(violation_id));

insert into public.violation_types (type_name) values ('Missing Mandatory Declaration'), ('Incorrect Declaration'), ('Incorrect Net Quantity'), ('Incorrect MRP'), ('Incorrect Date Declaration'), ('Missing Consumer Information'), ('Incorrect Manufacturer/Packer/Importer Information'), ('Packaging/Label Issue'), ('Other') on conflict (type_name) do nothing;
create index if not exists violations_inspection_idx on public.violations(inspection_id); create index if not exists violations_business_idx on public.violations(business_id); create index if not exists violations_product_idx on public.violations(product_id); create index if not exists violations_status_idx on public.violations(status); create index if not exists violations_severity_idx on public.violations(severity); create index if not exists violations_rule_idx on public.violations(rule_id); create index if not exists violation_assignments_violation_idx on public.violation_assignments(violation_id); create index if not exists violation_actions_violation_idx on public.violation_actions(violation_id); create index if not exists violation_evidence_violation_idx on public.violation_evidence(violation_id);
