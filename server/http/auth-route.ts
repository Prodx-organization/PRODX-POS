import type { Express, NextFunction, Request, Response } from 'express';
import type { AuthenticatedSession, SessionIssuer } from '../auth/session';
import type { SqlExecutor } from '../auth/postgres-repository';

type LoginBody = {
  organizationSlug: string;
  storeCode: string;
  emailOrPin: string;
  passwordOrPin: string;
  registerId: string;
};

type Role = 'admin' | 'manager' | 'cashier';

// Store-level commercial defaults are not yet persisted per store. Keep them in
// one place so they can be replaced by a store settings table later.
const DEFAULT_STORE_CURRENCY = 'THB';
const DEFAULT_STORE_TAX_RATE_BPS = 700;
const MAX_FIELD_LENGTH = 256;

const AUTH_FAILED_MESSAGE = 'Invalid credentials or store scope.';

const errorBody = (request: Request, code: string, message: string) => ({
  error: { code, message, requestId: request.id },
});

const sendUnauthenticated = (request: Request, response: Response, message = 'Authentication is required.'): void => {
  response.status(401).json(errorBody(request, 'UNAUTHENTICATED', message));
};

const sendAuthFailed = (request: Request, response: Response, message = AUTH_FAILED_MESSAGE): void => {
  response.status(401).json(errorBody(request, 'AUTHENTICATION_FAILED', message));
};

const bearerToken = (request: Request): string | null => {
  const header = request.header('authorization');
  if (!header?.startsWith('Bearer ')) return null;
  const token = header.slice('Bearer '.length).trim();
  return token.length > 0 ? token : null;
};

const asyncRoute = (handler: (request: Request, response: Response) => Promise<void>) =>
  (request: Request, response: Response, next: NextFunction): void => {
    handler(request, response).catch(next);
  };

const readLoginBody = (value: unknown): LoginBody | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const body = value as Record<string, unknown>;
  const fields = ['organizationSlug', 'storeCode', 'emailOrPin', 'passwordOrPin', 'registerId'] as const;
  const result: Partial<LoginBody> = {};
  for (const field of fields) {
    const raw = body[field];
    if (typeof raw !== 'string') return null;
    const normalized = field === 'passwordOrPin' ? raw : raw.trim();
    if (!normalized || normalized.length > MAX_FIELD_LENGTH) return null;
    result[field] = normalized;
  }
  return result as LoginBody;
};

const toRole = (value: string): Role => (value === 'admin' || value === 'manager' ? value : 'cashier');

const mapStore = (row: { id: string; organization_id: string; code: string; name: string; business_timezone: string }) => ({
  id: row.id,
  organizationId: row.organization_id,
  code: row.code,
  name: row.name,
  address: '',
  phone: '',
  currency: DEFAULT_STORE_CURRENCY,
  timezone: row.business_timezone,
  defaultTaxRateBps: DEFAULT_STORE_TAX_RATE_BPS,
});

const loadSessionContext = async (
  db: SqlExecutor,
  principal: AuthenticatedSession,
  token: string,
  expiresAt: Date,
) => {
  const rows = await db.query<{
    organization_id: string; organization_code: string; organization_name: string;
    store_id: string; store_code: string; store_name: string; business_timezone: string;
    user_id: string; username: string; display_name: string; role_key: string;
    device_key: string;
  }>(
    `SELECT o.id AS organization_id, o.code AS organization_code, o.name AS organization_name,
            s.id AS store_id, s.code AS store_code, s.name AS store_name, s.business_timezone,
            u.id AS user_id, u.username, u.display_name,
            COALESCE(r.role_key, 'cashier') AS role_key,
            d.device_key
       FROM prodx_sessions ses
       JOIN prodx_organizations o ON o.id = ses.organization_id
       JOIN prodx_devices d ON d.id = ses.device_id AND d.organization_id = o.id AND d.status = 'active'
       JOIN prodx_stores s ON s.organization_id = o.id AND s.id = d.store_id AND s.active = TRUE
       JOIN prodx_users u ON u.organization_id = o.id AND u.id = ses.user_id AND u.status = 'active'
       JOIN prodx_store_memberships m ON m.organization_id = o.id AND m.store_id = s.id AND m.user_id = u.id AND m.active = TRUE
       LEFT JOIN prodx_user_roles ur ON ur.organization_id = o.id AND ur.store_id = s.id AND ur.user_id = u.id AND ur.active = TRUE
       LEFT JOIN prodx_roles r ON r.organization_id = o.id AND r.id = ur.role_id AND r.active = TRUE
      WHERE ses.id = $1 AND ses.organization_id = $2 AND d.store_id = $3 AND ses.user_id = $4
      ORDER BY CASE r.role_key WHEN 'admin' THEN 0 WHEN 'manager' THEN 1 ELSE 2 END
      LIMIT 1`,
    [principal.sessionId, principal.organizationId, principal.storeId, principal.userId],
  );
  const row = rows[0];
  if (!row) return null;
  const permissions = await db.query<{ permission_key: string }>(
    `SELECT DISTINCT p.permission_key FROM prodx_role_permissions rp
       JOIN prodx_permissions p ON p.id = rp.permission_id
       JOIN prodx_roles r ON r.id = rp.role_id AND r.organization_id = rp.organization_id AND r.active = TRUE
       JOIN prodx_user_roles ur ON ur.organization_id = rp.organization_id AND ur.role_id = rp.role_id
        AND ur.store_id = $2 AND ur.user_id = $3 AND ur.active = TRUE
      WHERE rp.organization_id = $1
      ORDER BY p.permission_key`,
    [principal.organizationId, principal.storeId, principal.userId],
  );
  return {
    organization: { id: row.organization_id, name: row.organization_name, slug: row.organization_code, stores: [] },
    currentStore: mapStore({
      id: row.store_id, organization_id: row.organization_id, code: row.store_code,
      name: row.store_name, business_timezone: row.business_timezone,
    }),
    registerId: row.device_key,
    currentUser: {
      id: row.user_id,
      name: row.display_name,
      email: row.username,
      role: toRole(row.role_key),
      employeeCode: row.username,
      permissions: permissions.map((permission) => permission.permission_key),
    },
    token,
    expiresAt: expiresAt.toISOString(),
  };
};

