-- PRODX POS M4.1.3 timeclock idempotency scope hardening
-- Idempotency keys are scoped to the authenticated operator, store, and operation type.
-- Different operators may safely reuse independently generated client keys.

ALTER TABLE prodx_timeclock_operations
  DROP CONSTRAINT IF EXISTS prodx_timeclock_operations_unique;

ALTER TABLE prodx_timeclock_operations
  ADD CONSTRAINT prodx_timeclock_operations_unique
  UNIQUE (organization_id, store_id, user_id, operation_type, idempotency_key);

INSERT INTO prodx_schema_migrations(version)
VALUES ('0027_m4_timeclock_idempotency_scope')
ON CONFLICT(version) DO NOTHING;
