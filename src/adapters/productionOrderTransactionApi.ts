import type { CheckoutRequest, CheckoutResponse } from './types';

const API_BASE_URL = import.meta.env.VITE_AUTH_API_BASE_URL;

function requireBaseUrl(): string {
  if (!API_BASE_URL) {
    throw new Error('Production transaction API is not configured: VITE_AUTH_API_BASE_URL is missing.');
  }
  return API_BASE_URL.replace(/\/$/, '');
}

export function createProductionOrderTransactionApi(token: string) {
  const requireToken = () => {
    if (!token.trim()) throw new Error('Authenticated session token is required for checkout.');
    return token.trim();
  };

  return {
    async createOrder(request: CheckoutRequest): Promise<CheckoutResponse> {
      const response = await fetch(`${requireBaseUrl()}/api/v1/orders/checkout`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Bearer ${requireToken()}`,
        },
        body: JSON.stringify(request),
      });

      const body = await response.json().catch(() => null);
      if (!response.ok) {
        const message =
          body && typeof body === 'object' && 'error' in body
            ? String((body as { error?: { message?: unknown } }).error?.message ?? 'Checkout request failed.')
            : 'Checkout request failed.';
        throw new Error(message);
      }

      return body as CheckoutResponse;
    },
  };
}
