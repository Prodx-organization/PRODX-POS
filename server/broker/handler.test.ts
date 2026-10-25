import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildBrokerConfig,
  createBrokerHandler,
  parseAllowedSubjects,
  type BrokerConfig,
  type VerifyOidcToken,
} from '../../infra/db-broker/handler.ts';

const SUBJECT = 'owner:prodx:project:prodx-pos:environment:production';
const DATABASE_URL = 'postgresql://prodx_app.abcdefghijklmnop:s3cret-value@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres';

const config: BrokerConfig = {
  issuer: 'https://oidc.vercel.com/prodx',
  audience: 'https://vercel.com/prodx',
  allowedSubjects: [SUBJECT],
  databaseUrl: DATABASE_URL,
};

const acceptingVerifier = (sub: string): VerifyOidcToken => async () => ({ sub });
const rejectingVerifier: VerifyOidcToken = async () => {
  throw new Error('signature verification failed for token-value-123');
};

const request = (init: { method?: string; authorization?: string } = {}): Request =>
  new Request('https://broker.example/functions/v1/prodx-db-broker', {
    method: init.method ?? 'GET',
    headers: init.authorization ? { authorization: init.authorization } : {},
  });

test('broker returns the runtime database URL only for an allow-listed verified subject', async () => {
  let seen: { token: string; issuer: string; audience: string } | undefined;
  const handler = createBrokerHandler({
    config,
    verifyToken: async (token, expected) => {
      seen = { token, ...expected };
      return { sub: SUBJECT };
    },
  });

  const response = await handler(request({ authorization: 'Bearer abc.def.ghi' }));

  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.deepEqual(await response.json(), { databaseUrl: DATABASE_URL });
  assert.deepEqual(seen, {
    token: 'abc.def.ghi',
    issuer: config.issuer,
    audience: config.audience,
  });
});

test('broker rejects a verified token whose subject is not allow-listed', async () => {
  const handler = createBrokerHandler({
    config,
    verifyToken: acceptingVerifier('owner:prodx:project:other-project:environment:production'),
  });
  const response = await handler(request({ authorization: 'Bearer abc.def.ghi' }));
  const text = await response.text();

  assert.equal(response.status, 403);
  assert.ok(!text.includes('postgresql://'));
  assert.ok(!text.includes('s3cret-value'));
});

test('broker rejects a preview or development subject even for the same project', async () => {
  const handler = createBrokerHandler({
    config,
    verifyToken: acceptingVerifier('owner:prodx:project:prodx-pos:environment:preview'),
  });
  const response = await handler(request({ authorization: 'Bearer abc.def.ghi' }));
  assert.equal(response.status, 403);
});

test('broker rejects a token with no subject claim', async () => {
  const handler = createBrokerHandler({ config, verifyToken: async () => ({}) });
  const response = await handler(request({ authorization: 'Bearer abc.def.ghi' }));
  assert.equal(response.status, 403);
});

test('broker returns 401 without leaking token details when verification fails', async () => {
  const handler = createBrokerHandler({ config, verifyToken: rejectingVerifier });
  const response = await handler(request({ authorization: 'Bearer token-value-123' }));
  const text = await response.text();

  assert.equal(response.status, 401);
  assert.ok(!text.includes('token-value-123'));
  assert.ok(!text.includes('signature'));
  assert.equal(response.headers.get('www-authenticate'), 'Bearer');
});

test('broker returns 401 for a missing or malformed Authorization header without calling the verifier', async () => {
  let calls = 0;
  const handler = createBrokerHandler({
    config,
    verifyToken: async () => {
      calls += 1;
      return { sub: SUBJECT };
    },
  });

  for (const authorization of [undefined, 'Basic abc', 'Bearer', 'Bearer a b', 'bearer\tx y']) {
    const response = await handler(request({ authorization }));
    assert.equal(response.status, 401, `authorization=${String(authorization)}`);
  }
  assert.equal(calls, 0);
});

