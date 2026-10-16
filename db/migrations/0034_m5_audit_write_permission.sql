-- Separate authorization for supplemental client-origin audit events.
-- Server-owned critical events continue to be written inside their domain transactions.
INSERT INTO prodx_permissions (id, permission_key, description)
VALUES ('10000000-0000-4000-8000-000000000021', 'audit.write', 'Append validated supplemental audit events')
ON CONFLICT (permission_key) DO NOTHING;

INSERT INTO prodx_role_permissions (organization_id, role_id, permission_id)
SELECT r.organization_id, r.id, p.id
FROM prodx_roles r
JOIN prodx_permissions p ON p.permission_key = 'audit.write'
WHERE r.role_key IN ('admin', 'manager')
  AND r.active = TRUE
ON CONFLICT (organization_id, role_id, permission_id) DO NOTHING;

INSERT INTO prodx_schema_migrations(version)
VALUES ('0034_m5_audit_write_permission')
ON CONFLICT(version) DO NOTHING;
