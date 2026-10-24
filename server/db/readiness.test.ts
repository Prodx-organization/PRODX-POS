import assert from 'node:assert/strict';
import test from 'node:test';
import type { SqlExecutor } from '../auth/postgres-repository';
import { createPostgresReadinessCheck } from './readiness';

test('PostgreSQL readiness probes the same SQL executor used by production routes', async () => {
  const queries: string[] = [];
  const sql = {
    async query(query: string) {
      queries.push(query);
      return [{ ok: 1 }];
    },
  } as unknown as SqlExecutor;

  await createPostgresReadinessCheck(sql)();
  assert.deepEqual(queries, ['SELECT 1 AS ok']);
});

test('PostgreSQL readiness emits safe diagnostics without leaking the original error message', async () => {
  const sql = {
    async query() {
      throw Object.assign(new Error('getaddrinfo ENOTFOUND private-db-host.example'), {
        code: 'ENOTFOUND',
        syscall: 'getaddrinfo',
        port: 5432,
      });
    },
  } as unknown as SqlExecutor;

  await assert.rejects(createPostgresReadinessCheck(sql)(), (error: unknown) => {
    assert.ok(error instanceof Error);
    assert.equal(error.message, 'PostgreSQL readiness query failed.');
    assert.equal(error.message.includes('private-db-host.example'), false);
    assert.equal((error as Error & { stage?: string }).stage, 'database_query');
    assert.equal((error as Error & { code?: string }).code, 'ENOTFOUND');
    assert.equal((error as Error & { syscall?: string }).syscall, 'getaddrinfo');
    assert.equal((error as Error & { port?: number }).port, 5432);
    return true;
  });
});

test('PostgreSQL readiness discards unexpected diagnostic fields', async () => {
  const sql = {
    async query() {
      throw Object.assign(new Error('must not be forwarded'), {
        code: 'BAD CODE WITH SPACES',
        syscall: 'exec',
        port: 70000,
        hostname: 'private-db-host.example',
      });
    },
  } as unknown as SqlExecutor;

  await assert.rejects(createPostgresReadinessCheck(sql)(), (error: unknown) => {
    assert.ok(error instanceof Error);
    assert.equal(error.message, 'PostgreSQL readiness query failed.');
    assert.equal((error as Error & { code?: string }).code, undefined);
    assert.equal((error as Error & { syscall?: string }).syscall, undefined);
    assert.equal((error as Error & { port?: number }).port, undefined);
    assert.equal('hostname' in error, false);
    return true;
  });
});
