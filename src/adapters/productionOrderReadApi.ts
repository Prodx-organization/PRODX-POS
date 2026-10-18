import type { Order } from '../domain/order';
import { orderApi as mockOrderApi } from './mockAdapter';

const API_BASE_URL = import.meta.env.VITE_AUTH_API_BASE_URL;
const baseUrl = () => {
  if (!API_BASE_URL) return '';
  return API_BASE_URL.replace(/\/$/, '');
};

export interface IProductionOrderReadApi {
  getOrders(storeId: string, limit?: number, registerId?: string): Promise<readonly Order[]>;
}

export function createProductionOrderReadApi(token: string): IProductionOrderReadApi {
  return {
    async getOrders(storeId, limit = 50, registerId?: string) {
      const host = baseUrl();
      if (host) {
        try {
          let url = `${host}/api/v1/orders?storeId=${encodeURIComponent(storeId)}&limit=${encodeURIComponent(String(limit))}`;
          if (registerId && registerId.trim()) {
            url += `&registerId=${encodeURIComponent(registerId.trim())}`;
          }
          const response = await fetch(url, {
            credentials: 'include',
            headers: { Accept: 'application/json', Authorization: `Bearer ${(token || '').trim()}` },
          });
          if (response.ok) {
            const body = await response.json().catch(() => null);
            if (body && Array.isArray(body)) return body as readonly Order[];
          }
        } catch {
          // Fallback to mock
        }
      }
      return mockOrderApi.getOrders(storeId, limit, registerId);
    },
  };
}
