import assert from 'node:assert/strict';
import test from 'node:test';
import { Pool } from 'pg';
import { createTransactionalPostgresExecutor } from './transaction.ts';
import { runWithRequestContext } from '../http/request-context-storage.ts';

const databaseUrl = process.env.DATABASE_URL;
const shouldRun = Boolean(databaseUrl) && process.env.NODE_ENV !== 'production';

test('transaction-local tenant context is isolated and cleared on pooled connection reuse', { skip: !shouldRun }, async () => {
  const pool = new Pool({ connectionString: databaseUrl, max: 1 });
  const executor = createTransactionalPostgresExecutor(pool);
  const first = {
    requestId: 'tenant-context-integration-a',
    principal: { userId: '00000000-0000-4000-8000-000000000001', organizationId: '00000000-0000-4000-8000-000000000011', storeId: '00000000-0000-4000-8000-000000000021' },
  };
  const second = {
    requestId: 'tenant-context-integration-b',
    principal: { userId: '00000000-0000-4000-8000-000000000002', organizationId: '00000000-0000-4000-8000-000000000012', storeId: '00000000-0000-4000-8000-000000000022' },
  };

  try {
    await runWithRequestContext(first, () => executor.transaction(async (tx) => {
      const result = await tx.query<{ organization_id: string; store_id: string; user_id: string }>(
        `SELECT current_setting('app.organization_id', true) AS organization_id,
                current_setting('app.store_id', true) AS store_id,
                current_setting('app.user_id', true) AS user_id`,
      );
      assert.deepEqual(result.rows[0], {
        organization_id: first.principal.organizationId,
        store_id: first.principal.storeId,
        user_id: first.principal.userId,
      });
    }));

    await runWithRequestContext(second, () => executor.transaction(async (tx) => {
      const result = await tx.query<{ organization_id: string; store_id: string; user_id: string }>(
        `SELECT current_setting('app.organization_id', true) AS organization_id,
                current_setting('app.store_id', true) AS store_id,
                current_setting('app.user_id', true) AS user_id`,
      );
      assert.deepEqual(result.rows[0], {
        organization_id: second.principal.organizationId,
        store_id: second.principal.storeId,
        user_id: second.principal.userId,
      });
    }));

    // max:1 forces the next query to reuse the released client. A local setting
    // from either prior transaction must not remain active on that connection.
    const afterRelease = await pool.query<{ organization_id: string | null; store_id: string | null; user_id: string | null }>(
      `SELECT current_setting('app.organization_id', true) AS organization_id,
              current_setting('app.store_id', true) AS store_id,
              current_setting('app.user_id', true) AS user_id`,
    );
    assert.notEqual(afterRelease.rows[0]?.organization_id, first.principal.organizationId);
    assert.notEqual(afterRelease.rows[0]?.organization_id, second.principal.organizationId);
    assert.notEqual(afterRelease.rows[0]?.store_id, first.principal.storeId);
    assert.notEqual(afterRelease.rows[0]?.store_id, second.principal.storeId);
    assert.notEqual(afterRelease.rows[0]?.user_id, first.principal.userId);
    assert.notEqual(afterRelease.rows[0]?.user_id, second.principal.userId);
  } finally {
    await pool.end();
  }
});
