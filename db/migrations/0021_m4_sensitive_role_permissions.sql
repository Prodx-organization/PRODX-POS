-- M4 tenant-role provisioning for sensitive shift/audit capabilities.
-- Existing tenant-owned admin/manager roles receive the capabilities already defined
-- by the application RBAC policy. Cashiers remain unable to post manual movements
-- or inspect the security audit trail.
INSERT INTO prodx_role_permissions (organization_id, role_id, permission_id)
SELECT r.organization_id, r.id, p.id
FROM prodx_roles r
JOIN prodx_permissions p
  ON p.permission_key IN ('cash.shift.movement', 'audit.read')
WHERE r.role_key IN ('admin', 'manager')
  AND r.active = TRUE
ON CONFLICT (organization_id, role_id, permission_id) DO NOTHING;

INSERT INTO prodx_schema_migrations(version)
VALUES ('0021_m4_sensitive_role_permissions')
ON CONFLICT(version) DO NOTHING;
