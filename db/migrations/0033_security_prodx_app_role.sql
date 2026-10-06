-- Dedicated backend runtime role for PRODX-POS.
-- This role is intentionally narrower than the Supabase postgres admin role.
-- BYPASSRLS is currently required because the existing POS backend connects
-- directly to PostgreSQL while all public POS tables have RLS enabled but no
-- policies. Remove BYPASSRLS only after store-scoped RLS policies are wired
-- and verified end-to-end.
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

ALTER ROLE prodx_app
  WITH LOGIN
  NOSUPERUSER
  NOCREATEDB
  NOCREATEROLE
  NOINHERIT
  NOREPLICATION
  BYPASSRLS;

COMMENT ON ROLE prodx_app IS
  'PRODX-POS backend runtime role. BYPASSRLS is transitional until store-scoped RLS policies are implemented and verified.';

GRANT CONNECT ON DATABASE postgres TO prodx_app;
GRANT USAGE ON SCHEMA public TO prodx_app;

-- Runtime DML over application tables. Migration metadata remains admin-only.
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO prodx_app;
REVOKE ALL ON TABLE public.prodx_schema_migrations, public.prodx_migration_lock FROM prodx_app;

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO prodx_app;

-- Keep the runtime role usable when future application tables/sequences are
-- introduced by migrations owned by postgres.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO prodx_app;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO prodx_app;
