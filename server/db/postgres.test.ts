import assert from 'node:assert/strict';
import test from 'node:test';
import { classifyProductionDatabaseTarget, createProductionPostgresPool, resolveConfiguredDatabaseUrl, resolveProductionDatabaseUrl } from './postgres';

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

test('classifies production database targets without returning or logging hostnames', () => {
  assert.equal(classifyProductionDatabaseTarget('postgresql://user:secret@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres'), 'supabase_session_pooler');
  assert.equal(classifyProductionDatabaseTarget('postgresql://user:secret@db.bbxoywnlayduqbrjeixj.supabase.co:5432/postgres'), 'supabase_direct');
  assert.equal(classifyProductionDatabaseTarget('postgresql://user:secret@db.example.internal:5432/postgres'), 'other');
  assert.equal(classifyProductionDatabaseTarget('not a database URL'), 'invalid');
});

test('resolveProductionDatabaseUrl uses DATABASE_URL outside Vercel production', async () => {
  await withEnvironment(
    { VERCEL: undefined, NODE_ENV: 'test', DATABASE_URL: 'postgresql://local.example/prodx' },
    async () => {
      assert.equal(await resolveProductionDatabaseUrl(), 'postgresql://local.example/prodx');
    },
  );
});

test('resolveProductionDatabaseUrl fails closed when no Vercel runtime token is available', async () => {
  await withEnvironment(
    { VERCEL: '1', NODE_ENV: 'production', DATABASE_URL: 'postgresql://legacy.example/prodx', VERCEL_OIDC_TOKEN: undefined },
    async () => {
      await assert.rejects(
        resolveProductionDatabaseUrl(),
        /Vercel OIDC token is required/,
      );
    },
  );
});

test('resolveProductionDatabaseUrl uses the Vercel request token instead of DATABASE_URL', async () => {
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
        VERCEL_OIDC_TOKEN: undefined,
        PRODX_DB_BROKER_URL: 'https://broker.example/prodx-db',
      },
      async () => {
        assert.equal(
          await resolveProductionDatabaseUrl('request-oidc-token'),
          'postgresql://supabase.example/prodx',
        );
        assert.equal(requestedUrl, 'https://broker.example/prodx-db');
        assert.equal(requestedAuthorization, 'Bearer request-oidc-token');
      },
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('resolveProductionDatabaseUrl falls back to VERCEL_OIDC_TOKEN for local tooling', async () => {
  const originalFetch = globalThis.fetch;
  let requestedAuthorization = '';

  globalThis.fetch = async (_input, init) => {
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
        VERCEL_OIDC_TOKEN: 'environment-oidc-token',
        PRODX_DB_BROKER_URL: 'https://broker.example/prodx-db',
      },
      async () => {
        assert.equal(await resolveProductionDatabaseUrl(), 'postgresql://supabase.example/prodx');
        assert.equal(requestedAuthorization, 'Bearer environment-oidc-token');
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
        VERCEL_OIDC_TOKEN: undefined,
      },
      async () => {
        await assert.rejects(
          resolveProductionDatabaseUrl('request-oidc-token'),
          /broker rejected the request with HTTP 503/,
        );
      },
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('resolveConfiguredDatabaseUrl preserves valid URLs and rejects placeholder strings in Vercel production', async () => {
  assert.equal(resolveConfiguredDatabaseUrl('postgresql://local.example/prodx'), 'postgresql://local.example/prodx');
  await withEnvironment(
    { VERCEL: '1', NODE_ENV: 'production' },
    async () => {
      assert.equal(resolveConfiguredDatabaseUrl('postgresql://...'), undefined);
      assert.equal(resolveConfiguredDatabaseUrl('   '), undefined);
    },
  );
});

test('production database broker defaults to the sole PRODX-POS Supabase project', async () => {
  const originalFetch = globalThis.fetch;
  let requestedUrl = '';
  globalThis.fetch = async (input) => {
    requestedUrl = String(input);
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
        DATABASE_URL: undefined,
        VERCEL_OIDC_TOKEN: undefined,
        PRODX_DB_BROKER_URL: undefined,
      },
      async () => {
        await resolveProductionDatabaseUrl('request-oidc-token');
        assert.equal(
          requestedUrl,
          'https://bbxoywnlayduqbrjeixj.supabase.co/functions/v1/prodx-db-broker',
        );
      },
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});


test('createProductionPostgresPool cannot bypass the OIDC broker with a caller-supplied URL in Vercel production', async () => {
  const originalFetch = globalThis.fetch;
  let requestedUrl = '';
  globalThis.fetch = async (input) => {
    requestedUrl = String(input);
    return new Response(JSON.stringify({ databaseUrl: 'postgresql://broker-issued.example/prodx' }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };

  let pool: Awaited<ReturnType<typeof createProductionPostgresPool>> | undefined;
  try {
    await withEnvironment(
      {
        VERCEL: '1',
        NODE_ENV: 'production',
        DATABASE_URL: 'postgresql://environment.example/prodx',
        VERCEL_OIDC_TOKEN: undefined,
        PRODX_DB_BROKER_URL: 'https://broker.example/prodx-db',
      },
      async () => {
        pool = await createProductionPostgresPool(
          { connectionString: 'postgresql://caller-supplied.example/untrusted' },
          'request-oidc-token',
        );
        assert.equal(requestedUrl, 'https://broker.example/prodx-db');
        assert.equal(
          (pool as unknown as { options: { connectionString: string } }).options.connectionString,
          'postgresql://broker-issued.example/prodx',
        );
      },
    );
  } finally {
    await pool?.end();
    globalThis.fetch = originalFetch;
  }
});
