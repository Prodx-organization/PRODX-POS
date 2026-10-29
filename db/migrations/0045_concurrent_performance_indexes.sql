-- prodx:non-transactional
-- Concurrent index builds avoid blocking ordinary writes during index creation.
-- If a concurrent build is interrupted, inspect and remove any INVALID index before retrying.
CREATE INDEX CONCURRENTLY IF NOT EXISTS prodx_inventory_ledger_store_created_idx
  ON prodx_inventory_ledger (store_id, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS prodx_inventory_ledger_store_product_created_idx
  ON prodx_inventory_ledger (store_id, product_id, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS prodx_cash_movements_store_shift_created_idx
  ON prodx_cash_movements (store_id, shift_id, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS prodx_products_store_category_active_name_idx
  ON prodx_products (store_id, category_id, active, name);
CREATE INDEX CONCURRENTLY IF NOT EXISTS prodx_products_store_lower_sku_active_idx
  ON prodx_products (store_id, lower(sku), active);
