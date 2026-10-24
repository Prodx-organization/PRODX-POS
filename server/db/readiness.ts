import type { SqlExecutor } from '../auth/postgres-repository.ts';
import type { ProductionDatabaseTarget } from './postgres.ts';

const ALLOWED_SYSCALLS = new Set(['getaddrinfo', 'connect', 'read', 'write']);

export const createPostgresReadinessCheck = (
  sql: SqlExecutor,
  databaseTarget?: ProductionDatabaseTarget,
) => async (): Promise<void> => {
  try {
    // Query the exact pool used by production routes. Do not gate readiness on
    // DATABASE_URL: production obtains its connection string through the OIDC broker.
    await sql.query<{ ok: number }>('SELECT 1 AS ok');
  } catch (error: unknown) {
    const candidate = error && typeof error === 'object'
      ? error as { code?: unknown; syscall?: unknown; port?: unknown }
      : {};
    const diagnostic = new Error('PostgreSQL readiness query failed.');
    Object.assign(diagnostic, {
      stage: 'database_query',
      ...(databaseTarget ? { databaseTarget } : {}),
      ...(typeof candidate.code === 'string' && /^[A-Z0-9_]{1,40}$/.test(candidate.code)
        ? { code: candidate.code }
        : {}),
      ...(typeof candidate.syscall === 'string' && ALLOWED_SYSCALLS.has(candidate.syscall)
        ? { syscall: candidate.syscall }
        : {}),
      ...(typeof candidate.port === 'number' && Number.isInteger(candidate.port) &&
        candidate.port >= 1 && candidate.port <= 65535
        ? { port: candidate.port }
        : {}),
    });
    throw diagnostic;
  }
};
