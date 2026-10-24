import assert from 'node:assert/strict';
import test from 'node:test';
import type { Express } from 'express';
import express from 'express';
import type { Pool } from 'pg';
import { registerOwnerRoutes, type OwnerIdentity } from './owner-route';

const start = async (app: Express) => {
  const server = await new Promise<import('node:http').Server>((resolve) => {
    const instance = app.listen(0, () => resolve(instance));
  });
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  return {
    url: `http://127.0.0.1:${address.port}`,
    close: () => new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())),
  };
};

const owner: OwnerIdentity = { userId: '11111111-1111-4111-8111-111111111111', email: 'prodx.owner@gmail.com' };

const fakePool = (role: string | undefined, onQuery?: (sql: string, values: unknown[]) => void) => ({
  query: async (sql: string, values: unknown[]) => {
    onQuery?.(sql, values);
    return { rows: role ? [{ role }] : [] };
  },
}) as unknown as Pick<Pool, 'query'>;

test('Owner endpoint rejects missing bearer token without querying Owner database', async () => {
  let queried = false;
  const app = express();
  registerOwnerRoutes(app, { getPool: () => { queried = true; return fakePool('owner'); }, verifyToken: async () => owner });
  const server = await start(app);
  try {
    const response = await fetch(server.url + '/api/v1/owner/me');
    assert.equal(response.status, 401);
    assert.equal(queried, false);
  } finally {
    await server.close();
  }
});

test('Owner endpoint validates identity and authoritative role using the Owner database', async () => {
  let queryText = '';
  let queryValues: unknown[] = [];
  const app = express();
  registerOwnerRoutes(app, {
    getPool: () => fakePool('owner', (sql, values) => { queryText = sql; queryValues = values; }),
    verifyToken: async token => token === 'valid-token' ? owner : null,
  });
  const server = await start(app);
  try {
    const response = await fetch(server.url + '/api/v1/owner/me', { headers: { authorization: 'Bearer valid-token' } });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { userId: owner.userId, email: owner.email, role: 'owner' });
    assert.match(queryText, /FROM public\.user_roles WHERE user_id = \$1/);
    assert.deepEqual(queryValues, [owner.userId]);
    assert.equal(response.headers.get('cache-control'), 'no-store');
  } finally {
    await server.close();
  }
});

test('Owner endpoint denies a valid token without owner role', async () => {
  const app = express();
  registerOwnerRoutes(app, { getPool: () => fakePool('admin'), verifyToken: async () => owner });
  const server = await start(app);
  try {
    const response = await fetch(server.url + '/api/v1/owner/me', { headers: { authorization: 'Bearer valid-token' } });
    assert.equal(response.status, 403);
    assert.equal((await response.json()).error.code, 'FORBIDDEN');
  } finally {
    await server.close();
  }
});

test('Owner endpoint denies identities other than the designated owner before database access', async () => {
  let queried = false;
  const app = express();
  registerOwnerRoutes(app, {
    getPool: () => { queried = true; return fakePool('owner'); },
    verifyToken: async () => ({ ...owner, email: 'other@example.com' }),
  });
  const server = await start(app);
  try {
    const response = await fetch(server.url + '/api/v1/owner/me', { headers: { authorization: 'Bearer valid-token' } });
    assert.equal(response.status, 403);
    assert.equal(queried, false);
  } finally {
    await server.close();
  }
});

test('Owner endpoint fails closed when the Owner database is unavailable', async () => {
  const app = express();
  registerOwnerRoutes(app, {
    getPool: () => ({ query: async () => { throw new Error('private connection detail'); } }) as unknown as Pick<Pool, 'query'>,
    verifyToken: async () => owner,
  });
  const server = await start(app);
  try {
    const response = await fetch(server.url + '/api/v1/owner/me', { headers: { authorization: 'Bearer valid-token' } });
    assert.equal(response.status, 503);
    assert.equal((await response.text()).includes('private connection detail'), false);
  } finally {
    await server.close();
  }
});
