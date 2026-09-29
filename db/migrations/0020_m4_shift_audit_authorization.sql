-- M4 shift/audit authorization and idempotency result references
ALTER TABLE prodx_shift_operations
  ADD COLUMN IF NOT EXISTS result_id UUID;

CREATE INDEX IF NOT EXISTS prodx_shift_operations_result_idx
  ON prodx_shift_operations(result_id);

INSERT INTO prodx_permissions (id, permission_key, description)
VALUES
  ('10000000-0000-4000-8000-000000000016', 'cash.shift.movement', 'Record manual cash drawer movements'),
  ('10000000-0000-4000-8000-000000000017', 'audit.read', 'Read security and audit trail logs')
ON CONFLICT (permission_key) DO NOTHING;

INSERT INTO prodx_schema_migrations(version)
VALUES ('0020_m4_shift_audit_authorization')
ON CONFLICT(version) DO NOTHING;
