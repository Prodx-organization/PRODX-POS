import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { classifyProductionDatabaseTarget, createProductionPostgresPool, resolveConfiguredDatabaseUrl, resolveProductionDatabaseUrl } from './postgres';
import { validateApprovedDatabaseUrl, validateBrokerEndpointUrl } from '../../infra/db-broker/target.ts';

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


test('approved database URL validation pins the exact host, restricted role, and project ref', () => {
  const ref = 'abcdefghijklmnopqrst';
  const host = 'aws-0-ap-southeast-1.pooler.supabase.com';
  const poolerUrl = `postgresql://prodx_app.${ref}:pw@${host}:5432/postgres`;
  assert.equal(validateApprovedDatabaseUrl(poolerUrl, host, ref), poolerUrl);
  assert.equal(validateApprovedDatabaseUrl(poolerUrl, undefined, ref), null);
  assert.equal(validateApprovedDatabaseUrl(poolerUrl, host, undefined), null);
  assert.equal(validateApprovedDatabaseUrl(poolerUrl.replace(ref, 'qrstuvwxyzabcdefghij'), host, ref), null);
  assert.equal(validateApprovedDatabaseUrl(poolerUrl.replace(host, 'evil.example'), host, ref), null);
  assert.equal(validateApprovedDatabaseUrl(`postgresql://postgres:pw@${host}:5432/postgres`, host, ref), null);

  const directHost = `db.${ref}.supabase.co`;
  const directUrl = `postgresql://prodx_app:pw@${directHost}:5432/postgres`;
  assert.equal(validateApprovedDatabaseUrl(directUrl, directHost, ref), directUrl);
  assert.equal(validateApprovedDatabaseUrl(`postgresql://postgres:pw@${directHost}:5432/postgres`, directHost, ref), null);
});

test('broker endpoint validation pins the exact Supabase project before an OIDC token can be sent', () => {
  const ref = 'abcdefghijklmnopqrst';
  const endpoint = `https://${ref}.supabase.co/functions/v1/prodx-db-broker`;
  assert.equal(validateBrokerEndpointUrl(endpoint, ref), endpoint);
  assert.equal(validateBrokerEndpointUrl('https://evil.example/functions/v1/prodx-db-broker', ref), null);
  assert.equal(validateBrokerEndpointUrl(`https://${ref}.supabase.co/functions/v1/other-function`, ref), null);
  assert.equal(validateBrokerEndpointUrl(endpoint, undefined), null);
});
test('classifies production database targets without returning or logging hostnames', () => {
  assert.equal(classifyProductionDatabaseTarget('postgresql://user:secret@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres'), 'supabase_session_pooler');
  // Owner Console project is not an approved POS transactional database.
  assert.equal(classifyProductionDatabaseTarget('postgresql://user:secret@db.bbxoywnlayduqbrjeixj.supabase.co:5432/postgres'), 'other');
  assert.equal(classifyProductionDatabaseTarget('postgresql://user:secret@db.example.internal:5432/postgres'), 'other');
  assert.equal(classifyProductionDatabaseTarget('not a database URL'), 'invalid');
});

