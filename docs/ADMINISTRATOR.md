# Administrator Guide

Super Admins provision government users through the authorized Edge Function, maintain offices and laboratories, manage users and permissions, configure versioned compliance rules, review audit logs, and approve reports. Controllers manage departmental workflows within their permitted scope. Laboratory users manage only assigned laboratory work.

Demo users are real Supabase Auth users and are created only by the trusted `npm run seed:test-users` command. Demo records are marked `is_demo = true`. Do not place service-role keys in frontend environment variables. Disable demo credentials in production by omitting `VITE_DEMO_*` values and building with production mode.

Before release, verify email OTP, RLS isolation, private storage, signed downloads, Edge Function authorization, backups, migration order, and rollback procedures.
