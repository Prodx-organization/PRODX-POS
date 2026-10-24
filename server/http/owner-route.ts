import type { Express, Request, Response } from 'express';
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';
import type { Pool } from 'pg';
import { OWNER_ACCOUNT_EMAIL } from '../../src/modules/owner/ownerAuthorization';

export type OwnerIdentity = {
  userId: string;
  email: string;
};

type OwnerRouteDependencies = {
  getPool: () => Pick<Pool, 'query'>;
  verifyToken?: (token: string) => Promise<OwnerIdentity | null>;
};

const readBearerToken = (request: Request): string | null => {
  const value = request.header('authorization');
  if (!value || !value.startsWith('Bearer ')) return null;
  const token = value.slice('Bearer '.length).trim();
  return token.length > 0 ? token : null;
};

const configuredOwnerVerifier = async (token: string): Promise<OwnerIdentity | null> => {
  const ownerUrlValue = process.env.OWNER_SUPABASE_URL?.trim();
  const jwksUrlValue = process.env.OWNER_SUPABASE_JWKS_URL?.trim();
  if (!ownerUrlValue || !jwksUrlValue) {
    throw new Error('Owner Supabase server authentication is not configured.');
  }

  let ownerUrl: URL;
  let jwksUrl: URL;
  try {
    ownerUrl = new URL(ownerUrlValue);
    jwksUrl = new URL(jwksUrlValue);
  } catch {
    throw new Error('Owner Supabase server authentication configuration is invalid.');
  }

  if (ownerUrl.protocol !== 'https:' || jwksUrl.protocol !== 'https:') {
    throw new Error('Owner Supabase server authentication URLs must use HTTPS.');
  }
  if (ownerUrl.username || ownerUrl.password || jwksUrl.username || jwksUrl.password) {
    throw new Error('Owner Supabase server authentication URLs must not contain credentials.');
  }

  const jwks = createRemoteJWKSet(jwksUrl);
  const { payload } = await jwtVerify(token, jwks, {
    issuer: new URL('/auth/v1', ownerUrl).toString().replace(/\/$/, ''),
    audience: 'authenticated',
  });
  const claims = payload as JWTPayload & { email?: unknown; sub?: unknown };
  if (typeof claims.sub !== 'string' || typeof claims.email !== 'string') return null;
  return { userId: claims.sub, email: claims.email };
};

export const registerOwnerRoutes = (
  app: Express,
  dependencies: OwnerRouteDependencies,
): void => {
  app.get('/api/v1/owner/me', async (request: Request, response: Response) => {
    const token = readBearerToken(request);
    if (!token) {
      response.status(401).json({ error: { code: 'UNAUTHENTICATED', message: 'Authentication is required.' } });
      return;
    }

    let identity: OwnerIdentity | null;
    try {
      identity = await (dependencies.verifyToken ?? configuredOwnerVerifier)(token);
    } catch {
      response.status(401).json({ error: { code: 'UNAUTHENTICATED', message: 'Authentication could not be verified.' } });
      return;
    }
    if (!identity) {
      response.status(401).json({ error: { code: 'UNAUTHENTICATED', message: 'Authentication could not be verified.' } });
      return;
    }

    if (identity.email.trim().toLowerCase() !== OWNER_ACCOUNT_EMAIL) {
      response.status(403).json({ error: { code: 'FORBIDDEN', message: 'The requested capability is not authorized.' } });
      return;
    }

    try {
      const result = await dependencies.getPool().query<{ role: string }>(
        'SELECT role FROM public.user_roles WHERE user_id = $1 LIMIT 1',
        [identity.userId],
      );
      if (result.rows[0]?.role !== 'owner') {
        response.status(403).json({ error: { code: 'FORBIDDEN', message: 'The requested capability is not authorized.' } });
        return;
      }
      response.setHeader('Cache-Control', 'no-store');
      response.status(200).json({ userId: identity.userId, email: identity.email, role: 'owner' });
    } catch {
      response.status(503).json({ error: { code: 'OWNER_AUTHORIZATION_UNAVAILABLE', message: 'Owner authorization is temporarily unavailable.' } });
    }
  });
};
