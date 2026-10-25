import { existsSync } from 'node:fs';
import { Pool, type PoolConfig, type QueryResultRow } from 'pg';
import type { SqlExecutor } from '../auth/postgres-repository.ts';

const LOCAL_POSTGRES_SOCKET = '/tmp/pgrun/.s.PGSQL.5432';
const LOCAL_FALLBACK_DATABASE_URL = 'postgresql://postgres@127.0.0.1:5432/prodx_pos';

const shouldResolveProductionDatabaseUrl = (): boolean =>
  process.env.VERCEL === '1' && process.env.NODE_ENV === 'production';

export const resolveConfiguredDatabaseUrl = (
  rawUrl: string | undefined = process.env.DATABASE_URL,
): string | undefined => {
  const trimmed = rawUrl?.trim();
  if (!trimmed || trimmed === 'postgresql://...' || trimmed === 'postgres://...') {
    if (!shouldResolveProductionDatabaseUrl() && process.env.NODE_ENV !== 'production') {
      return LOCAL_FALLBACK_DATABASE_URL;
    }
    return undefined;
  }
  return trimmed;
};

export type ProductionDatabaseTarget = 'supabase_session_pooler' | 'other' | 'invalid';

export const classifyProductionDatabaseTarget = (databaseUrl?: string): ProductionDatabaseTarget => {
  if (!databaseUrl) return 'invalid';
  try {
    const hostname = new URL(databaseUrl).hostname;
    if (hostname === 'aws-0-ap-northeast-1.pooler.supabase.com') return 'supabase_session_pooler';
    return 'other';
  } catch {
    return 'invalid';
  }
};

type ProductionBrokerStage = 'broker_config' | 'broker_fetch' | 'broker_http' | 'broker_response';
type ProductionBrokerError = Error & { stage: ProductionBrokerStage; cause?: unknown; brokerStatus?: number };

const productionBrokerError = (
  message: string,
  stage: ProductionBrokerStage,
  cause?: unknown,
  brokerStatus?: number,
): ProductionBrokerError => {
  const error = new Error(message) as ProductionBrokerError;
  error.stage = stage;
  if (cause !== undefined) error.cause = cause;
  if (brokerStatus !== undefined) error.brokerStatus = brokerStatus;
  return error;
};

export const resolveProductionDatabaseUrl = async (
  vercelOidcToken?: string,
): Promise<string | undefined> => {
  if (!shouldResolveProductionDatabaseUrl()) {
    return resolveConfiguredDatabaseUrl(process.env.DATABASE_URL);
  }

  const oidcToken = vercelOidcToken ?? process.env.VERCEL_OIDC_TOKEN;
  if (!oidcToken) {
    throw productionBrokerError('Vercel OIDC token is required to resolve the production PostgreSQL connection.', 'broker_config');
  }

  // Require an explicitly approved endpoint; never silently target a retired project.
  const brokerUrl = process.env.PRODX_DB_BROKER_URL?.trim();
  if (!brokerUrl) {
    throw productionBrokerError('PRODX_DB_BROKER_URL is required to resolve the production PostgreSQL connection.', 'broker_config');
  }
  let response: Response;
  try {
    response = await fetch(brokerUrl, {
      method: 'GET',
      headers: {
        authorization: `Bearer ${oidcToken}`,
        accept: 'application/json',
      },
    });
  } catch (cause: unknown) {
    throw productionBrokerError('Production database broker request failed.', 'broker_fetch', cause);
  }

  if (!response.ok) {
    throw productionBrokerError(
      `Production database broker rejected the request with HTTP ${response.status}.`,
      'broker_http',
      undefined,
      response.status,
    );
  }

  let payload: { databaseUrl?: unknown };
  try {
    payload = await response.json() as { databaseUrl?: unknown };
  } catch (cause: unknown) {
    throw productionBrokerError('Production database broker returned an invalid response.', 'broker_response', cause);
  }
  if (typeof payload.databaseUrl !== 'string' || payload.databaseUrl.length === 0) {
    throw productionBrokerError('Production database broker returned no database URL.', 'broker_response');
  }

  return payload.databaseUrl;
};

export const createPostgresPool = (config: PoolConfig = {}): Pool => {
  const connectionString = resolveConfiguredDatabaseUrl(config.connectionString ?? process.env.DATABASE_URL);
  if (!connectionString) {
    console.warn('DATABASE_URL is missing or unconfigured. PostgreSQL pool created in mock/degraded mode.');
    // Return a dummy pool that fails safely on query
    return {
      query: () => Promise.reject(new Error('PostgreSQL is not configured (DATABASE_URL is missing).')),
      on: () => {},
      end: () => Promise.resolve(),
      connect: () => Promise.reject(new Error('PostgreSQL is not configured.')),
    } as unknown as Pool;
  }

  return new Pool({
    ...config,
    connectionString,
    max: config.max ?? (process.env.VERCEL ? 1 : 10),
    ssl: config.ssl ?? (process.env.NODE_ENV === 'production' ? { rejectUnauthorized: true } : undefined),
  });
};

export const createProductionPostgresPool = async (
  config: PoolConfig = {},
  vercelOidcToken?: string,
): Promise<Pool> => {
  // Production must always resolve the approved database through the authenticated broker.
  // Caller-supplied PoolConfig.connectionString must never bypass this trust boundary.
  const connectionString = shouldResolveProductionDatabaseUrl()
    ? await resolveProductionDatabaseUrl(vercelOidcToken)
    : config.connectionString ?? await resolveProductionDatabaseUrl(vercelOidcToken);
  if (shouldResolveProductionDatabaseUrl()) {
    console.info('PRODX production database target selected', {
      target: classifyProductionDatabaseTarget(connectionString),
    });
  }
  return createPostgresPool({ ...config, connectionString });
};

export const asSqlExecutor = (pool: Pick<Pool, 'query'>): SqlExecutor => ({
  async query<T extends Record<string, unknown>>(sql: string, parameters: readonly unknown[] = []) {
    const result = await pool.query<T & QueryResultRow>(sql, [...parameters]);
    return result.rows;
  },
});
