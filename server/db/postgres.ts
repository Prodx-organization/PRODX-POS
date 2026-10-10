import { Pool, type PoolConfig, type QueryResultRow } from 'pg';
import type { SqlExecutor } from '../auth/postgres-repository';

const DEFAULT_DB_BROKER_URL = 'https://sjgwesmmpegtzsqqqhvd.supabase.co/functions/v1/prodx-db-broker';

// Vercel's deployment target is authoritative for production routing. NODE_ENV may
// be overridden by a project variable (it is currently "test" in Production), which
// must not silently route the production database through DATABASE_URL.
const shouldResolveProductionDatabaseUrl = (): boolean =>
  process.env.VERCEL_ENV === 'production';

const shouldUseProductionTls = (): boolean =>
  process.env.VERCEL_ENV === 'production' || process.env.NODE_ENV === 'production';

export type ProductionDatabaseTarget = 'supabase_session_pooler' | 'supabase_direct' | 'other' | 'invalid';

export const classifyProductionDatabaseTarget = (databaseUrl: string): ProductionDatabaseTarget => {
  try {
    const hostname = new URL(databaseUrl).hostname;
    if (hostname === 'aws-0-ap-northeast-1.pooler.supabase.com') return 'supabase_session_pooler';
    if (hostname === 'db.sjgwesmmpegtzsqqqhvd.supabase.co') return 'supabase_direct';
    return 'other';
  } catch {
    return 'invalid';
  }
};

export const resolveProductionDatabaseUrl = async (
  vercelOidcToken?: string,
): Promise<string> => {
  if (!shouldResolveProductionDatabaseUrl()) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL is required to create the PostgreSQL pool.');
    }
    return connectionString;
  }

  const oidcToken = vercelOidcToken ?? process.env.VERCEL_OIDC_TOKEN;
  if (!oidcToken) {
    throw new Error('Vercel OIDC token is required to resolve the production PostgreSQL connection.');
  }

  const brokerUrl = process.env.PRODX_DB_BROKER_URL ?? DEFAULT_DB_BROKER_URL;
  const response = await fetch(brokerUrl, {
    method: 'GET',
    headers: {
      authorization: `Bearer ${oidcToken}`,
      accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Production database broker rejected the request with HTTP ${response.status}.`);
  }

  const payload = await response.json() as { databaseUrl?: unknown };
  if (typeof payload.databaseUrl !== 'string' || payload.databaseUrl.length === 0) {
    throw new Error('Production database broker returned no database URL.');
  }

  const target = classifyProductionDatabaseTarget(payload.databaseUrl);
  if (target !== 'supabase_session_pooler' && target !== 'supabase_direct') {
    // Do not let a stale private-network DATABASE_URL (e.g. a Railway-only host)
    // silently become the production authentication database.
    throw new Error('Production database broker returned an unsupported database target.');
  }

  return payload.databaseUrl;
};

export const createPostgresPool = (config: PoolConfig = {}): Pool => {
  const connectionString = config.connectionString ?? process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is required to create the PostgreSQL pool.');
  }

  return new Pool({
    ...config,
    connectionString,
    max: config.max ?? (process.env.VERCEL ? 1 : 10),
    ssl: config.ssl ?? (shouldUseProductionTls() ? { rejectUnauthorized: true } : undefined),
  });
};

export const createProductionPostgresPool = async (
  config: PoolConfig = {},
  vercelOidcToken?: string,
): Promise<Pool> => {
  const connectionString = config.connectionString ?? await resolveProductionDatabaseUrl(vercelOidcToken);
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
