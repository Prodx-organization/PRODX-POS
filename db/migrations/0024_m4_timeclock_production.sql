-- PRODX POS M4.1 production timeclock persistence
-- Store-scoped PIN credentials and server-authoritative timeclock state.
-- PIN credentials are intentionally separate from password credentials.

CREATE TABLE IF NOT EXISTS prodx_timeclock_credentials (
  organization_id UUID NOT NULL REFERENCES prodx_organizations(id) ON DELETE RESTRICT,
  store_id UUID NOT NULL,
  user_id UUID NOT NULL,
  pin_hash TEXT NOT NULL,
  failed_attempts INTEGER NOT NULL DEFAULT 0,
  locked_until TIMESTAMPTZ,
  last_authenticated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (organization_id, store_id, user_id),
  CONSTRAINT prodx_timeclock_credentials_store_org_fk
    FOREIGN KEY (store_id, organization_id)
    REFERENCES prodx_stores(id, organization_id) ON DELETE RESTRICT,
  CONSTRAINT prodx_timeclock_credentials_user_org_fk
    FOREIGN KEY (user_id, organization_id)
    REFERENCES prodx_users(id, organization_id) ON DELETE CASCADE,
  CONSTRAINT prodx_timeclock_credentials_membership_fk
    FOREIGN KEY (organization_id, store_id, user_id)
    REFERENCES prodx_store_memberships(organization_id, store_id, user_id)
    ON DELETE CASCADE,
  CONSTRAINT prodx_timeclock_credentials_hash_not_blank
    CHECK (length(btrim(pin_hash)) > 0),
  CONSTRAINT prodx_timeclock_credentials_failed_attempts_valid
    CHECK (failed_attempts >= 0)
);

CREATE TABLE IF NOT EXISTS prodx_timeclock_records (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES prodx_organizations(id) ON DELETE RESTRICT,
  store_id UUID NOT NULL,
  user_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'clocked_in',
  clocked_in_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  clocked_out_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT prodx_timeclock_records_store_org_fk
    FOREIGN KEY (store_id, organization_id)
    REFERENCES prodx_stores(id, organization_id) ON DELETE RESTRICT,
  CONSTRAINT prodx_timeclock_records_user_org_fk
    FOREIGN KEY (user_id, organization_id)
    REFERENCES prodx_users(id, organization_id) ON DELETE RESTRICT,
  CONSTRAINT prodx_timeclock_records_membership_fk
    FOREIGN KEY (organization_id, store_id, user_id)
    REFERENCES prodx_store_memberships(organization_id, store_id, user_id)
    ON DELETE RESTRICT,
  CONSTRAINT prodx_timeclock_records_status_valid
    CHECK (status IN ('clocked_in', 'clocked_out')),
  CONSTRAINT prodx_timeclock_records_closed_fields_valid
    CHECK (
      (status = 'clocked_in' AND clocked_out_at IS NULL)
      OR (status = 'clocked_out' AND clocked_out_at IS NOT NULL)
    ),
  CONSTRAINT prodx_timeclock_records_time_order_valid
    CHECK (clocked_out_at IS NULL OR clocked_out_at >= clocked_in_at),
  CONSTRAINT prodx_timeclock_records_id_store_unique
    UNIQUE (id, store_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS prodx_timeclock_one_open_user
  ON prodx_timeclock_records(store_id, user_id)
  WHERE status = 'clocked_in';

CREATE INDEX IF NOT EXISTS prodx_timeclock_records_store_created_idx
  ON prodx_timeclock_records(organization_id, store_id, clocked_in_at DESC, id DESC);

CREATE TABLE IF NOT EXISTS prodx_timeclock_operations (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES prodx_organizations(id) ON DELETE RESTRICT,
  store_id UUID NOT NULL,
  user_id UUID NOT NULL,
  operation_type TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  payload_hash TEXT NOT NULL,
  result_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT prodx_timeclock_operations_store_org_fk
    FOREIGN KEY (store_id, organization_id)
    REFERENCES prodx_stores(id, organization_id) ON DELETE RESTRICT,
  CONSTRAINT prodx_timeclock_operations_user_org_fk
    FOREIGN KEY (user_id, organization_id)
    REFERENCES prodx_users(id, organization_id) ON DELETE RESTRICT,
  CONSTRAINT prodx_timeclock_operations_type_valid
    CHECK (operation_type IN ('clock_in', 'clock_out')),
  CONSTRAINT prodx_timeclock_operations_key_valid
    CHECK (length(btrim(idempotency_key)) > 0 AND length(btrim(payload_hash)) > 0),
  CONSTRAINT prodx_timeclock_operations_result_fk
    FOREIGN KEY (result_id, store_id)
    REFERENCES prodx_timeclock_records(id, store_id)
    ON DELETE RESTRICT,
  CONSTRAINT prodx_timeclock_operations_unique
    UNIQUE (store_id, operation_type, idempotency_key)
);

CREATE INDEX IF NOT EXISTS prodx_timeclock_operations_store_user_idx
  ON prodx_timeclock_operations(organization_id, store_id, user_id, created_at DESC);

INSERT INTO prodx_permissions (id, permission_key, description)
VALUES
  ('10000000-0000-4000-8000-000000000018', 'timeclock.use', 'Clock employees in and out'),
  ('10000000-0000-4000-8000-000000000019', 'timeclock.manage', 'Provision and manage store timeclock PINs')
ON CONFLICT (permission_key) DO NOTHING;

INSERT INTO prodx_role_permissions (organization_id, role_id, permission_id)
SELECT r.organization_id, r.id, p.id
FROM prodx_roles r
JOIN prodx_permissions p ON p.permission_key IN ('timeclock.use', 'timeclock.manage')
WHERE r.role_key IN ('admin', 'manager')
  AND r.active = TRUE
ON CONFLICT (organization_id, role_id, permission_id) DO NOTHING;

INSERT INTO prodx_schema_migrations(version)
VALUES ('0024_m4_timeclock_production')
ON CONFLICT(version) DO NOTHING;