test('broker fails closed with 503 when it is not configured, even for a valid token', async () => {
  let calls = 0;
  const handler = createBrokerHandler({
    config: null,
    verifyToken: async () => {
      calls += 1;
      return { sub: SUBJECT };
    },
  });
  const response = await handler(request({ authorization: 'Bearer abc.def.ghi' }));

  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { error: 'broker_not_configured' });
  assert.equal(calls, 0);
});

test('broker only accepts GET', async () => {
  const handler = createBrokerHandler({ config, verifyToken: acceptingVerifier(SUBJECT) });
  for (const method of ['POST', 'PUT', 'DELETE', 'PATCH']) {
    const response = await handler(
      new Request('https://broker.example/', { method, headers: { authorization: 'Bearer abc.def.ghi' }, body: '{}' }),
    );
    assert.equal(response.status, 405, method);
    assert.equal(response.headers.get('allow'), 'GET');
  }
});

test('parseAllowedSubjects trims entries and drops blanks', () => {
  assert.deepEqual(parseAllowedSubjects(' a , ,b,, c '), ['a', 'b', 'c']);
  assert.deepEqual(parseAllowedSubjects(undefined), []);
  assert.deepEqual(parseAllowedSubjects(''), []);
});

test('buildBrokerConfig accepts a complete restricted-role configuration and normalizes the issuer', () => {
  const built = buildBrokerConfig({
    issuer: 'https://oidc.vercel.com/prodx/',
    audience: 'https://vercel.com/prodx',
    allowedSubjects: SUBJECT,
    databaseUrl: DATABASE_URL,
  });
  assert.deepEqual(built, {
    issuer: 'https://oidc.vercel.com/prodx',
    audience: 'https://vercel.com/prodx',
    allowedSubjects: [SUBJECT],
    databaseUrl: DATABASE_URL,
  });
});

test('buildBrokerConfig returns null for incomplete or unsafe configuration', () => {
  const valid = {
    issuer: 'https://oidc.vercel.com/prodx',
    audience: 'https://vercel.com/prodx',
    allowedSubjects: SUBJECT,
    databaseUrl: DATABASE_URL,
  };
  assert.notEqual(buildBrokerConfig(valid), null);

  assert.equal(buildBrokerConfig({ ...valid, issuer: undefined }), null);
  assert.equal(buildBrokerConfig({ ...valid, audience: '' }), null);
  assert.equal(buildBrokerConfig({ ...valid, allowedSubjects: ' , ' }), null);
  assert.equal(buildBrokerConfig({ ...valid, databaseUrl: undefined }), null);
  assert.equal(buildBrokerConfig({ ...valid, issuer: 'http://oidc.vercel.com/prodx' }), null);
  assert.equal(buildBrokerConfig({ ...valid, audience: 'http://vercel.com/prodx' }), null);
  assert.equal(buildBrokerConfig({ ...valid, databaseUrl: 'mysql://prodx_app:x@host/db' }), null);
  assert.equal(buildBrokerConfig({ ...valid, databaseUrl: 'not a url' }), null);
});

test('buildBrokerConfig refuses administrative database roles', () => {
  const base = {
    issuer: 'https://oidc.vercel.com/prodx',
    audience: 'https://vercel.com/prodx',
    allowedSubjects: SUBJECT,
  };
  for (const username of ['postgres', 'postgres.abcdefghijklmnop', 'supabase_admin', 'service_role', 'authenticator']) {
    assert.equal(
      buildBrokerConfig({
        ...base,
        databaseUrl: `postgresql://${username}:pw@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres`,
      }),
      null,
      username,
    );
  }
  // Direct (non-pooler) and pooler usernames for the restricted role are both accepted.
  assert.notEqual(
    buildBrokerConfig({ ...base, databaseUrl: 'postgresql://prodx_app:pw@db.example.supabase.co:5432/postgres' }),
    null,
  );
});
