import test from 'node:test';
import assert from 'node:assert/strict';
import { checkPasswordCompromise, PasswordCompromiseCheckUnavailable } from './password-compromise';

test('HIBP screening uses only the first five SHA-1 characters and matches suffix locally', async () => {
  let requested = '';
  const result = await checkPasswordCompromise('password', {
    fetchImpl: async (input, init) => {
      requested = String(input);
      assert.equal(init?.headers && (init.headers as Record<string,string>)['user-agent'], 'PRODX-POS/1.0 password-security');
      return new Response('0018A45C4D1DEF81644B54AB7F969B88D65:10\n', { status: 200 });
    },
  });
  assert.equal(requested, 'https://api.pwnedpasswords.com/range/5BAA6');
  assert.deepEqual(result, { compromised: true, count: 10 });
});

test('HIBP screening returns safe when the complete hash suffix is absent', async () => {
  const result = await checkPasswordCompromise('password', {
    fetchImpl: async () => new Response('0018A45C4D1DEF81644B54AB7F969B88D65:10\n', { status: 200 }),
  });
  assert.deepEqual(result, { compromised: false, count: 0 });
});

test('HIBP screening fails closed when the service is unavailable', async () => {
  await assert.rejects(
    () => checkPasswordCompromise('password', {
      fetchImpl: async () => new Response('', { status: 503 }),
    }),
    PasswordCompromiseCheckUnavailable,
  );
});
