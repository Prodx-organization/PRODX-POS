-- M4 inventory adjustment integrity
CREATE TABLE IF NOT EXISTS prodx_inventory_adjustments (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES prodx_organizations(id) ON DELETE RESTRICT,
  store_id UUID NOT NULL,
  requester_user_id UUID NOT NULL,
  idempotency_key TEXT NOT NULL,
  quantity_delta INTEGER NOT NULL,
  reason TEXT NOT NULL,
  product_ids JSONB NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT prodx_inventory_adjustments_store_org_fk FOREIGN KEY (store_id, organization_id) REFERENCES prodx_stores(id, organization_id) ON DELETE RESTRICT,
  CONSTRAINT prodx_inventory_adjustments_user_org_fk FOREIGN KEY (requester_user_id, organization_id) REFERENCES prodx_users(id, organization_id) ON DELETE RESTRICT,
  CONSTRAINT prodx_inventory_adjustments_key_valid CHECK (length(btrim(idempotency_key)) > 0),
  CONSTRAINT prodx_inventory_adjustments_delta_valid CHECK (quantity_delta <> 0),
  CONSTRAINT prodx_inventory_adjustments_reason_valid CHECK (reason IN ('purchase_received','transfer_in','transfer_out','audit_count_adjustment','damaged_write_off')),
  CONSTRAINT prodx_inventory_adjustments_products_valid CHECK (jsonb_typeof(product_ids) = 'array' AND jsonb_array_length(product_ids) > 0),
  CONSTRAINT prodx_inventory_adjustments_store_key_unique UNIQUE (store_id, idempotency_key)
);
CREATE INDEX IF NOT EXISTS prodx_inventory_adjustments_store_created_idx
  ON prodx_inventory_adjustments(store_id, created_at DESC);
INSERT INTO prodx_schema_migrations(version) VALUES ('0023_m4_inventory_adjustment_integrity') ON CONFLICT(version) DO NOTHING;