/**
 * Public authentication routes. These are mounted before the global
 * authentication middleware because /auth/login must accept anonymous
 * requests; routes that need a session validate the bearer token themselves
 * through the same SessionIssuer used by the global middleware.
 */
export const registerAuthRoutes = (app: Express, db: SqlExecutor, sessions: SessionIssuer): void => {
  app.post('/auth/login', asyncRoute(async (request, response) => {
    const body = readLoginBody(request.body);
    if (!body) {
      response.status(400).json(errorBody(
        request,
        'AUTH_REQUEST_INVALID',
        'organizationSlug, storeCode, emailOrPin, passwordOrPin, and registerId are required strings.',
      ));
      return;
    }

    const devices = await db.query<{ id: string; store_id: string }>(
      `SELECT d.id, d.store_id
         FROM prodx_organizations o
         JOIN prodx_stores s ON s.organization_id = o.id AND lower(s.code) = lower($2) AND s.active = TRUE
         JOIN prodx_devices d ON d.organization_id = o.id AND d.store_id = s.id AND d.device_key = $3 AND d.status = 'active'
        WHERE lower(o.code) = lower($1)
        LIMIT 1`,
      [body.organizationSlug, body.storeCode, body.registerId],
    );
    const device = devices[0];
    if (!device) { sendAuthFailed(request, response); return; }

    const issued = await sessions.authenticateCredentials({
      username: body.emailOrPin,
      password: body.passwordOrPin,
      deviceId: device.id,
    });
    if (!issued) { sendAuthFailed(request, response); return; }

    const principal = await sessions.authenticateBearer(issued.token);
    if (!principal || principal.storeId !== device.store_id) {
      await sessions.revokeBearer(issued.token);
      sendAuthFailed(request, response);
      return;
    }

    const context = await loadSessionContext(db, principal, issued.token, issued.expiresAt);
    if (!context) {
      await sessions.revokeBearer(issued.token);
      sendAuthFailed(request, response, 'Session scope could not be established.');
      return;
    }
    response.status(200).json(context);
  }));

  app.post('/auth/logout', asyncRoute(async (request, response) => {
    const token = bearerToken(request);
    if (!token) { sendUnauthenticated(request, response); return; }
    if (!(await sessions.revokeBearer(token))) {
      sendUnauthenticated(request, response, 'Authentication session is invalid.');
      return;
    }
    response.status(204).send();
  }));

  app.get('/auth/session', asyncRoute(async (request, response) => {
    const token = bearerToken(request);
    if (!token) { sendUnauthenticated(request, response); return; }
    const principal = await sessions.authenticateBearer(token);
    if (!principal) { sendUnauthenticated(request, response, 'Authentication session is invalid.'); return; }
    const sessionRows = await db.query<{ expires_at: Date }>(
      `SELECT expires_at FROM prodx_sessions WHERE id = $1 AND revoked_at IS NULL LIMIT 1`,
      [principal.sessionId],
    );
    const expiresAt = sessionRows[0]?.expires_at;
    if (!expiresAt) { sendUnauthenticated(request, response, 'Authentication session is invalid.'); return; }
    const context = await loadSessionContext(db, principal, token, expiresAt);
    if (!context) { sendUnauthenticated(request, response, 'Authentication session is invalid.'); return; }
    response.json(context);
  }));

  app.get('/organizations/:orgSlug/stores', asyncRoute(async (request, response) => {
    const token = bearerToken(request);
    if (!token) { sendUnauthenticated(request, response); return; }
    const principal = await sessions.authenticateBearer(token);
    if (!principal) { sendUnauthenticated(request, response, 'Authentication session is invalid.'); return; }
    const rows = await db.query<{ id: string; organization_id: string; code: string; name: string; business_timezone: string }>(
      `SELECT s.id, s.organization_id, s.code, s.name, s.business_timezone
         FROM prodx_stores s
         JOIN prodx_organizations o ON o.id = s.organization_id
         JOIN prodx_store_memberships m ON m.organization_id = s.organization_id AND m.store_id = s.id
          AND m.user_id = $2 AND m.active = TRUE
        WHERE o.id = $1 AND lower(o.code) = lower($3) AND s.active = TRUE
        ORDER BY s.code`,
      [principal.organizationId, principal.userId, request.params.orgSlug],
    );
    response.json(rows.map(mapStore));
  }));
};
