import assert from 'node:assert/strict';
import test from 'node:test';
import { createPostgresReadinessCheck } from './postgres-readiness';

test('PostgreSQL readiness executes a query against the configured SQL executor', async () => {
  const statements: string[] = [];
  const check = createPostgresReadinessCheck({
    query: async (sql: string) => {
      statements.push(sql);
      return [{ ok: 1 }];
    },
  } as never);

  await check();
  assert.deepEqual(statements, ['SELECT 1 AS ok']);
});

test('PostgreSQL readiness fails closed and tags query failures for safe diagnostics', async () => {
  const failure = Object.assign(new Error('database unavailable'), {
    code: 'ENOTFOUND',
    syscall: 'getaddrinfo',
  });
  const check = createPostgresReadinessCheck({
    query: async () => { throw failure; },
  } as never);

  await assert.rejects(check(), (error: unknown) => {
    assert.equal(error, failure);
    assert.equal((error as { stage?: string }).stage, 'database_query');
    assert.equal((error as { code?: string }).code, 'ENOTFOUND');
    assert.equal((error as { syscall?: string }).syscall, 'getaddrinfo');
    return true;
  });
});
