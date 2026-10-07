import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveProductionDatabaseUrl } from './postgres';

const withEnvironment = async (
  values: Record<string, string | undefined>,
  run: () => Promise<void>,
) => {
  const previous = new Map<string, string | undefined>();
  for (const [key, value] of Object.entries(values)) {
    previous.set(key, process.env[key]);
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }

  try {
    await run();
  } finally {
    for (const [key, value] of previous) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
};

test('resolveProductionDatabaseUrl uses DATABASE_URL outside Vercel production', async () => {
  await withEnvironment(
    { VERCEL: undefined, NODE_ENV: 'test', DATABASE_URL: 'postgresql://local.example/prodx' },
    async () => {
      assert.equal(await resolveProductionDatabaseUrl(), 'postgresql://local.example/prodx');
    },
  );
});

test('resolveProductionDatabaseUrl fails closed when Vercel OIDC is unavailable', async () => {
  await withEnvironment(
    { VERCEL: '1', NODE_ENV: 'production', DATABASE_URL: 'postgresql://legacy.example/prodx', VERCEL_OIDC_TOKEN: undefined },
    async () => {
      await assert.rejects(
        resolveProductionDatabaseUrl(),
        /VERCEL_OIDC_TOKEN is required/,
      );
    },
  );
});

test('resolveProductionDatabaseUrl resolves the production database through the OIDC broker', async () => {
  const originalFetch = globalThis.fetch;
  let requestedUrl = '';
  let requestedAuthorization = '';

  globalThis.fetch = async (input, init) => {
    requestedUrl = String(input);
    requestedAuthorization = new Headers(init?.headers).get('authorization') ?? '';
    return new Response(JSON.stringify({ databaseUrl: 'postgresql://supabase.example/prodx' }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };

  try {
    await withEnvironment(
      {
        VERCEL: '1',
        NODE_ENV: 'production',
        DATABASE_URL: 'postgresql://legacy.example/prodx',
        VERCEL_OIDC_TOKEN: 'vercel-oidc-token',
        PRODX_DB_BROKER_URL: 'https://broker.example/prodx-db',
      },
      async () => {
        assert.equal(await resolveProductionDatabaseUrl(), 'postgresql://supabase.example/prodx');
        assert.equal(requestedUrl, 'https://broker.example/prodx-db');
        assert.equal(requestedAuthorization, 'Bearer vercel-oidc-token');
      },
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('resolveProductionDatabaseUrl rejects a broker failure', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response('unavailable', { status: 503 });

  try {
    await withEnvironment(
      {
        VERCEL: '1',
        NODE_ENV: 'production',
        DATABASE_URL: 'postgresql://legacy.example/prodx',
        VERCEL_OIDC_TOKEN: 'vercel-oidc-token',
      },
      async () => {
        await assert.rejects(
          resolveProductionDatabaseUrl(),
          /broker rejected the request with HTTP 503/,
        );
      },
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
