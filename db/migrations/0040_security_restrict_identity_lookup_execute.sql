-- 0040: explicitly restrict the Supabase identity lookup RPC to the server runtime role.
-- This function was introduced by 0039 after 0038's broad public-API privilege sweep.
-- Keep this migration idempotent and fail closed if the expected function is missing.
DO $$
DECLARE
  function_oid oid;
  role_name text;
BEGIN
  function_oid := to_regprocedure('public.prodx_auth_find_credential_by_supabase_user_id(uuid, uuid)')::oid;

  IF function_oid IS NULL THEN
    RAISE EXCEPTION 'Required function public.prodx_auth_find_credential_by_supabase_user_id(uuid, uuid) is missing';
  END IF;

  EXECUTE format('REVOKE ALL PRIVILEGES ON FUNCTION %s FROM PUBLIC', function_oid::regprocedure);

  FOREACH role_name IN ARRAY ARRAY['anon', 'authenticated', 'service_role'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = role_name) THEN
      EXECUTE format('REVOKE ALL PRIVILEGES ON FUNCTION %s FROM %I', function_oid::regprocedure, role_name);
    END IF;
  END LOOP;

  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'prodx_app') THEN
    RAISE EXCEPTION 'Required runtime role prodx_app is missing';
  END IF;

  EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO prodx_app', function_oid::regprocedure);
END
$$;

INSERT INTO public.prodx_schema_migrations(version)
VALUES ('0040_security_restrict_identity_lookup_execute')
ON CONFLICT (version) DO NOTHING;
