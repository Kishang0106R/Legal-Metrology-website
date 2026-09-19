-- Legal Metrology Stage 3: office hierarchy and government officer scope.

alter table public.offices add column if not exists parent_office_id uuid references public.offices(id) on delete restrict;
alter table public.offices add column if not exists pincode text;
create index if not exists offices_parent_office_id_idx on public.offices(parent_office_id);

-- Replace the broad self/admin-only profile read policy with explicit government office scope.
drop policy if exists profiles_read_self_or_admin on public.profiles;
create policy profiles_read_scoped on public.profiles for select to authenticated using (
  auth_user_id = auth.uid()
  or public.is_super_admin()
  or (
    (select user_type from public.current_profile()) = 'government'
    and (select status from public.current_profile()) = 'active'
    and user_type = 'government'
    and office_id = (select office_id from public.current_profile())
  )
);

-- Office records are never hard-deleted by the application; status is used for deactivation.
create or replace function public.touch_office_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end; $$;

drop trigger if exists offices_updated_at on public.offices;
create trigger offices_updated_at before update on public.offices for each row execute procedure public.touch_office_updated_at();
