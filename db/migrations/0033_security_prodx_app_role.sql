-- Dedicated backend runtime role for PRODX-POS.
-- The application connects directly to PostgreSQL and performs authorization in
-- the server layer. RLS is enabled on the public POS tables, so the runtime
-- role receives explicit RLS policies rather than BYPASSRLS.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'prodx_app') THEN
    CREATE ROLE prodx_app
      WITH LOGIN
      NOSUPERUSER
      NOCREATEDB
      NOCREATEROLE
      NOINHERIT
      NOREPLICATION
      NOBYPASSRLS;
  END IF;
END
$$;

COMMENT ON ROLE prodx_app IS
  'PRODX-POS backend runtime role. Authorization remains server-side; RLS policies explicitly permit this trusted backend role.';

GRANT CONNECT ON DATABASE postgres TO prodx_app;
GRANT USAGE ON SCHEMA public TO prodx_app;

GRANT SELECT, INSERT, UPDATE, DELETE
  ON ALL TABLES IN SCHEMA public TO prodx_app;

REVOKE ALL
  ON TABLE public.prodx_schema_migrations, public.prodx_migration_lock
  FROM prodx_app;

GRANT USAGE, SELECT
  ON ALL SEQUENCES IN SCHEMA public TO prodx_app;

-- The direct backend is the trusted authorization boundary. Explicit RLS
-- policies keep RLS enabled while allowing this backend role to operate.
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
    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON public.%I',
      'prodx_app_runtime_access',
      table_name
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO prodx_app USING (true) WITH CHECK (true)',
      'prodx_app_runtime_access',
      table_name
    );
  END LOOP;
END
$$;

-- Future application tables continue to receive table/sequence privileges.
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO prodx_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO prodx_app;
