import type { InventoryLedgerEntry, StockMovementReason } from '../domain/catalog';

const API_BASE_URL = import.meta.env?.VITE_AUTH_API_BASE_URL;
const baseUrl = (apiBaseUrl: string | undefined = API_BASE_URL) => {
  if (!apiBaseUrl) throw new Error('VITE_AUTH_API_BASE_URL is required for production inventory operations.');
  return apiBaseUrl.replace(/\/$/, '');
};

const retryKeys = new Map<string, string>();

const idempotencyStorageKey = async (signature: string): Promise<string> => {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(signature));
  const fingerprint = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `prodx:inventory-adjustment:idempotency:${fingerprint}`;
};

const idempotencyKeyFor = async (signature: string, prefix: string): Promise<string> => {
  const existing = retryKeys.get(signature);
  if (existing) return existing;

  // Production browsers persist the operation key without storing the request
  // signature (which may contain notes or other user-entered data).
  if (typeof window !== 'undefined') {
    try {
      const storageKey = await idempotencyStorageKey(signature);
      const persisted = window.localStorage.getItem(storageKey);
      if (persisted) {
        retryKeys.set(signature, persisted);
        return persisted;
      }
      const key = `${prefix}:${crypto.randomUUID()}`;
      window.localStorage.setItem(storageKey, key);
      retryKeys.set(signature, key);
      return key;
    } catch {
      throw new Error('Persistent browser storage is required to safely retry production inventory adjustments.');
    }
  }

  // Node-based contract tests use the in-memory fallback; production browsers
  // take the durable path above.
  const key = `${prefix}:${crypto.randomUUID()}`;
  retryKeys.set(signature, key);
  return key;
};

const clearIdempotencyKey = async (signature: string): Promise<void> => {
  retryKeys.delete(signature);
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(await idempotencyStorageKey(signature));
  } catch {
    throw new Error('Inventory adjustment was accepted, but its retry key could not be cleared from persistent storage.');
  }
};

type ServerEntry = { id: string; store_id: string; product_id: string; quantity_delta: number; resulting_stock: number; reason: StockMovementReason; reference_id: string; performed_by_user_id: string; created_at: string };
const mapEntry = (e: ServerEntry): InventoryLedgerEntry => {
  if (!e || typeof e !== 'object' || typeof e.id !== 'string' || typeof e.product_id !== 'string') {
    throw new Error('Production inventory API returned an invalid ledger entry.');
  }
  return { id: e.id, storeId: e.store_id, productId: e.product_id, quantityDelta: e.quantity_delta, resultingStock: e.resulting_stock, reason: e.reason, referenceId: e.reference_id, performedByUserId: e.performed_by_user_id, timestamp: e.created_at };
};

async function postAdjustment(token: string, payload: Record<string, unknown>, apiBaseUrl?: string): Promise<unknown> {
  const response = await fetch(`${baseUrl(apiBaseUrl)}/api/v1/inventory/adjustments`, {
    method: 'POST',
    credentials: 'include',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json', Authorization: `Bearer ${token.trim()}` },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(`Production inventory adjustment failed with HTTP ${response.status}.`);
  return response.json();
}

export function createProductionInventoryAdjustmentApi(token: string, apiBaseUrl?: string) {
  return {
    adjustStock: async (storeId: string, productId: string, quantityDelta: number, reason: StockMovementReason, userId: string, notes?: string) => {
      const signature = JSON.stringify({ storeId, productIds: [productId], quantityDelta, reason, notes: notes ?? null, userId });
      const idempotencyKey = await idempotencyKeyFor(signature, 'inventory-adjust');
      const payload = await postAdjustment(token, { storeId, productIds: [productId], quantityDelta, reason, notes, performedByUserId: userId, idempotencyKey }, apiBaseUrl) as { entries?: unknown };
      if (!Array.isArray(payload?.entries) || payload.entries.length !== 1) throw new Error('Production inventory API returned no authoritative adjustment entry.');
      const entry = mapEntry(payload.entries[0] as ServerEntry);
      await clearIdempotencyKey(signature);
      return entry;
    },
    bulkAdjustStock: async (storeId: string, productIds: readonly string[], quantityDelta: number, reason: StockMovementReason, userId: string, notes?: string) => {
      const signature = JSON.stringify({ storeId, productIds: [...productIds].sort(), quantityDelta, reason, notes: notes ?? null, userId });
      const idempotencyKey = await idempotencyKeyFor(signature, 'inventory-bulk-adjust');
      const payload = await postAdjustment(token, { storeId, productIds, quantityDelta, reason, notes, performedByUserId: userId, idempotencyKey }, apiBaseUrl) as { entries?: unknown };
      if (!Array.isArray(payload?.entries)) throw new Error('Production inventory API returned no authoritative bulk adjustment entries.');
      const entries = payload.entries.map(entry => mapEntry(entry as ServerEntry));
      clearIdempotencyKey(signature);
      return entries;
    },
  };
}
