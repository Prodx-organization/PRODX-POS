import type { IAuthApi, LoginRequest } from './types';
import type { SessionContext, Store } from '../domain/auth';
import { supabase } from '../lib/supabase';

const baseUrl = () => {
  const value = import.meta.env.VITE_AUTH_API_BASE_URL;
  if (!value) throw new Error('Production authentication API is not configured: VITE_AUTH_API_BASE_URL is missing.');
  return value.replace(/\/$/, '');
};

const requireToken = (token: string) => {
  const normalized = token.trim();
  if (!normalized) throw new Error('Supabase access token is required.');
  return normalized;
};

const exchangeToken = async (token: string, request: LoginRequest): Promise<SessionContext> => {
  const response = await fetch(`${baseUrl()}/auth/supabase/session`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${requireToken(token)}`,
    },
    body: JSON.stringify({
      organizationSlug: request.organizationSlug,
      storeCode: request.storeCode,
      registerId: request.registerId,
    }),
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(body?.error?.message ?? 'Supabase authentication exchange failed.');
  return body as SessionContext;
};

export const createSupabaseAuthApi = (): IAuthApi => ({
  async login(request) {
    const identity = request.emailOrPin.trim();
    if (!identity.includes('@')) {
      throw new Error('Supabase Auth requires an email identity for password sign-in.');
    }
    const { data, error } = await supabase.auth.signInWithPassword({
      email: identity,
      password: request.passwordOrPin ?? '',
    });
    if (error || !data.session?.access_token) {
      throw new Error(error?.message ?? 'Supabase sign-in did not return a session.');
    }
    try {
      return await exchangeToken(data.session.access_token, request);
    } catch (error) {
      await supabase.auth.signOut().catch(() => undefined);
      throw error;
    }
  },

  async logout(token) {
    await fetch(`${baseUrl()}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
      headers: { Authorization: `Bearer ${requireToken(token)}` },
    }).catch(() => undefined);
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  async verifySession(token) {
    if (!token) return null;
    const response = await fetch(`${baseUrl()}/auth/session`, {
      credentials: 'include',
      headers: { Accept: 'application/json', Authorization: `Bearer ${requireToken(token)}` },
    });
    if (response.status === 401) return null;
    if (!response.ok) throw new Error(`Authentication API request failed (${response.status}).`);
    return response.json() as Promise<SessionContext>;
  },

  async getStores(orgSlug, token) {
    const response = await fetch(`${baseUrl()}/organizations/${encodeURIComponent(orgSlug)}/stores`, {
      credentials: 'include',
      headers: { Accept: 'application/json', Authorization: `Bearer ${requireToken(token)}` },
    });
    if (!response.ok) throw new Error(`Authentication API request failed (${response.status}).`);
    return response.json() as Promise<readonly Store[]>;
  },
});
