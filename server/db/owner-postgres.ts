import { Pool, type PoolConfig } from 'pg';

let ownerPool: Pool | undefined;

export const resolveOwnerDatabaseUrl = (
  rawUrl: string | undefined = process.env.OWNER_DATABASE_URL,
): string => {
  const value = rawUrl?.trim();
  if (!value) throw new Error('OWNER_DATABASE_URL is required for Owner Console database access.');
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error('OWNER_DATABASE_URL must be a valid PostgreSQL connection URL.');
  }
  if (parsed.protocol !== 'postgres:' && parsed.protocol !== 'postgresql:') {
    throw new Error('OWNER_DATABASE_URL must use the PostgreSQL protocol.');
  }
  if (!parsed.hostname || !parsed.username || !parsed.pathname || parsed.pathname === '/') {
    throw new Error('OWNER_DATABASE_URL must be a valid PostgreSQL connection URL including host, user, and database name.');
  }
  return value;
};

export const createOwnerPostgresPool = (
  config: PoolConfig = {},
  rawUrl: string | undefined = process.env.OWNER_DATABASE_URL,
): Pool => {
  const connectionString = resolveOwnerDatabaseUrl(rawUrl);
  return new Pool({
    ...config,
    connectionString,
    max: config.max ?? (process.env.VERCEL ? 1 : 5),
    ssl: config.ssl ?? (process.env.NODE_ENV === 'production' ? { rejectUnauthorized: true } : undefined),
    application_name: config.application_name ?? 'prodx-owner-console',
  });
};

export const getOwnerPostgresPool = (): Pool => {
  if (!ownerPool) ownerPool = createOwnerPostgresPool();
  return ownerPool;
};

export const closeOwnerPostgresPool = async (): Promise<void> => {
  const current = ownerPool;
  ownerPool = undefined;
  if (current) await current.end();
};
