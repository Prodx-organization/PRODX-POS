import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import type { Express, Request, Response } from 'express';

const OWNER_ACCOUNT_EMAIL = 'prodx.owner@gmail.com';
const OWNER_PROJECT_HOST = 'bbxoywnlayduqbrjeixj.supabase.co';
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
type OwnerIdentity = { userId: string; email: string };
type OwnerRouteDependencies = {
  verifyToken?: (token: string) => Promise<OwnerIdentity | null>;
  getRole?: (userId: string, accessToken: string) => Promise<string | null>;
};
let remoteJwks: ReturnType<typeof createRemoteJWKSet> | undefined;

const verifyOwnerToken = async (token: string): Promise<OwnerIdentity | null> => {
  const ownerUrl = process.env.SUPABASE_OWNER_URL?.trim();
  const jwksUrl = process.env.SUPABASE_OWNER_JWKS_URL?.trim();
  if (!ownerUrl || !jwksUrl) throw new Error('Owner Supabase issuer configuration is missing.');
  const issuerUrl = new URL(ownerUrl);
  const keysUrl = new URL(jwksUrl);
  if (issuerUrl.protocol !== 'https:' || keysUrl.protocol !== 'https:' ||
      issuerUrl.hostname !== OWNER_PROJECT_HOST || keysUrl.hostname !== issuerUrl.hostname ||
      keysUrl.pathname !== '/auth/v1/.well-known/jwks.json' ||
      issuerUrl.username || issuerUrl.password || keysUrl.username || keysUrl.password) {
    throw new Error('Owner Supabase issuer configuration is invalid.');
  }
  remoteJwks ??= createRemoteJWKSet(keysUrl);
  const { payload } = await jwtVerify(token, remoteJwks, {
    issuer: new URL('/auth/v1', ownerUrl).toString().replace(/\/$/, ''),
    audience: 'authenticated',
    algorithms: ['ES256', 'RS256'],
  });
  if (typeof payload.sub !== 'string' || !UUID_PATTERN.test(payload.sub) ||
      typeof payload.email !== 'string') return null;
  return { userId: payload.sub, email: payload.email.trim().toLowerCase() };
};

const createOwnerUserClient = (accessToken: string): SupabaseClient => {
  const ownerUrl = process.env.SUPABASE_OWNER_URL?.trim();
  const publishableKey = process.env.VITE_OWNER_SUPABASE_PUBLISHABLE_KEY?.trim();
  if (!ownerUrl || !publishableKey) throw new Error('Owner Supabase role lookup is not configured.');
  const parsed = new URL(ownerUrl);
  if (parsed.protocol !== 'https:' || parsed.hostname !== OWNER_PROJECT_HOST ||
      parsed.username || parsed.password) {
    throw new Error('Owner Supabase role lookup configuration is invalid.');
  }
  return createClient(ownerUrl, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
};

const queryOwnerRole = async (userId: string, accessToken: string): Promise<string | null> => {
  const client = createOwnerUserClient(accessToken);
  const { data, error } = await client.from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw new Error('Owner role lookup failed.');
  return typeof data?.role === 'string' ? data.role : null;
};

export const registerOwnerSessionRoute = (
  app: Express,
  dependencies: OwnerRouteDependencies = {},
): void => {
  app.get('/api/v1/owner/session', async (request: Request, response: Response) => {
    const authorization = request.header('authorization');
    if (!authorization?.startsWith('Bearer ')) {
      response.status(401).json({ error: { code: 'UNAUTHENTICATED' } });
      return;
    }
    const accessToken = authorization.slice(7).trim();
    if (!accessToken) {
      response.status(401).json({ error: { code: 'UNAUTHENTICATED' } });
      return;
    }
    try {
      const identity = await (dependencies.verifyToken ?? verifyOwnerToken)(accessToken);
      if (!identity) {
        response.status(401).json({ error: { code: 'UNAUTHENTICATED' } });
        return;
      }
      if (identity.email.trim().toLowerCase() !== OWNER_ACCOUNT_EMAIL) {
        response.status(403).json({ error: { code: 'FORBIDDEN' } });
        return;
      }
      const role = await (dependencies.getRole ?? queryOwnerRole)(identity.userId, accessToken);
      if (role !== 'owner') {
        response.status(403).json({ error: { code: 'FORBIDDEN' } });
        return;
      }
      response.setHeader('Cache-Control', 'no-store');
      response.status(200).json({ authorized: true, userId: identity.userId, email: identity.email, role: 'owner' });
    } catch {
      response.status(503).json({ error: { code: 'OWNER_AUTHORIZATION_UNAVAILABLE' } });
    }
  });
};
