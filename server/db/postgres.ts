import { Pool, type PoolConfig, type QueryResultRow } from 'pg';
import type { SqlExecutor } from '../auth/postgres-repository';

const DEFAULT_DB_BROKER_URL = 'https://sjgwesmmpegtzsqqqhvd.supabase.co/functions/v1/prodx-db-broker';

const shouldResolveProductionDatabaseUrl = (): boolean =>
  process.env.VERCEL === '1' && process.env.NODE_ENV === 'production';

export const resolveProductionDatabaseUrl = async (): Promise<string> => {
  if (!shouldResolveProductionDatabaseUrl()) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL is required to create the PostgreSQL pool.');
    }
    return connectionString;
  }

  const oidcToken = process.env.VERCEL_OIDC_TOKEN;
  if (!oidcToken) {
    throw new Error('VERCEL_OIDC_TOKEN is required to resolve the production PostgreSQL connection.');
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
    ssl: config.ssl ?? (process.env.NODE_ENV === 'production' ? { rejectUnauthorized: true } : undefined),
  });
};

export const createProductionPostgresPool = async (config: PoolConfig = {}): Promise<Pool> => {
  const connectionString = config.connectionString ?? await resolveProductionDatabaseUrl();
  return createPostgresPool({ ...config, connectionString });
};

export const asSqlExecutor = (pool: Pick<Pool, 'query'>): SqlExecutor => ({
  async query<T extends Record<string, unknown>>(sql: string, parameters: readonly unknown[] = []) {
    const result = await pool.query<T & QueryResultRow>(sql, [...parameters]);
    return result.rows;
  },
});
