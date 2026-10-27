-- Tighten the explicit ACL and search_path for the Supabase identity lookup.
-- PostgreSQL default privileges can grant EXECUTE to API roles independently of PUBLIC;
-- keep the credential lookup callable only by the trusted backend runtime role.
REVOKE ALL PRIVILEGES
  ON FUNCTION public.prodx_auth_find_credential_by_supabase_user_id(uuid, uuid)
  FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE
  ON FUNCTION public.prodx_auth_find_credential_by_supabase_user_id(uuid, uuid)
  TO prodx_app;

-- All referenced tables are schema-qualified, so public need not be in the definer search path.
ALTER FUNCTION public.prodx_auth_find_credential_by_supabase_user_id(uuid, uuid)
  SET search_path = pg_catalog;

INSERT INTO public.prodx_schema_migrations(version)
VALUES ('0040_security_restrict_identity_lookup_execute')
ON CONFLICT (version) DO NOTHING;
