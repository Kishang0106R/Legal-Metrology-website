# Supabase setup

Apply the migration in `migrations/202609190001_auth_organizations_rls.sql` with the Supabase CLI or SQL editor. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in a local `.env` file before running the app.

Public signup is intentionally business-only. Government users must be provisioned by an authorized server-side administrator using the Supabase service role; never expose that key in the browser. Extend the same office/business scope helpers and RLS policy patterns to each future inspection-related table.
