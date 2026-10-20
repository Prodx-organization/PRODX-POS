import assert from 'node:assert/strict';
import test from 'node:test';
import { createProductionAuditApi } from '../../src/adapters/productionAuditApi';

const BASE_URL = 'https://pos.example.test';
const originalFetch = globalThis.fetch;
test.afterEach(() => { globalThis.fetch = originalFetch; });


test('production audit adapter persists event idempotency keys across uncertain retries', async () => {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const stored = new Map<string, string>();
  const originalWindow = (globalThis as unknown as { window?: unknown }).window;
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: {
      localStorage: {
        getItem: (key: string) => stored.get(key) ?? null,
        setItem: (key: string, value: string) => { stored.set(key, value); },
        removeItem: (key: string) => { stored.delete(key); },
      },
    },
  });
  let attempt = 0;
  globalThis.fetch = (async (url: string | URL, init?: RequestInit) => {
    calls.push({ url: String(url), init });
    attempt += 1;
    if (attempt === 1) throw new TypeError('simulated lost audit response');
    return new Response(JSON.stringify({
      id: 'audit-1', storeId: 'store-1', registerId: '', userId: 'user-1',
      userName: 'Cashier', action: 'user_login', severity: 'info',
      details: { source: 'pin' }, timestamp: '2026-10-17T00:00:00.000Z',
    }), { status: 201, headers: { 'Content-Type': 'application/json' } });
  }) as typeof fetch;

  try {
    const api = createProductionAuditApi('token-audit', BASE_URL);
    const record = () => api.recordEvent('store-1', '', 'user-1', 'Cashier', 'user_login', 'info', { source: 'pin' });
    await assert.rejects(record(), /simulated lost audit response/);
    assert.equal(stored.size, 1, 'an uncertain audit write must retain its durable key');
    await record();
    assert.equal(stored.size, 0, 'a confirmed audit response must clear its durable key');
    await record();
    const keys = calls.map((call) => JSON.parse(String(call.init?.body)).idempotencyKey as string);
    assert.equal(calls.length, 3);
    assert.equal(calls[0].url, BASE_URL + '/api/v1/audit/logs');
    assert.equal(keys[0], keys[1], 'a retry must reuse the original audit event key');
    assert.notEqual(keys[1], keys[2], 'a later intentional event must receive a fresh key');
  } finally {
    if (originalWindow === undefined) delete (globalThis as unknown as { window?: unknown }).window;
    else Object.defineProperty(globalThis, 'window', { configurable: true, value: originalWindow });
  }
});
