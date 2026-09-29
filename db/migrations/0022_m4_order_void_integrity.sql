-- PRODX POS M4 order void integrity
-- Voids are immutable compensating events. Inventory and cash reversal are atomic with the order status transition.

CREATE TABLE IF NOT EXISTS prodx_voids (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES prodx_organizations(id) ON DELETE RESTRICT,
  store_id UUID NOT NULL,
  order_id UUID NOT NULL,
  reason TEXT NOT NULL,
  authorized_by_user_id UUID NOT NULL,
  requester_user_id UUID NOT NULL,
  idempotency_key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT prodx_voids_store_org_fk FOREIGN KEY (store_id, organization_id) REFERENCES prodx_stores(id, organization_id) ON DELETE RESTRICT,
  CONSTRAINT prodx_voids_order_store_fk FOREIGN KEY (order_id, store_id) REFERENCES prodx_orders(id, store_id) ON DELETE RESTRICT,
  CONSTRAINT prodx_voids_authorized_user_org_fk FOREIGN KEY (authorized_by_user_id, organization_id) REFERENCES prodx_users(id, organization_id) ON DELETE RESTRICT,
  CONSTRAINT prodx_voids_requester_user_org_fk FOREIGN KEY (requester_user_id, organization_id) REFERENCES prodx_users(id, organization_id) ON DELETE RESTRICT,
  CONSTRAINT prodx_voids_reason_valid CHECK (length(btrim(reason)) > 0),
  CONSTRAINT prodx_voids_key_valid CHECK (length(btrim(idempotency_key)) > 0),
  CONSTRAINT prodx_voids_order_unique UNIQUE (store_id, order_id),
  CONSTRAINT prodx_voids_key_unique UNIQUE (store_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS prodx_voids_order_idx ON prodx_voids(store_id, order_id, created_at);

ALTER TABLE prodx_inventory_ledger
  DROP CONSTRAINT IF EXISTS prodx_inventory_reason_valid;
ALTER TABLE prodx_inventory_ledger
  ADD CONSTRAINT prodx_inventory_reason_valid
  CHECK (reason IN ('sale_deduction','void_reversal','refund_restock','purchase_received','transfer_in','transfer_out','audit_count_adjustment','damaged_write_off'));

CREATE OR REPLACE FUNCTION prodx_enforce_void_immutable()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Void financial events are immutable' USING ERRCODE = '55000';
END;
$$;
DROP TRIGGER IF EXISTS prodx_void_immutable_guard ON prodx_voids;
CREATE TRIGGER prodx_void_immutable_guard
BEFORE UPDATE OR DELETE ON prodx_voids
FOR EACH ROW EXECUTE FUNCTION prodx_enforce_void_immutable();

ALTER TABLE prodx_supervisor_authorizations
  DROP CONSTRAINT IF EXISTS prodx_supervisor_authorizations_action_valid;
ALTER TABLE prodx_supervisor_authorizations
  ADD CONSTRAINT prodx_supervisor_authorizations_action_valid CHECK (action_key IN ('refund','void'));

INSERT INTO prodx_schema_migrations(version)
VALUES ('0022_m4_order_void_integrity')
ON CONFLICT(version) DO NOTHING;
