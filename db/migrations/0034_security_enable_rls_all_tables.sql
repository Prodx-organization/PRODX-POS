-- Security hardening: Explicitly enable Row Level Security (RLS) on all public PRODX tables.
-- This ensures that default-deny security posture is enforced at the PostgreSQL boundary.
-- Combined with 0033_security_prodx_app_role, the prodx_app backend role operates with explicit policies.

DO $$
DECLARE
  table_name text;
BEGIN
  FOR table_name IN
    SELECT c.relname
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
      AND c.relname NOT IN ('prodx_schema_migrations', 'prodx_migration_lock')
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
  END LOOP;
END
$$;

INSERT INTO prodx_schema_migrations(version)
VALUES ('0034_security_enable_rls_all_tables')
ON CONFLICT(version) DO NOTHING;
