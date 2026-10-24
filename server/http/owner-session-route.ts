import { createRemoteJWKSet, jwtVerify } from 'jose';
import type { Express, Request, Response } from 'express';
import type { Pool } from 'pg';
import { getOwnerPostgresPool } from '../db/owner-postgres';

const OWNER_ACCOUNT_EMAIL = 'prodx.owner@gmail.com';
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type OwnerIdentity = { userId: string; email: string };
type OwnerRouteDependencies = {
  verifyToken?: (token: string) => Promise<OwnerIdentity | null>;
  getRole?: (userId: string) => Promise<string | null>;
};

let remoteJwks: ReturnType<typeof createRemoteJWKSet> | undefined;

const verifyOwnerToken = async (token: string): Promise<OwnerIdentity | null> => {
  const ownerUrl = process.env.SUPABASE_OWNER_URL?.trim();
  const jwksUrl = process.env.SUPABASE_OWNER_JWKS_URL?.trim();
  if (!ownerUrl || !jwksUrl) throw new Error('Owner Supabase issuer configuration is missing.');

  const issuerUrl = new URL(ownerUrl);
  const keysUrl = new URL(jwksUrl);
  if (issuerUrl.protocol !== 'https:' || keysUrl.protocol !== 'https:' ||
      issuerUrl.hostname !== 'bbxoywnlayduqbrjeixj.supabase.co' ||
      keysUrl.hostname !== issuerUrl.hostname ||
      keysUrl.pathname !== '/auth/v1/.well-known/jwks.json') {
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

const queryOwnerRole = async (userId: string, pool: Pool = getOwnerPostgresPool()): Promise<string | null> => {
  const result = await pool.query<{ role: string }>(
    'SELECT role FROM public.user_roles WHERE user_id = $1 LIMIT 1',
    [userId],
  );
  return result.rows[0]?.role ?? null;
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

    try {
      const identity = await (dependencies.verifyToken ?? verifyOwnerToken)(authorization.slice(7).trim());
      if (!identity) {
        response.status(401).json({ error: { code: 'UNAUTHENTICATED' } });
        return;
      }
      if (identity.email.trim().toLowerCase() !== OWNER_ACCOUNT_EMAIL) {
        response.status(403).json({ error: { code: 'FORBIDDEN' } });
        return;
      }

      const role = await (dependencies.getRole ?? ((userId: string) => queryOwnerRole(userId)))(identity.userId);
      if (role !== 'owner') {
        response.status(403).json({ error: { code: 'FORBIDDEN' } });
        return;
      }
      response.status(200).json({ authorized: true, userId: identity.userId, email: identity.email });
    } catch {
      response.status(503).json({ error: { code: 'OWNER_AUTHORIZATION_UNAVAILABLE' } });
    }
  });
};
