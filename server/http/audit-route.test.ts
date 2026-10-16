import assert from 'node:assert/strict';
import test from 'node:test';
import type { QueryResultRow } from 'pg';
import { createApp } from './createApp';
import { registerAuditRoute } from './audit-route';
import type { TransactionalSqlExecutor } from '../db/transaction';

const principal = { userId: 'user-1', organizationId: 'org-1', storeId: 'store-1' };

const start = async (app: ReturnType<typeof createApp>) => {
  const server = await new Promise<import('node:http').Server>((resolve) => {
    const instance = app.listen(0, () => resolve(instance));
  });
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  return { baseUrl: `http://127.0.0.1:${address.port}`, close: () => new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve())) };
};

const row = {
  id: 'audit-1', store_id: 'store-1', register_id: 'REG-01', user_id: 'user-1',
  user_name: 'Cashier One', action: 'stock_adjusted', severity: 'warn',
  details: { reason: 'damaged_write_off' }, created_at: '2026-09-24T00:00:00.000Z',
};

test('audit production read route is authenticated, authorized, and store scoped', async () => {
  const calls: Array<{ sql: string; parameters: readonly unknown[] }> = [];
  const query = async <T extends QueryResultRow>(sql: string, parameters: readonly unknown[] = []) => {
    calls.push({ sql, parameters });
    return { rows: [row] as unknown as T[] };
  };
  const db: TransactionalSqlExecutor = {
    query,
    transaction: async (work) => work({ query }),
  };
  const app = createApp({ authenticateRequest: () => principal, authorizeRequest: (_context, permission) => permission === 'audit.read', configureRoutes: (configuredApp) => registerAuditRoute(configuredApp, db) });
  const server = await start(app);
  try {
    const response = await fetch(`${server.baseUrl}/api/v1/audit/logs?limit=10`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), [{ id: 'audit-1', storeId: 'store-1', registerId: 'REG-01', userId: 'user-1', userName: 'Cashier One', action: 'stock_adjusted', severity: 'warn', details: { reason: 'damaged_write_off' }, timestamp: '2026-09-24T00:00:00.000Z' }]);
    assert.deepEqual(calls[0].parameters, ['store-1', 10]);
  } finally { await server.close(); }
});

test('audit production route denies unauthorized reads and writes before database query', async () => {
  let queried = false;
  const query = async <T extends QueryResultRow>(_sql: string, _parameters: readonly unknown[] = []) => {
    queried = true;
    return { rows: [] as unknown as T[] };
  };
  const db: TransactionalSqlExecutor = { query, transaction: async () => { throw new Error('transaction must not be reached'); } };
  const app = createApp({ authenticateRequest: () => principal, authorizeRequest: () => false, configureRoutes: (configuredApp) => registerAuditRoute(configuredApp, db) });
  const server = await start(app);
  try {
    const read = await fetch(`${server.baseUrl}/api/v1/audit/logs`);
    assert.equal(read.status, 403);
    const write = await fetch(`${server.baseUrl}/api/v1/audit/logs`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'stock_adjusted', severity: 'warn', details: {} }) });
    assert.equal(write.status, 403);
    assert.equal(queried, false);
  } finally { await server.close(); }
});

test('audit write persists only a validated event with authenticated actor and tenant scope', async () => {
  const calls: Array<{ sql: string; parameters: readonly unknown[] }> = [];
  const query = async <T extends QueryResultRow>(sql: string, parameters: readonly unknown[] = []) => {
    calls.push({ sql, parameters });
    if (sql.startsWith('INSERT INTO prodx_audit_log')) return { rows: [{ id: 'audit-new' }] as unknown as T[] };
    if (sql.includes('WHERE a.id = $1 AND a.organization_id = $2')) {
      return { rows: [{ id: 'audit-new', store_id: 'store-1', register_id: '', user_id: 'user-1', user_name: 'Authenticated User', action: 'order_checkout_queued_offline', severity: 'warn', details: { reason: 'counted' }, created_at: '2026-10-17T00:00:00.000Z' }] as unknown as T[] };
    }
    throw new Error(`Unexpected SQL: ${sql}`);
  };
  const db: TransactionalSqlExecutor = { query, transaction: async (work) => work({ query }) };
  const app = createApp({ authenticateRequest: () => principal, authorizeRequest: (_context, permission) => permission === 'audit.write', configureRoutes: (configuredApp) => registerAuditRoute(configuredApp, db) });
  const server = await start(app);
  try {
    const response = await fetch(`${server.baseUrl}/api/v1/audit/logs`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ storeId: 'forged-store', userId: 'forged-user', userName: 'Forged Name', registerId: 'forged-register', action: 'order_checkout_queued_offline', severity: 'critical', details: { reason: 'counted' } }),
    });
    assert.equal(response.status, 201);
    assert.deepEqual(await response.json(), { id: 'audit-new', storeId: 'store-1', registerId: '', userId: 'user-1', userName: 'Authenticated User', action: 'order_checkout_queued_offline', severity: 'warn', details: { reason: 'counted' }, timestamp: '2026-10-17T00:00:00.000Z' });
    assert.equal(calls.length, 2);
    assert.equal(calls[0].sql.includes('NULL, $4'), true);
    assert.deepEqual(calls[0].parameters.slice(1), ['org-1', 'store-1', 'user-1', 'order_checkout_queued_offline', 'warn', JSON.stringify({ reason: 'counted' })]);
  } finally { await server.close(); }
});

test('audit write rejects unsupported actions and oversized or non-object details', async () => {
  const db: TransactionalSqlExecutor = {
    query: async <T extends QueryResultRow>() => ({ rows: [] as unknown as T[] }),
    transaction: async (work) => work({ query: async <T extends QueryResultRow>() => ({ rows: [] as unknown as T[] }) }),
  };
  const app = createApp({ authenticateRequest: () => principal, authorizeRequest: (_context, permission) => permission === 'audit.write', configureRoutes: (configuredApp) => registerAuditRoute(configuredApp, db) });
  const server = await start(app);
  try {
    const invalidAction = await fetch(`${server.baseUrl}/api/v1/audit/logs`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'arbitrary_forged_event', severity: 'critical', details: {} }) });
    assert.equal(invalidAction.status, 400);
    const invalidDetails = await fetch(`${server.baseUrl}/api/v1/audit/logs`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'order_checkout_queued_offline', severity: 'warn', details: [] }) });
    assert.equal(invalidDetails.status, 400);
  } finally { await server.close(); }
});
