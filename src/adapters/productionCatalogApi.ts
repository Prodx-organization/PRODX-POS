import type { Category, Product } from '../domain/catalog';

const API_BASE_URL = import.meta.env.VITE_AUTH_API_BASE_URL;
const baseUrl = () => {
  if (!API_BASE_URL) throw new Error('Production catalog API is not configured: VITE_AUTH_API_BASE_URL is missing.');
  return API_BASE_URL.replace(/\/$/, '');
};
const requireToken = (token: string) => {
  if (!token.trim()) throw new Error('Authenticated session token is required for catalog access.');
  return token.trim();
};
async function request<T>(path: string, token: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${baseUrl()}${path}`, {
    ...init,
    credentials: 'include',
    headers: { Accept: 'application/json', Authorization: `Bearer ${requireToken(token)}`, ...(init?.headers ?? {}) },
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(body?.error?.message ?? 'Catalog request failed.');
  return body as T;
}
export interface IProductionCatalogReadApi {
  getCategories(): Promise<readonly Category[]>;
  getProducts(categoryId?: string, search?: string): Promise<readonly Product[]>;
  getProductByBarcode(barcode: string): Promise<Product | null>;
  getInventoryLedger(productId?: string): Promise<readonly import('../domain/catalog').InventoryLedgerEntry[]>;
  bulkUpdatePricing(storeId: string, productIds: readonly string[], priceChangeType: 'set_amount' | 'percent_markup' | 'percent_discount', value: number, userId: string): Promise<readonly Product[]>;
}
export function createProductionCatalogReadApi(token: string): IProductionCatalogReadApi {
  return {
    getCategories: () => request('/api/v1/catalog/categories', token),
    getProducts: (categoryId, search) => {
      const query = new URLSearchParams();
      if (categoryId) query.set('categoryId', categoryId);
      if (search) query.set('search', search);
      return request(`/api/v1/catalog/products${query.toString() ? `?${query}` : ''}`, token);
    },
    getProductByBarcode: barcode => request(`/api/v1/catalog/products/by-barcode/${encodeURIComponent(barcode)}`, token),
    getInventoryLedger: productId => { const query = productId ? `?productId=${encodeURIComponent(productId)}` : ''; return request(`/api/v1/catalog/inventory-ledger${query}`, token); },
    bulkUpdatePricing: async (storeId, productIds, priceChangeType, value, _userId) => {
      const result = await request<{ products: Product[] }>('/api/v1/catalog/pricing/bulk', token, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ storeId, productIds, priceChangeType, value, idempotencyKey: `catalog-price-${crypto.randomUUID()}` }) });
      return result.products;
    },
  };
}
