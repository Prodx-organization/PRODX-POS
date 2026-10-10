import assert from 'node:assert/strict';
import test from 'node:test';
import { createProductionAuthApi, parseSessionContext } from './productionAuthApi';

const validSession = {
  organization: { id: 'org-1' },
  currentStore: { id: 'store-1' },
  currentUser: { id: 'user-1', role: 'cashier', permissions: [] },
  token: 'server-issued-token',
  expiresAt: new Date(Date.now() + 60_000).toISOString(),
};

test('production auth refuses to initialize without an API base URL', () => {
  assert.throws(() => createProductionAuthApi('   ', fetch), /VITE_AUTH_API_BASE_URL/);
});

test('login rejects an HTML/empty SPA fallback even when the HTTP status is 200', async () => {
  const api = createProductionAuthApi('https://api.example.test', async () =>
    new Response('<!doctype html><html></html>', { status: 200, headers: { 'content-type': 'text/html' } }),
  );
  await assert.rejects(
    api.login({
      organizationSlug: 'org',
      storeCode: 'store',
      registerId: 'register',
      emailOrPin: 'new-user@example.test',
      passwordOrPin: 'never-registered',
    }),
    /invalid session response/i,
  );
});

test('login rejects a success-shaped response without a server-issued token', async () => {
  const api = createProductionAuthApi('https://api.example.test', async () =>
    Response.json({ ...validSession, token: '' }, { status: 200 }),
  );
  await assert.rejects(
    api.login({
      organizationSlug: 'org',
      storeCode: 'store',
      registerId: 'register',
      emailOrPin: 'new-user@example.test',
      passwordOrPin: 'never-registered',
    }),
    /invalid session response/i,
  );
});

test('login accepts a structurally valid server session only', async () => {
  const api = createProductionAuthApi('https://api.example.test', async (input) => {
    assert.equal(String(input), 'https://api.example.test/auth/login');
    return Response.json(validSession, { status: 200 });
  });
  const session = await api.login({
    organizationSlug: 'org',
    storeCode: 'store',
    registerId: 'register',
    emailOrPin: 'known-user@example.test',
    passwordOrPin: 'valid-secret',
  });
  assert.equal(session.token, 'server-issued-token');
});

test('session parser fails closed for missing identity and authorization fields', () => {
  assert.throws(() => parseSessionContext({ ...validSession, currentUser: { id: 'user-1' } }), /invalid session response/i);
  assert.throws(() => parseSessionContext(null), /invalid session response/i);
});
