import assert from 'node:assert/strict';
import test from 'node:test';
import { createApp } from './createApp';
import { registerSyncRoute } from './sync-route';
import type { TransactionalSqlExecutor } from '../db/transaction';

const principal = {
  userId: 'user-1',
  organizationId: 'org-1',
  storeId: 'store-1',
  sessionId: 'session-1',
};

const start = async (app: ReturnType<typeof createApp>) => {
  const server = await new Promise<import('node:http').Server>((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    close: () => new Promise<void>((resolve, reject) => server.close((e) => e ? reject(e) : resolve())),
  };
};

const unreachableDb: TransactionalSqlExecutor = {
  query: async () => { throw new Error('database must not be reached'); },
  transaction: async () => { throw new Error('transaction must not be reached'); },
};

test('sync route rejects unsupported outbox command types before database work', async () => {
  const app = createApp({
    authenticateRequest: () => principal,
    authorizeRequest: (_context, permission) => permission === 'pos.sell',
    configureRoutes: (configuredApp) => registerSyncRoute(configuredApp, unreachableDb),
  });
  const server = await start(app);
  try {
    const response = await fetch(`${server.baseUrl}/api/v1/sync/commands`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        item: {
          id: 'outbox-1',
          type: 'shift_movement',
          idempotencyKey: 'sync-1',
          payload: {},
          createdAt: '2026-10-02T00:00:00.000Z',
          attempts: 0,
          syncState: 'queued',
        },
      }),
    });
    assert.equal(response.status, 400);
    assert.equal((await response.json()).error.code, 'SYNC_COMMAND_UNSUPPORTED');
  } finally {
    await server.close();
  }
});

test('sync route rejects idempotency mismatch before database work', async () => {
  const app = createApp({
    authenticateRequest: () => principal,
    authorizeRequest: (_context, permission) => permission === 'pos.sell',
    configureRoutes: (configuredApp) => registerSyncRoute(configuredApp, unreachableDb),
  });
  const server = await start(app);
  try {
    const response = await fetch(`${server.baseUrl}/api/v1/sync/commands`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        item: {
          id: 'outbox-2',
          type: 'order_transaction',
          idempotencyKey: 'sync-2',
          payload: { idempotencyKey: 'different-key' },
          createdAt: '2026-10-02T00:00:00.000Z',
          attempts: 0,
          syncState: 'queued',
        },
      }),
    });
    assert.equal(response.status, 400);
    assert.equal((await response.json()).error.code, 'SYNC_IDEMPOTENCY_KEY_MISMATCH');
  } finally {
    await server.close();
  }
});

test('sync route denies unauthorized access before database work', async () => {
  const app = createApp({
    authenticateRequest: () => principal,
    authorizeRequest: () => false,
    configureRoutes: (configuredApp) => registerSyncRoute(configuredApp, unreachableDb),
  });
  const server = await start(app);
  try {
    const response = await fetch(`${server.baseUrl}/api/v1/sync/commands`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{}',
    });
    assert.equal(response.status, 403);
  } finally {
    await server.close();
  }
});
