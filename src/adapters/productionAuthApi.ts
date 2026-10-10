import type { IAuthApi, LoginRequest } from './types';
import type { SessionContext, Store } from '../domain/auth';

const configuredBaseUrl = () => (import.meta.env.VITE_AUTH_API_BASE_URL?.trim() || '').replace(/\/$/, '');

type Fetcher = typeof fetch;

const requireBaseUrl = (value: string): string => {
  const normalized = value.trim().replace(/\/$/, '');
  if (!normalized) {
    throw new Error('Authentication API is not configured. Set VITE_AUTH_API_BASE_URL.');
  }
  return normalized;
};

const requireToken = (token: string) => {
  const normalized = token.trim();
  if (!normalized) throw new Error('Authentication token is required.');
  return normalized;
};

const parseJson = async (response: Response): Promise<unknown> => {
  try {
    return await response.json();
  } catch {
    return null;
  }
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const parseSessionContext = (value: unknown): SessionContext => {
  if (!isRecord(value) ||
      !isRecord(value.organization) ||
      typeof value.organization.id !== 'string' ||
      !isRecord(value.currentStore) ||
      typeof value.currentStore.id !== 'string' ||
      !isRecord(value.currentUser) ||
      typeof value.currentUser.id !== 'string' ||
      typeof value.currentUser.role !== 'string' ||
      !Array.isArray(value.currentUser.permissions) ||
      typeof value.token !== 'string' ||
      value.token.trim().length === 0 ||
      typeof value.expiresAt !== 'string' ||
      Number.isNaN(Date.parse(value.expiresAt))) {
    throw new Error('Authentication API returned an invalid session response.');
  }
  return value as unknown as SessionContext;
};

export const createProductionAuthApi = (
  apiBaseUrl = configuredBaseUrl(),
  fetchImpl: Fetcher = fetch,
): IAuthApi => {
  const baseUrl = requireBaseUrl(apiBaseUrl);

  return {
    async login(request: LoginRequest): Promise<SessionContext> {
      const response = await fetchImpl(`${baseUrl}/auth/login`, {
        method: 'POST',
        credentials: 'include',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationSlug: request.organizationSlug,
          storeCode: request.storeCode,
          registerId: request.registerId,
          emailOrPin: request.emailOrPin,
          passwordOrPin: request.passwordOrPin ?? '',
        }),
      });
      const body = await parseJson(response);
      if (!response.ok) {
        const message = isRecord(body) && isRecord(body.error) && typeof body.error.message === 'string'
          ? body.error.message
          : 'Authentication failed.';
        throw new Error(message);
      }
      return parseSessionContext(body);
    },

    async logout(token: string): Promise<void> {
      const response = await fetchImpl(`${baseUrl}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
        headers: { Accept: 'application/json', Authorization: `Bearer ${requireToken(token)}` },
      });
      if (!response.ok && response.status !== 401) throw new Error('Authentication logout failed.');
    },

    async verifySession(token: string): Promise<SessionContext | null> {
      if (!token) return null;
      const response = await fetchImpl(`${baseUrl}/auth/session`, {
        credentials: 'include',
        headers: { Accept: 'application/json', Authorization: `Bearer ${requireToken(token)}` },
      });
      if (response.status === 401) return null;
      if (!response.ok) throw new Error(`Authentication API request failed (${response.status}).`);
      return parseSessionContext(await parseJson(response));
    },

    async getStores(orgSlug: string, token: string): Promise<readonly Store[]> {
      const response = await fetchImpl(`${baseUrl}/organizations/${encodeURIComponent(orgSlug)}/stores`, {
        credentials: 'include',
        headers: { Accept: 'application/json', Authorization: `Bearer ${requireToken(token)}` },
      });
      if (!response.ok) throw new Error(`Authentication API request failed (${response.status}).`);
      const body = await parseJson(response);
      if (!Array.isArray(body)) throw new Error('Authentication API returned an invalid stores response.');
      return body as Store[];
    },
  };
};
