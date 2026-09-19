# Legal Metrology Compliance & Inspection Management System

The application is built with React, TypeScript, Vite, Tailwind CSS, React Router, and Supabase Auth/Postgres/RLS.

## Run locally

```bash
npm install
npm run dev
```

Copy the required public Supabase values into `.env` before starting the app:

```bash
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

Apply the migrations in `supabase/migrations` to the target Supabase project. The Supabase CLI is not bundled with this repository, so migration/RLS execution must be performed in a configured Supabase environment.

## Seed Test Users

Run this only from a trusted local terminal. Never put the service-role key in `.env` variables beginning with `VITE_`, browser code, or source control:

```powershell
$env:SUPABASE_SERVICE_ROLE_KEY = "your-service-role-key"
$env:TEST_USER_PASSWORD = "a-strong-test-password"
$env:TEST_SUPER_ADMIN_EMAIL = "you@your-real-domain.example"
npm run seed:test-users
```

The command creates or reuses real Supabase Auth users, a demo office, a demo business, and linked active profiles for super admin, controller, inspector, laboratory, and manufacturer testing. Set `TEST_*_EMAIL` variables when OTP must be delivered to real mailboxes; otherwise the default `.local` accounts are suitable only for password-based local demo buttons. It is idempotent and does not create disconnected profile rows.

## System Integration Status

| Area | Status | Notes |
| --- | --- | --- |
| Auth, session restore, profile status, OTP UI | Connected | Uses Supabase email OTP; demo buttons are development-only and use real Auth users. |
| Roles, route guards, retailer coverage | Connected | Frontend guards are backed by database policies; hosted-policy execution still needs environment testing. |
| Office, business, product, inspection records | Connected | Inspection remains the central foreign-key entity. |
| Evidence and OCR boundary | Connected | Evidence is private; OCR states and demo/service boundary are explicit. |
| Compliance and officer review | Connected | Automated results remain preliminary; violations require officer-confirmed checks. |
| Samples, laboratory, violations, reports | Connected | Schema and route workflows are present with scoped policies and immutable snapshots. |
| Notifications, search, history, audit | Connected | Notifications are recipient-scoped; search/history use database queries and RLS. |
| Production verification | Pending | Run Supabase migrations, RLS/storage tests, OTP delivery, and role smoke tests against the deployed project. |

Known limitations are intentionally surfaced rather than hidden: the repository cannot validate hosted Supabase policies without the project environment, and public-service integrations remain unavailable until their backend endpoints are supplied.
