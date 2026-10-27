import assert from 'node:assert/strict';
import test from 'node:test';
import type { IAuthApi } from './types';
import type { getSupabasePosAuthClient } from '../lib/supabasePosAuth';
import { createSupabaseAuthApi } from './supabaseAuthApi';

type Client = ReturnType<typeof getSupabasePosAuthClient>;
const loginRequest = {
  organizationSlug: 'demo-org',
  storeCode: 'STORE-01',
  registerId: 'ADMIN-CONSOLE',
  emailOrPin: 'admin@example.test',
  passwordOrPin: 'test-password',
};
const session = { token: 'pos-session-token', currentUser: { id: 'user-1', role: 'admin' } };

const makeClient = () => {
  const calls: { signIn?: unknown; signOut: unknown[] } = { signOut: [] };
  const client = {
    auth: {
      signInWithPassword: async (input: unknown) => {
        calls.signIn = input;
        return { data: { session: { access_token: 'supabase-access-token' } }, error: null };
      },
      signOut: async (input?: unknown) => {
        calls.signOut.push(input);
        return { error: null };
      },
    },
  } as unknown as Client;
  return { client, calls };
};

const fallbackApi = (overrides: Partial<IAuthApi> = {}): IAuthApi => ({
  login: async () => session as never,
  logout: async () => undefined,
  verifySession: async () => null,
  getStores: async () => [],
  forgotPin: async () => undefined,
  ...overrides,
});

test('Supabase email login exchanges the access token and forwards POS scope', async () => {
  const { client, calls } = makeClient();
  let requestBody: Record<string, unknown> | undefined;
  let authorization: string | null = null;
  const fetcher: typeof fetch = async (_input, init) => {
    requestBody = JSON.parse(String(init?.body));
    authorization = new Headers(init?.headers).get('authorization');
    return new Response(JSON.stringify(session), { status: 200, headers: { 'content-type': 'application/json' } });
  };

  const result = await createSupabaseAuthApi({ getClient: () => client, fetcher }).login(loginRequest);

  assert.deepEqual(result, session);
  assert.equal(authorization, 'Bearer supabase-access-token');
  assert.deepEqual(requestBody, {
    organizationSlug: 'demo-org',
    storeCode: 'STORE-01',
    registerId: 'ADMIN-CONSOLE',
  });
  assert.deepEqual(calls.signIn, { email: 'admin@example.test', password: 'test-password' });
});

test('failed POS session exchange clears only the local Supabase session', async () => {
  const { client, calls } = makeClient();
  const fetcher: typeof fetch = async () => new Response(JSON.stringify({ error: { message: 'Scope rejected' } }), { status: 401 });

  await assert.rejects(createSupabaseAuthApi({ getClient: () => client, fetcher }).login(loginRequest), /Scope rejected/);
  assert.deepEqual(calls.signOut, [{ scope: 'local' }]);
});

test('PIN identities continue through the server-authoritative PostgreSQL auth API', async () => {
  let called = false;
  const api = createSupabaseAuthApi({
    getClient: () => { throw new Error('Supabase client must not be initialized for a PIN identity'); },
    fetcher: async () => { throw new Error('Network must not be called for a PIN identity'); },
    fallbackApi: fallbackApi({ login: async (request) => { called = true; assert.equal(request.emailOrPin, '123456'); return session as never; } }),
  });

  assert.deepEqual(await api.login({ ...loginRequest, emailOrPin: '123456' }), session);
  assert.equal(called, true);
});

test('logout clears server session and only the local Supabase session when configured', async () => {
  const { client, calls } = makeClient();
  const requests: string[] = [];
  const fetcher: typeof fetch = async (input) => {
    requests.push(String(input));
    return new Response(null, { status: 204 });
  };

  await createSupabaseAuthApi({ getClient: () => client, fetcher }).logout('pos-session-token');

  assert.deepEqual(requests, ['/auth/logout']);
  assert.deepEqual(calls.signOut, [{ scope: 'local' }]);
});

test('logout works for PIN-only deployments without initializing Supabase', async () => {
  let logoutCalled = false;
  const api = createSupabaseAuthApi({
    getClient: () => { throw new Error('POS Supabase Auth is not configured.'); },
    fetcher: async () => { logoutCalled = true; return new Response(null, { status: 204 }); },
  });

  await api.logout('pos-session-token');
  assert.equal(logoutCalled, true);
});

test('logout does not hide server-side session revocation failures', async () => {
  const api = createSupabaseAuthApi({
    getClient: () => { throw new Error('must not sign out locally before server revocation succeeds'); },
    fetcher: async () => new Response(JSON.stringify({ error: 'database unavailable' }), { status: 503 }),
  });

  await assert.rejects(api.logout('pos-session-token'), /Authentication logout failed/);
});
