import assert from 'node:assert/strict';
import test from 'node:test';
import { classifyProductionDatabaseTarget, createPostgresPool, createProductionPostgresPool, resolveConfiguredDatabaseUrl, resolveProductionDatabaseUrl } from './postgres';

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

test('classifies the PRODX-POS production database targets without exposing credentials', () => {
  assert.equal(classifyProductionDatabaseTarget('postgresql://user:secret@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres'), 'supabase_session_pooler');
  assert.equal(classifyProductionDatabaseTarget('postgresql://user:secret@db.sjgwesmmpegtzsqqqhvd.supabase.co:5432/postgres'), 'supabase_direct');
  assert.equal(classifyProductionDatabaseTarget('postgresql://user:secret@db.bbxoywnlayduqbrjeixj.supabase.co:5432/postgres'), 'other');
  assert.equal(classifyProductionDatabaseTarget('postgresql://user:secret@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres'), 'other');
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
      await assert.rejects(resolveProductionDatabaseUrl(), /Vercel OIDC token is required/);
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
    return new Response(JSON.stringify({ databaseUrl: 'postgresql://prodx_app.sjgwesmmpegtzsqqqhvd:runtime-secret@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres?sslmode=require' }), {
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
        PRODX_DB_BROKER_URL: 'https://sjgwesmmpegtzsqqqhvd.supabase.co/functions/v1/prodx-db-broker',
      },
      async () => {
        assert.equal(await resolveProductionDatabaseUrl('request-oidc-token'), 'postgresql://prodx_app.sjgwesmmpegtzsqqqhvd:runtime-secret@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres?sslmode=require');
        assert.equal(requestedUrl, 'https://sjgwesmmpegtzsqqqhvd.supabase.co/functions/v1/prodx-db-broker');
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
    return new Response(JSON.stringify({ databaseUrl: 'postgresql://prodx_app.sjgwesmmpegtzsqqqhvd:runtime-secret@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres?sslmode=require' }), {
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
        PRODX_DB_BROKER_URL: 'https://sjgwesmmpegtzsqqqhvd.supabase.co/functions/v1/prodx-db-broker',
      },
      async () => {
        assert.equal(await resolveProductionDatabaseUrl(), 'postgresql://prodx_app.sjgwesmmpegtzsqqqhvd:runtime-secret@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres?sslmode=require');
        assert.equal(requestedAuthorization, 'Bearer environment-oidc-token');
      },
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('resolveProductionDatabaseUrl defaults to the shared POS broker, not Owner Console Supabase', async () => {
  const originalFetch = globalThis.fetch;
  let requestedUrl = '';
  globalThis.fetch = async (input) => {
    requestedUrl = String(input);
    return new Response(JSON.stringify({ databaseUrl: 'postgresql://prodx_app.sjgwesmmpegtzsqqqhvd:runtime-secret@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres?sslmode=require' }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };

  try {
    await withEnvironment(
      { VERCEL: '1', NODE_ENV: 'production', DATABASE_URL: undefined, VERCEL_OIDC_TOKEN: undefined, PRODX_DB_BROKER_URL: undefined },
      async () => {
        await resolveProductionDatabaseUrl('request-oidc-token');
        assert.equal(requestedUrl, 'https://sjgwesmmpegtzsqqqhvd.supabase.co/functions/v1/prodx-db-broker');
      },
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('createProductionPostgresPool does not allow a caller-supplied URL to bypass the production broker', async () => {
  const originalFetch = globalThis.fetch;
  const approvedUrl = 'postgresql://prodx_app.sjgwesmmpegtzsqqqhvd:runtime-secret@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres?sslmode=require';
  let requestedUrl = '';
  globalThis.fetch = async (input) => {
    requestedUrl = String(input);
    return new Response(JSON.stringify({ databaseUrl: approvedUrl }), {
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
        PRODX_DB_BROKER_URL: 'https://sjgwesmmpegtzsqqqhvd.supabase.co/functions/v1/prodx-db-broker',
      },
      async () => {
        const pool = await createProductionPostgresPool({
          connectionString: 'postgresql://postgres:admin-secret@db.bbxoywnlayduqbrjeixj.supabase.co:5432/postgres',
        }, 'request-oidc-token');
        try {
          assert.equal(requestedUrl, 'https://sjgwesmmpegtzsqqqhvd.supabase.co/functions/v1/prodx-db-broker');
          assert.equal(pool.options.connectionString, approvedUrl);
        } finally {
          await pool.end();
        }
      },
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('resolveProductionDatabaseUrl rejects a broker response with an unapproved database target', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ databaseUrl: 'postgresql://postgres:secret@db.bbxoywnlayduqbrjeixj.supabase.co:5432/postgres' }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });

  try {
    await withEnvironment(
      { VERCEL: '1', NODE_ENV: 'production', DATABASE_URL: undefined, VERCEL_OIDC_TOKEN: undefined, PRODX_DB_BROKER_URL: undefined },
      async () => {
        await assert.rejects(resolveProductionDatabaseUrl('request-oidc-token'), /unapproved runtime database target/);
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
      { VERCEL: '1', NODE_ENV: 'production', DATABASE_URL: 'postgresql://legacy.example/prodx', VERCEL_OIDC_TOKEN: undefined },
      async () => {
        await assert.rejects(resolveProductionDatabaseUrl('request-oidc-token'), /broker rejected the request with HTTP 503/);
      },
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('resolveConfiguredDatabaseUrl preserves valid URLs and rejects missing or placeholder strings', async () => {
  assert.equal(resolveConfiguredDatabaseUrl('postgresql://local.example/prodx'), 'postgresql://local.example/prodx');
  assert.equal(resolveConfiguredDatabaseUrl('postgresql://...'), undefined);
  assert.equal(resolveConfiguredDatabaseUrl('postgres://...'), undefined);
  assert.equal(resolveConfiguredDatabaseUrl('  '), undefined);
  await withEnvironment({ DATABASE_URL: undefined }, async () => {
    assert.equal(resolveConfiguredDatabaseUrl(), undefined);
  });
});

test('resolveConfiguredDatabaseUrl rejects missing or placeholder strings in Vercel production', async () => {
  await withEnvironment(
    { VERCEL: '1', NODE_ENV: 'production' },
    async () => {
      assert.equal(resolveConfiguredDatabaseUrl('postgresql://...'), undefined);
      assert.equal(resolveConfiguredDatabaseUrl('   '), undefined);
    },
  );
});

test('createPostgresPool refuses to create a degraded dummy pool without a database URL', async () => {
  await withEnvironment(
    { VERCEL: '1', NODE_ENV: 'production', DATABASE_URL: undefined },
    async () => {
      assert.throws(
        () => createPostgresPool(),
        /DATABASE_URL is missing or unconfigured/,
      );
    },
  );
});
