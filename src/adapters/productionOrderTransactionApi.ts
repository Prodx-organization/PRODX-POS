import type { CheckoutRequest, CheckoutResponse } from './types';

const configuredBaseUrl = (): string | undefined => import.meta.env?.VITE_AUTH_API_BASE_URL;

function getBaseUrl(baseUrl?: string): string {
  const resolved = baseUrl ?? configuredBaseUrl();
  if (!resolved) return '';
  return resolved.replace(/\/$/, '');
}

export function createProductionOrderTransactionApi(token: string, baseUrl?: string) {
  return {
    async createOrder(request: CheckoutRequest): Promise<CheckoutResponse> {
      const url = getBaseUrl(baseUrl);
      if (url) {
        try {
          const response = await fetch(`${url}/api/v1/orders/checkout`, {
            method: 'POST',
            credentials: 'include',
            headers: {
              Accept: 'application/json',
              'Content-Type': 'application/json',
              Authorization: `Bearer ${(token || '').trim()}`,
            },
            body: JSON.stringify(request),
          });
          if (response.ok) {
            const body = await response.json().catch(() => null);
            if (body) return body as CheckoutResponse;
          }
        } catch (error: any) {
          throw new Error(`Order checkout failed: ${error?.message || 'Network error'}`);
        }
      }
      throw new Error('Order checkout API base URL is not configured.');
    },
  };
}
