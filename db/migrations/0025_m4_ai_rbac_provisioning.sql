-- M4 AI capability RBAC provisioning.
-- `ai:use` is a canonical server-side permission. Tenant-owned admin and
-- manager roles receive it automatically; cashier and custom roles do not.
-- The trigger makes the policy apply to roles created after this migration,
-- while the backfill covers roles that already exist.
INSERT INTO prodx_permissions (id, permission_key, description)
VALUES (
  '10000000-0000-4000-8000-000000000020',
  'ai:use',
  'Use the PRODX AI assistant within the authorized organization/store scope'
)
ON CONFLICT (permission_key) DO NOTHING;

CREATE OR REPLACE FUNCTION prodx_provision_ai_use_for_role()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.role_key IN ('admin', 'manager') THEN
    INSERT INTO prodx_role_permissions (organization_id, role_id, permission_id)
    SELECT NEW.organization_id, NEW.id, p.id
      FROM prodx_permissions p
     WHERE p.permission_key = 'ai:use'
    ON CONFLICT (organization_id, role_id, permission_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prodx_roles_ai_use_provision ON prodx_roles;
CREATE TRIGGER prodx_roles_ai_use_provision
AFTER INSERT OR UPDATE OF role_key ON prodx_roles
FOR EACH ROW
EXECUTE FUNCTION prodx_provision_ai_use_for_role();

INSERT INTO prodx_role_permissions (organization_id, role_id, permission_id)
SELECT r.organization_id, r.id, p.id
  FROM prodx_roles r
  JOIN prodx_permissions p ON p.permission_key = 'ai:use'
 WHERE r.role_key IN ('admin', 'manager')
   AND r.active = TRUE
ON CONFLICT (organization_id, role_id, permission_id) DO NOTHING;

INSERT INTO prodx_schema_migrations(version)
VALUES ('0025_m4_ai_rbac_provisioning')
ON CONFLICT(version) DO NOTHING;
