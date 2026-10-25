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

DO $$
BEGIN
  EXECUTE format('GRANT CONNECT ON DATABASE %I TO prodx_app', current_database());
END
$$;
GRANT USAGE ON SCHEMA public TO prodx_app;

-- Grant privileges only on PRODX-owned tables. Never grant access to every
-- object in public: this schema may also contain tables owned by other apps.
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
      AND c.relname LIKE 'prodx\_%' ESCAPE '\'
      AND c.relname NOT IN ('prodx_schema_migrations', 'prodx_migration_lock')
  LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.%I TO prodx_app', table_name);
  END LOOP;
END
$$;

REVOKE ALL
  ON TABLE public.prodx_schema_migrations, public.prodx_migration_lock
  FROM prodx_app;

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
      AND c.relname LIKE 'prodx\_%' ESCAPE '\'
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

-- Do not set schema-wide default privileges: future tables may belong to other apps.

INSERT INTO prodx_schema_migrations(version)
VALUES ('0033_security_prodx_app_role')
ON CONFLICT(version) DO NOTHING;
