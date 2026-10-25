-- 0037: clean up PRODX runtime privileges/policies accidentally applied to shared public objects.
-- This migration intentionally does not disable RLS on non-PRODX tables because their
-- pre-existing RLS state cannot be inferred safely. Owners must audit any shared tables
-- whose RLS was enabled by legacy migration 0034 before restoring their intended state.
DO $$
DECLARE
  table_name text;
  sequence_name text;
  policy_name text;
BEGIN
  -- Remove only policies with known names created by PRODX migrations from non-PRODX tables.
  FOR table_name IN
    SELECT c.relname
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public'
       AND c.relkind = 'r'
       AND c.relname NOT LIKE 'prodx\_%' ESCAPE '\'
       AND c.relname NOT IN ('prodx_schema_migrations', 'prodx_migration_lock')
  LOOP
    FOREACH policy_name IN ARRAY ARRAY[
      'prodx_app_runtime_access',
      'prodx_app_tenant_isolation',
      'prodx_app_global_permissions_read'
    ]
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', policy_name, table_name);
    END LOOP;

    EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE public.%I FROM prodx_app', table_name);
  END LOOP;

  -- Revoke sequence access only from non-PRODX sequences.
  FOR sequence_name IN
    SELECT c.relname
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public'
       AND c.relkind = 'S'
       AND c.relname NOT LIKE 'prodx\_%' ESCAPE '\'
  LOOP
    EXECUTE format('REVOKE ALL PRIVILEGES ON SEQUENCE public.%I FROM prodx_app', sequence_name);
  END LOOP;
END
$$;

-- Do not alter schema-wide default privileges: public may be shared by other applications.
INSERT INTO prodx_schema_migrations(version)
VALUES ('0037_security_cleanup_shared_schema_grants')
ON CONFLICT(version) DO NOTHING;
