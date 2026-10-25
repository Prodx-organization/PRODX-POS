-- Dedicated backend runtime role for PRODX-POS.
-- The application connects directly to PostgreSQL and performs authorization in
-- the server layer. RLS is enabled on the public POS tables, so the runtime
-- role receives explicit RLS policies rather than BYPASSRLS.
--
-- Scope: only PRODX-owned tables (public.prodx_*) are granted to or given policies for
-- prodx_app. A database shared with other applications (for example the Owner Console's
-- public.user_roles) must never become reachable from the POS runtime role.
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
      'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.%I TO prodx_app',
      table_name
    );
  END LOOP;
END
$$;

REVOKE ALL
  ON TABLE public.prodx_schema_migrations, public.prodx_migration_lock
  FROM prodx_app;

-- Only sequences owned by PRODX tables may be used by the POS runtime role.
DO $seq$
DECLARE
  sequence_name text;
BEGIN
  FOR sequence_name IN
    SELECT c.relname
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'S'
      AND c.relname LIKE 'prodx\_%' ESCAPE '\'
  LOOP
    EXECUTE format('GRANT USAGE, SELECT ON SEQUENCE public.%I TO prodx_app', sequence_name);
  END LOOP;
END
$seq$;

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

-- Do not grant the POS runtime role access to every future object in public.
-- Future PRODX migrations must explicitly grant only the PRODX tables/sequences they create.
ALTER DEFAULT PRIVILEGES
  REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLES FROM prodx_app;
ALTER DEFAULT PRIVILEGES
  REVOKE USAGE, SELECT ON SEQUENCES FROM prodx_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLES FROM prodx_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  REVOKE USAGE, SELECT ON SEQUENCES FROM prodx_app;

INSERT INTO prodx_schema_migrations(version)
VALUES ('0033_security_prodx_app_role')
ON CONFLICT(version) DO NOTHING;
