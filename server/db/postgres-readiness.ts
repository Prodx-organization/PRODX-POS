import type { SqlExecutor } from '../auth/postgres-repository.ts';

/**
 * PostgreSQL is the authoritative store for transactional POS state.
 * Supplemental stores must never make the service ready when PostgreSQL is down.
 */
export const createPostgresReadinessCheck = (sql: Pick<SqlExecutor, 'query'>) => async (): Promise<void> => {
  try {
    await sql.query<{ ok: number }>('SELECT 1 AS ok');
  } catch (error: unknown) {
    const failure = error instanceof Error ? error : new Error('PostgreSQL readiness query failed.');
    Object.assign(failure, { stage: 'database_query' });
    throw failure;
  }
};
