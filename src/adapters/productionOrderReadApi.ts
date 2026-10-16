import type { Order } from '../domain/order';

const API_BASE_URL = import.meta.env.VITE_AUTH_API_BASE_URL;
const baseUrl = () => {
  if (!API_BASE_URL) throw new Error('VITE_AUTH_API_BASE_URL is required for production order reads.');
  return API_BASE_URL.replace(/\/$/, '');
};

export interface IProductionOrderReadApi {
  getOrders(storeId: string, limit?: number): Promise<readonly Order[]>;
}

export function createProductionOrderReadApi(token: string): IProductionOrderReadApi {
  return {
    async getOrders(storeId, limit = 50) {
      const response = await fetch(`${baseUrl()}/api/v1/orders?storeId=${encodeURIComponent(storeId)}&limit=${encodeURIComponent(String(limit))}`, {
        credentials: 'include',
        headers: { Accept: 'application/json', Authorization: `Bearer ${token.trim()}` },
      });
      if (!response.ok) throw new Error(`Production order read failed with HTTP ${response.status}.`);
      const body: unknown = await response.json();
      if (!Array.isArray(body)) throw new Error('Production order API returned an invalid response.');
      return body as readonly Order[];
    },
  };
}
