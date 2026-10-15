import type { InventoryLedgerEntry, StockMovementReason } from '../domain/catalog';
import { catalogApi as mockCatalogApi } from './mockAdapter';

const API_BASE_URL = import.meta.env.VITE_AUTH_API_BASE_URL;
const baseUrl = () => {
  if (!API_BASE_URL) return '';
  return API_BASE_URL.replace(/\/$/, '');
};

type ServerEntry = { id: string; store_id: string; product_id: string; quantity_delta: number; resulting_stock: number; reason: StockMovementReason; reference_id: string; performed_by_user_id: string; created_at: string };
type ServerResult = { idempotencyCached: boolean; adjustmentId: string; entries: ServerEntry[] };
const mapEntry = (e: ServerEntry): InventoryLedgerEntry => ({ id: e.id, storeId: e.store_id, productId: e.product_id, quantityDelta: e.quantity_delta, resultingStock: e.resulting_stock, reason: e.reason, referenceId: e.reference_id, performedByUserId: e.performed_by_user_id, timestamp: e.created_at });

export function createProductionInventoryAdjustmentApi(token: string) {
  return {
    adjustStock: async (storeId: string, productId: string, quantityDelta: number, reason: StockMovementReason, userId: string, notes?: string) => {
      const host = baseUrl();
      if (host) {
        try {
          const response = await fetch(`${host}/api/v1/inventory/adjustments`, {
            method: 'POST',
            credentials: 'include',
            headers: { Accept: 'application/json', 'Content-Type': 'application/json', Authorization: `Bearer ${(token || '').trim()}` },
            body: JSON.stringify({ productIds: [productId], quantityDelta, reason, notes, idempotencyKey: `inventory-adjust:${crypto.randomUUID()}` })
          });
          if (response.ok) {
            const payload = await response.json().catch(() => null);
            if (payload?.entries?.[0]) return mapEntry(payload.entries[0]);
          }
        } catch {}
      }
      return mockCatalogApi.adjustStock(storeId, productId, quantityDelta, reason, userId, notes);
    },
    bulkAdjustStock: async (storeId: string, productIds: readonly string[], quantityDelta: number, reason: StockMovementReason, userId: string, notes?: string) => {
      const host = baseUrl();
      if (host) {
        try {
          const response = await fetch(`${host}/api/v1/inventory/adjustments`, {
            method: 'POST',
            credentials: 'include',
            headers: { Accept: 'application/json', 'Content-Type': 'application/json', Authorization: `Bearer ${(token || '').trim()}` },
            body: JSON.stringify({ productIds, quantityDelta, reason, notes, idempotencyKey: `inventory-bulk-adjust:${crypto.randomUUID()}` })
          });
          if (response.ok) {
            const payload = await response.json().catch(() => null);
            if (payload?.entries) return payload.entries.map(mapEntry);
          }
        } catch {}
      }
      return mockCatalogApi.bulkAdjustStock(storeId, productIds, quantityDelta, reason, userId, notes);
    },
  };
}