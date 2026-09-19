# Backup and Recovery

Use Supabase-managed database backups and retain migration files in version control. Preserve report versions, data snapshots, audit logs, and private storage objects. Keep production environment values in the deployment secret manager, not in Git.

For rollback, stop the frontend deployment, restore the previous frontend artifact, and apply only reviewed forward migrations. Do not delete historical inspections or evidence as a rollback shortcut. Validate Auth redirect URLs, storage access, RLS, and report downloads after recovery.
