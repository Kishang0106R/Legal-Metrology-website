# Deployment Guide

## Frontend

1. Copy `.env.example` to a local environment file.
2. Set only `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in the frontend environment.
3. Never expose `SUPABASE_SERVICE_ROLE_KEY`, database passwords, SMTP credentials, or private tokens to Vite.
4. Run `npm ci` and `npm run build`.
5. Deploy `dist/` to the chosen static host and configure SPA fallback to `index.html`.

## Supabase

Apply migrations in filename order. Verify tables, foreign keys, RLS policies, private buckets, and the `invite-government-officer` Edge Function. Configure Auth email OTP, SMTP, allowed redirect URLs, and production site URL.

## Release checks

- [ ] Migrations applied in order
- [ ] RLS tested for every role
- [ ] Storage policies tested with signed URLs
- [ ] OTP delivery and rate limits tested
- [ ] Edge Function authorization tested
- [ ] Production build succeeds
- [ ] Demo credentials are absent
- [ ] Browser console is free of critical errors
- [ ] Backup and rollback procedure is documented

Historical records are preserved through restrictive foreign keys and status/deactivation fields. Do not use destructive cleanup as a deployment step.
