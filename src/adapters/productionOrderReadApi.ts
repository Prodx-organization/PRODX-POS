import type { Order } from '../domain/order';
import { orderApi as mockOrderApi } from './mockAdapter';

const API_BASE_URL = import.meta.env.VITE_AUTH_API_BASE_URL;
const baseUrl = () => {
  if (!API_BASE_URL) return '';
  return API_BASE_URL.replace(/\/$/, '');
};

export interface IProductionOrderReadApi {
  getOrders(limit?: number): Promise<readonly Order[]>;
}

export function createProductionOrderReadApi(token: string): IProductionOrderReadApi {
  return {
    async getOrders(limit = 50) {
      const host = baseUrl();
      if (host) {
        try {
          const response = await fetch(`${host}/api/v1/orders?limit=${encodeURIComponent(String(limit))}`, {
            credentials: 'include',
            headers: { Accept: 'application/json', Authorization: `Bearer ${(token || '').trim()}` }
          });
          if (response.ok) {
            const body = await response.json().catch(() => null);
            if (body && Array.isArray(body)) return body as readonly Order[];
          }
        } catch {
          // Fallback to mock
        }
      }
      return mockOrderApi.getOrders('store-flagship-downtown', limit);
    }
  };
}
