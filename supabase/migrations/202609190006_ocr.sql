-- Legal Metrology Stage 7: OCR runs and auditable extracted fields.
create table if not exists public.ocr_runs (
  id uuid primary key default gen_random_uuid(),
  inspection_id uuid not null references public.inspections(id) on delete restrict,
  evidence_id uuid references public.inspection_evidence(id) on delete restrict,
  status text not null default 'Queued' check (status in ('Queued', 'Processing', 'Completed', 'Failed', 'Needs Review')),
  ocr_engine text,
  engine_version text,
  raw_text text,
  overall_confidence numeric check (overall_confidence is null or overall_confidence between 0 and 100),
  processing_started_at timestamptz,
  processing_completed_at timestamptz,
  error_message text,
  created_by uuid references public.profiles(id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.ocr_extracted_fields (
  id uuid primary key default gen_random_uuid(),
  ocr_run_id uuid not null references public.ocr_runs(id) on delete restrict,
  inspection_id uuid not null references public.inspections(id) on delete restrict,
  field_name text not null,
  extracted_value text,
  normalized_value text,
  confidence numeric check (confidence is null or confidence between 0 and 100),
  detection_status text not null default 'Needs Review' check (detection_status in ('Detected', 'Not Detected', 'Uncertain', 'Needs Review', 'Manually Added')),
  source_text text,
  manually_verified boolean not null default false,
  verified_value text,
  verified_by uuid references public.profiles(id) on delete set null,
  verified_at timestamptz,
  remarks text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create or replace function public.touch_ocr_updated_at()
returns trigger language plpgsql as $$ begin new.updated_at = timezone('utc', now()); return new; end; $$;
drop trigger if exists ocr_runs_updated_at on public.ocr_runs;
create trigger ocr_runs_updated_at before update on public.ocr_runs for each row execute procedure public.touch_ocr_updated_at();
drop trigger if exists ocr_fields_updated_at on public.ocr_extracted_fields;
create trigger ocr_fields_updated_at before update on public.ocr_extracted_fields for each row execute procedure public.touch_ocr_updated_at();

alter table public.ocr_runs enable row level security;
alter table public.ocr_extracted_fields enable row level security;
create policy ocr_runs_read_scoped on public.ocr_runs for select to authenticated using (exists (select 1 from public.inspections i where i.id = inspection_id and public.inspection_scope(i.office_id, i.business_id, i.inspector_id)));
create policy ocr_runs_government_insert on public.ocr_runs for insert to authenticated with check ((select user_type from public.current_profile()) = 'government' and exists (select 1 from public.inspections i where i.id = inspection_id and public.inspection_scope(i.office_id, i.business_id, i.inspector_id)));
create policy ocr_runs_government_update on public.ocr_runs for update to authenticated using ((select user_type from public.current_profile()) = 'government' and exists (select 1 from public.inspections i where i.id = inspection_id and public.inspection_scope(i.office_id, i.business_id, i.inspector_id))) with check (created_by = (select id from public.current_profile()) or public.is_super_admin());
create policy ocr_fields_read_scoped on public.ocr_extracted_fields for select to authenticated using (exists (select 1 from public.inspections i where i.id = inspection_id and public.inspection_scope(i.office_id, i.business_id, i.inspector_id)));
create policy ocr_fields_government_insert on public.ocr_extracted_fields for insert to authenticated with check ((select user_type from public.current_profile()) = 'government' and exists (select 1 from public.ocr_runs r where r.id = ocr_run_id and r.inspection_id = inspection_id));
create policy ocr_fields_government_update on public.ocr_extracted_fields for update to authenticated using ((select user_type from public.current_profile()) = 'government' and exists (select 1 from public.inspections i where i.id = inspection_id and public.inspection_scope(i.office_id, i.business_id, i.inspector_id))) with check (verified_by = (select id from public.current_profile()) or public.is_super_admin());

create index if not exists ocr_runs_inspection_id_idx on public.ocr_runs(inspection_id);
create index if not exists ocr_runs_evidence_id_idx on public.ocr_runs(evidence_id);
create index if not exists ocr_runs_status_idx on public.ocr_runs(status);
create index if not exists ocr_fields_run_id_idx on public.ocr_extracted_fields(ocr_run_id);
create index if not exists ocr_fields_inspection_id_idx on public.ocr_extracted_fields(inspection_id);
