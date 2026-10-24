import assert from 'node:assert/strict';
import test from 'node:test';
import { createApp } from './createApp';
import { registerOwnerSessionRoute } from './owner-session-route';

const identity = { userId: '9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d', email: 'prodx.owner@gmail.com' };
const start = async (app: ReturnType<typeof createApp>) => {
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
const makeApp = (verifyToken: (token: string) => Promise<typeof identity | null>, getRole: (userId: string) => Promise<string | null>) =>
  createApp({
    authenticateRequest: () => null,
    configurePublicRoutes: app => registerOwnerSessionRoute(app, { verifyToken, getRole }),
  });

test('Owner session endpoint rejects missing or invalid bearer token', async () => {
  const server = await start(makeApp(async () => null, async () => 'owner'));
  try {
    const missing = await fetch(server.url + '/api/v1/owner/session');
    assert.equal(missing.status, 401);
    const invalid = await fetch(server.url + '/api/v1/owner/session', { headers: { authorization: 'Bearer bad' } });
    assert.equal(invalid.status, 401);
  } finally { await server.close(); }
});

test('Owner session endpoint requires the designated owner email and authoritative owner role', async () => {
  const wrongEmail = await start(makeApp(async () => ({ ...identity, email: 'other@example.com' }), async () => 'owner'));
  try {
    const response = await fetch(wrongEmail.url + '/api/v1/owner/session', { headers: { authorization: 'Bearer valid' } });
    assert.equal(response.status, 403);
  } finally { await wrongEmail.close(); }
  const wrongRole = await start(makeApp(async () => identity, async () => 'admin'));
  try {
    const response = await fetch(wrongRole.url + '/api/v1/owner/session', { headers: { authorization: 'Bearer valid' } });
    assert.equal(response.status, 403);
  } finally { await wrongRole.close(); }
});

test('Owner session endpoint authorizes only verified designated owner and returns no database details', async () => {
  const server = await start(makeApp(async token => token === 'valid' ? identity : null, async userId => userId === identity.userId ? 'owner' : null));
  try {
    const response = await fetch(server.url + '/api/v1/owner/session', { headers: { authorization: 'Bearer valid' } });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { authorized: true, userId: identity.userId, email: identity.email, role: 'owner' });
    assert.equal(response.headers.get('cache-control'), 'no-store');
  } finally { await server.close(); }
});

test('Owner session endpoint fails closed when database authorization is unavailable', async () => {
  const server = await start(makeApp(async () => identity, async () => { throw new Error('secret db detail'); }));
  try {
    const response = await fetch(server.url + '/api/v1/owner/session', { headers: { authorization: 'Bearer valid' } });
    assert.equal(response.status, 503);
    assert.equal(JSON.stringify(await response.json()).includes('secret db detail'), false);
  } finally { await server.close(); }
});
