import { Pool, type PoolConfig } from 'pg';

const OWNER_PROJECT_HOST = 'db.bbxoywnlayduqbrjeixj.supabase.co';

export const resolveOwnerDatabaseUrl = (
  rawUrl: string | undefined = process.env.OWNER_DATABASE_URL,
): string => {
  const value = rawUrl?.trim();
  if (!value) {
    throw new Error('OWNER_DATABASE_URL is required for Owner Console database access.');
  }

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error('OWNER_DATABASE_URL must be a valid PostgreSQL connection URL.');
  }

  if (parsed.protocol !== 'postgres:' && parsed.protocol !== 'postgresql:') {
    throw new Error('OWNER_DATABASE_URL must use the PostgreSQL protocol.');
  }
  if (!parsed.hostname || !parsed.username || !parsed.password || !parsed.pathname || parsed.pathname === '/') {
    throw new Error('OWNER_DATABASE_URL must include a host, username, password, and database name.');
  }
  if (parsed.hostname !== OWNER_PROJECT_HOST && !parsed.hostname.endsWith('.pooler.supabase.com')) {
    throw new Error('OWNER_DATABASE_URL must point to the isolated Owner Supabase PostgreSQL endpoint.');
  }

  return value;
};

export const createOwnerPostgresPool = (
  rawUrl: string | undefined = process.env.OWNER_DATABASE_URL,
  config: PoolConfig = {},
): Pool => {
  const connectionString = resolveOwnerDatabaseUrl(rawUrl);
  return new Pool({
    ...config,
    connectionString,
    max: config.max ?? (process.env.VERCEL ? 1 : 5),
    ssl: config.ssl ?? { rejectUnauthorized: true },
    application_name: config.application_name ?? 'prodx-owner-console',
  });
};

let ownerPool: Pool | undefined;

/** A dedicated pool for Owner Console; it never reads or falls back to DATABASE_URL. */
export const getOwnerPostgresPool = (): Pool => {
  if (!ownerPool) ownerPool = createOwnerPostgresPool();
  return ownerPool;
};
