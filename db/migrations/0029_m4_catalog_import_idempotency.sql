-- PRODX POS M4.3 bulk catalog import idempotency
-- Bulk inventory/catalog imports are server-authoritative and retry-safe.

CREATE TABLE IF NOT EXISTS prodx_catalog_import_operations (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES prodx_organizations(id) ON DELETE RESTRICT,
  store_id UUID NOT NULL,
  actor_user_id UUID NOT NULL,
  idempotency_key TEXT NOT NULL,
  payload_hash TEXT NOT NULL,
  result JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT prodx_catalog_import_operations_store_org_fk
    FOREIGN KEY (store_id, organization_id)
    REFERENCES prodx_stores(id, organization_id) ON DELETE RESTRICT,
  CONSTRAINT prodx_catalog_import_operations_actor_org_fk
    FOREIGN KEY (actor_user_id, organization_id)
    REFERENCES prodx_users(id, organization_id) ON DELETE RESTRICT,
  CONSTRAINT prodx_catalog_import_operations_key_valid
    CHECK (length(btrim(idempotency_key)) > 0 AND length(btrim(payload_hash)) > 0),
  CONSTRAINT prodx_catalog_import_operations_unique
    UNIQUE (organization_id, store_id, actor_user_id, idempotency_key)
);

INSERT INTO prodx_schema_migrations(version)
VALUES ('0029_m4_catalog_import_idempotency')
ON CONFLICT(version) DO NOTHING;
