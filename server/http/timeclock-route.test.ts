import assert from 'node:assert/strict';
import http from 'node:http';
import test from 'node:test';
import { createApp } from './createApp';
import { registerTimeclockRoute } from './timeclock-route';
import type { TransactionalSqlExecutor } from '../db/transaction';

const principal = {
  organizationId: 'org-1',
  storeId: 'store-1',
  userId: 'operator-1',
};

const makeDb = (queries: { count: number }): TransactionalSqlExecutor => ({
  query: (async () => {
    queries.count += 1;
    throw new Error('database should not be reached for this request');
  }) as TransactionalSqlExecutor['query'],
  transaction: async () => {
    queries.count += 1;
    throw new Error('database should not be reached for this request');
  },
});

const withServer = async (
  authorizeRequest: (context: unknown, permission: string) => boolean,
  callback: (baseUrl: string, queries: { count: number }) => Promise<void>,
) => {
  const queries = { count: 0 };
  const app = createApp({
    authenticateRequest: async () => principal,
    authorizeRequest,
    configureRoutes: (configuredApp) => registerTimeclockRoute(configuredApp, makeDb(queries)),
  });
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  assert.ok(address && typeof address === 'object');
  try {
    await callback('http://127.0.0.1:' + address.port, queries);
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
};

test('timeclock route validates the request before reaching the database', async () => {
  await withServer(
    (_context, permission) => permission === 'timeclock.use',
    async (baseUrl, queries) => {
      const response = await fetch(baseUrl + '/api/v1/timeclock/clock-in', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ pin: '1234' }),
      });
      assert.equal(response.status, 400);
      const body = await response.json() as { error: { code: string } };
      assert.equal(body.error.code, 'INVALID_REQUEST');
      assert.equal(queries.count, 0);
    },
  );
});

test('timeclock route enforces permission before reaching the database', async () => {
  await withServer(
    () => false,
    async (baseUrl, queries) => {
      const response = await fetch(baseUrl + '/api/v1/timeclock/clock-in', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ pin: '1234', idempotencyKey: 'clock-in-1' }),
      });
      assert.equal(response.status, 403);
      const body = await response.json() as { error: { code: string } };
      assert.equal(body.error.code, 'FORBIDDEN');
      assert.equal(queries.count, 0);
    },
  );
});
