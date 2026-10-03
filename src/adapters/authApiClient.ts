import type { IAuthApi, LoginRequest } from './types';
import type { SessionContext, Store } from '../domain/auth';

type FetchLike = typeof fetch;

function requireBaseUrl(value: string | undefined): string {
  if (!value) {
    throw new Error('Production authentication is not configured: VITE_AUTH_API_BASE_URL is missing.');
  }
  return value.replace(/\/$/, '');
}

export function createProductionAuthApi(
  configuredBaseUrl: string | undefined,
  fetchImpl: FetchLike = fetch,
): IAuthApi {
  const request = async <T>(path: string, init: RequestInit = {}): Promise<T> => {
    const response = await fetchImpl(`${requireBaseUrl(configuredBaseUrl)}${path}`, {
      ...init,
      credentials: 'include',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...init.headers },
    });
    if (!response.ok) throw new Error(`Authentication API request failed (${response.status}).`);
    if (response.status === 204) return undefined as T;
    const contentType = response.headers.get('content-type') ?? '';
    if (!contentType.includes('application/json')) {
      throw new Error('Authentication API returned an unexpected response type.');
    }
    return response.json() as Promise<T>;
  };

  const requestWithBearer = <T>(path: string, token: string, init: RequestInit = {}) => {
    const normalizedToken = token.trim();
    if (!normalizedToken) throw new Error('Authentication session token is required.');
    return request<T>(path, {
      ...init,
      headers: { Authorization: `Bearer ${normalizedToken}`, ...init.headers },
    });
  };

  return {
    login: (req: LoginRequest) => request<SessionContext>('/auth/login', { method: 'POST', body: JSON.stringify(req) }),
    logout: (token: string) => requestWithBearer<void>('/auth/logout', token, { method: 'POST' }),
    verifySession: (token: string) => requestWithBearer<SessionContext | null>('/auth/session', token),
    getStores: (orgSlug: string, token: string) => requestWithBearer<readonly Store[]>(`/organizations/${encodeURIComponent(orgSlug)}/stores`, token),
  };
}