test('tracked production bundle does not approve the Owner Console Supabase host', async () => {
  const bundle = await readFile(new URL('../entrypoint.js', import.meta.url), 'utf8');
  assert.doesNotMatch(bundle, /db\.bbxoywnlayduqbrjeixj\.supabase\.co/);
  assert.match(bundle, /aws-0-ap-northeast-1\.pooler\.supabase\.com/);
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

test('resolveProductionDatabaseUrl fails closed when the production broker endpoint is not configured', async () => {
  await withEnvironment(
    {
      VERCEL: '1',
      NODE_ENV: 'production',
      DATABASE_URL: 'postgresql://legacy.example/prodx',
      VERCEL_OIDC_TOKEN: undefined,
      PRODX_DB_BROKER_URL: undefined,
    },
    async () => {
      await assert.rejects(
        resolveProductionDatabaseUrl('request-oidc-token'),
        /PRODX_DB_BROKER_URL is required/,
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
    return new Response(JSON.stringify({ databaseUrl: 'postgresql://prodx_app.abcdefghijklmnopqrst:pw@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres' }), {
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
        PRODX_DB_BROKER_URL: 'https://abcdefghijklmnopqrst.supabase.co/functions/v1/prodx-db-broker',
        PRODX_DB_BROKER_PROJECT_REF: 'abcdefghijklmnopqrst',
        PRODX_DB_ALLOWED_HOST: 'aws-0-ap-southeast-1.pooler.supabase.com',
        PRODX_DB_ALLOWED_PROJECT_REF: 'abcdefghijklmnopqrst',
      },
      async () => {
        assert.equal(
          await resolveProductionDatabaseUrl('request-oidc-token'),
          'postgresql://prodx_app.abcdefghijklmnopqrst:pw@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres',
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
    return new Response(JSON.stringify({ databaseUrl: 'postgresql://prodx_app.abcdefghijklmnopqrst:pw@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres' }), {
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
        PRODX_DB_BROKER_URL: 'https://abcdefghijklmnopqrst.supabase.co/functions/v1/prodx-db-broker',
        PRODX_DB_BROKER_PROJECT_REF: 'abcdefghijklmnopqrst',
        PRODX_DB_ALLOWED_HOST: 'aws-0-ap-southeast-1.pooler.supabase.com',
        PRODX_DB_ALLOWED_PROJECT_REF: 'abcdefghijklmnopqrst',
      },
      async () => {
        assert.equal(await resolveProductionDatabaseUrl(), 'postgresql://prodx_app.abcdefghijklmnopqrst:pw@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres');
        assert.equal(requestedAuthorization, 'Bearer environment-oidc-token');
      },
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('createProductionPostgresPool cannot bypass the production broker with a caller-supplied connection string', async () => {
  const originalFetch = globalThis.fetch;
  let requestedUrl = '';
  globalThis.fetch = async (input) => {
    requestedUrl = String(input);
    return new Response(JSON.stringify({ databaseUrl: 'postgresql://prodx_app.abcdefghijklmnopqrst:pw@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres' }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };

  try {
    await withEnvironment({
      VERCEL: '1',
      NODE_ENV: 'production',
      DATABASE_URL: 'postgresql://legacy.example/prodx',
      VERCEL_OIDC_TOKEN: undefined,
      PRODX_DB_BROKER_URL: 'https://abcdefghijklmnopqrst.supabase.co/functions/v1/prodx-db-broker',
        PRODX_DB_BROKER_PROJECT_REF: 'abcdefghijklmnopqrst',
        PRODX_DB_ALLOWED_HOST: 'aws-0-ap-southeast-1.pooler.supabase.com',
        PRODX_DB_ALLOWED_PROJECT_REF: 'abcdefghijklmnopqrst',
    }, async () => {
      const pool = await createProductionPostgresPool({
        connectionString: 'postgresql://caller-controlled.example/prodx',
      }, 'request-oidc-token');
      try {
        assert.equal(requestedUrl, 'https://broker.example/prodx-db');
        assert.equal(
          (pool as unknown as { options: { connectionString: string } }).options.connectionString,
          'postgresql://prodx_app.abcdefghijklmnopqrst:pw@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres',
        );
      } finally {
        await pool.end();
      }
    });
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
        PRODX_DB_BROKER_URL: 'https://abcdefghijklmnopqrst.supabase.co/functions/v1/prodx-db-broker',
        PRODX_DB_BROKER_PROJECT_REF: 'abcdefghijklmnopqrst',
        PRODX_DB_ALLOWED_HOST: 'aws-0-ap-southeast-1.pooler.supabase.com',
        PRODX_DB_ALLOWED_PROJECT_REF: 'abcdefghijklmnopqrst',
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

