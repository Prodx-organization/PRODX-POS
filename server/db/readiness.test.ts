import assert from 'node:assert/strict';
import testRunner from 'node:test';
import { createPostgresReadinessCheck } from './readiness.ts';

testRunner('PostgreSQL readiness queries the configured executor even when DATABASE_URL is absent', async () => {
  const previousDatabaseUrl = process.env.DATABASE_URL;
  delete process.env.DATABASE_URL;
  let calls = 0;

  try {
    const readinessCheck = createPostgresReadinessCheck({
      async query<T extends Record<string, unknown>>(sql: string) {
        calls += 1;
        assert.equal(sql, 'SELECT 1 AS ok');
        return [{ ok: 1 }] as unknown as readonly T[];
      },
    });

    await readinessCheck();
    assert.equal(calls, 1);
  } finally {
    if (previousDatabaseUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = previousDatabaseUrl;
  }
});

testRunner('PostgreSQL readiness fails closed and preserves only sanitized diagnostic fields', async () => {
  const readinessCheck = createPostgresReadinessCheck({
    async query<T extends Record<string, unknown>>() {
      throw Object.assign(new Error('lookup failed at private-db.example'), {
        code: 'ENOTFOUND',
        syscall: 'getaddrinfo',
        hostname: 'private-db.example',
        port: 5432,
      });
    },
  });

  await assert.rejects(readinessCheck, (error: unknown) => {
    assert.ok(error instanceof Error);
    assert.equal(error.message, 'PostgreSQL readiness query failed.');
    assert.equal((error as Error & { code?: string }).code, 'ENOTFOUND');
    assert.equal((error as Error & { syscall?: string }).syscall, 'getaddrinfo');
    assert.equal((error as Error & { port?: number }).port, 5432);
    assert.equal('hostname' in error, false);
    assert.equal(JSON.stringify(error).includes('private-db.example'), false);
    return true;
  });
});
