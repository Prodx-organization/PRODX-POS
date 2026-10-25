/**
 * PRODX production database broker: request handler.
 *
 * This module is intentionally runtime-neutral (Web `Request`/`Response` only) so it can be
 * unit-tested under Node and served from a Supabase Edge Function (see ./index.ts).
 *
 * Trust model:
 * - The only caller is the PRODX Vercel production deployment, authenticated with a Vercel OIDC token.
 * - The token must verify against the configured issuer/audience and its `sub` claim must exactly match
 *   an allow-listed subject (team + project + environment).
 * - On success the broker returns the connection URL of the restricted `prodx_app` runtime role.
 *   It must never return an owner/superuser/service-role connection string.
 * - Credentials, tokens and connection URLs are never logged or echoed in error responses.
 */

export interface BrokerConfig {
  /** OIDC issuer, e.g. https://oidc.vercel.com/<team-slug>. */
  readonly issuer: string;
  /** Expected `aud` claim, e.g. https://vercel.com/<team-slug>. */
  readonly audience: string;
  /** Exact `sub` values allowed to receive the database URL. */
  readonly allowedSubjects: readonly string[];
  /** Connection URL for the restricted prodx_app runtime role. */
  readonly databaseUrl: string;
}

export type VerifyOidcToken = (
  token: string,
  expected: { readonly issuer: string; readonly audience: string },
) => Promise<Readonly<Record<string, unknown>>>;

export interface BrokerDependencies {
  /** Null when required secrets are missing; the broker then fails closed with 503. */
  readonly config: BrokerConfig | null;
  readonly verifyToken: VerifyOidcToken;
}

const JSON_HEADERS = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store',
} as const;

const respond = (status: number, body: Record<string, unknown>, extra: Record<string, string> = {}): Response =>
  new Response(JSON.stringify(body), { status, headers: { ...JSON_HEADERS, ...extra } });

const readBearerToken = (header: string | null): string | null => {
  if (!header) return null;
  const match = /^Bearer\s+([A-Za-z0-9\-._~+/]+=*)$/.exec(header.trim());
  return match ? match[1] : null;
};

/** Parses a comma-separated allow-list, dropping blanks. */
export const parseAllowedSubjects = (raw: string | undefined): readonly string[] =>
  (raw ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter((value) => value.length > 0);

/**
 * Builds a validated config from raw environment values, or returns null if anything required is
 * missing or unsafe (non-https issuer/audience, non-postgres URL, empty allow-list).
 */
export const buildBrokerConfig = (env: {
  readonly issuer?: string;
  readonly audience?: string;
  readonly allowedSubjects?: string;
  readonly databaseUrl?: string;
}): BrokerConfig | null => {
  const issuer = env.issuer?.trim().replace(/\/+$/, '');
  const audience = env.audience?.trim();
  const databaseUrl = env.databaseUrl?.trim();
  const allowedSubjects = parseAllowedSubjects(env.allowedSubjects);

  if (!issuer || !audience || !databaseUrl || allowedSubjects.length === 0) return null;
  if (!issuer.startsWith('https://') || !audience.startsWith('https://')) return null;
  if (!/^postgres(ql)?:\/\//.test(databaseUrl)) return null;
  // The runtime URL must be for the restricted application role, never an administrative one.
  try {
    const username = decodeURIComponent(new URL(databaseUrl).username).split('.')[0];
    if (username !== 'prodx_app') return null;
  } catch {
    return null;
  }

  return { issuer, audience, allowedSubjects, databaseUrl };
};

export const createBrokerHandler = (deps: BrokerDependencies) => async (request: Request): Promise<Response> => {
  if (request.method !== 'GET') {
    return respond(405, { error: 'method_not_allowed' }, { allow: 'GET' });
  }

  const { config } = deps;
  if (!config) {
    return respond(503, { error: 'broker_not_configured' });
  }

  const token = readBearerToken(request.headers.get('authorization'));
  if (!token) {
    return respond(401, { error: 'unauthorized' }, { 'www-authenticate': 'Bearer' });
  }

  let claims: Readonly<Record<string, unknown>>;
  try {
    claims = await deps.verifyToken(token, { issuer: config.issuer, audience: config.audience });
  } catch {
    return respond(401, { error: 'unauthorized' }, { 'www-authenticate': 'Bearer' });
  }

  const subject = typeof claims.sub === 'string' ? claims.sub : '';
  if (!subject || !config.allowedSubjects.includes(subject)) {
    return respond(403, { error: 'forbidden' });
  }

  return respond(200, { databaseUrl: config.databaseUrl });
};
