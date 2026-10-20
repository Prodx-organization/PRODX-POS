import assert from 'node:assert/strict';
import test from 'node:test';
import { createProductionOrderTransactionApi } from '../../src/adapters/productionOrderTransactionApi';
import { createProductionRefundApi } from '../../src/adapters/productionRefundApi';
import { createProductionSyncApi } from '../../src/adapters/productionSyncApi';
import { createProductionInventoryAdjustmentApi } from '../../src/adapters/productionInventoryAdjustmentApi';
import { createProductionAuditApi } from '../../src/adapters/productionAuditApi';

const BASE_URL = 'https://pos.example.test';
const originalFetch = globalThis.fetch;
function mockFetch(body: unknown, status = 200) {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  globalThis.fetch = (async (url: string | URL, init?: RequestInit) => {
    calls.push({ url: String(url), init });
    return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
  }) as typeof fetch;
  return calls;
}
test.afterEach(() => { globalThis.fetch = originalFetch; });

test('production checkout adapter sends authenticated HTTP request', async () => {
  const calls = mockFetch({ order: { id: 'ord-1', status: 'server_confirmed' }, serverConfirmed: true });
  await createProductionOrderTransactionApi('token-123', BASE_URL).createOrder({
    idempotencyKey: 'checkout-1', storeId: 'store-1', registerId: 'register-1', cashierId: 'cashier-1',
    items: [], payments: [], totals: {} as never,
  });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, BASE_URL + '/api/v1/orders/checkout');
  assert.equal(calls[0].init?.method, 'POST');
  assert.equal((calls[0].init?.headers as Record<string, string>).Authorization, 'Bearer token-123');
});

test('production checkout adapter fails closed without token', async () => {
  const calls = mockFetch({ ok: true });
  await assert.rejects(
    createProductionOrderTransactionApi('', BASE_URL).createOrder({
      idempotencyKey: 'checkout-2', storeId: 'store-1', registerId: 'register-1', cashierId: 'cashier-1',
      items: [], payments: [], totals: {} as never,
    }),
    /Authenticated session token is required/,
  );
  assert.equal(calls.length, 0);
});

test('production sync adapter posts durable outbox command', async () => {
  const calls = mockFetch({ confirmedOrder: { id: 'ord-1', status: 'server_confirmed' }, syncedAt: '2026-10-05T15:00:00.000Z' });
  await createProductionSyncApi('token-sync', BASE_URL).syncOutboxItem({
    id: 'outbox-1', type: 'order_transaction', idempotencyKey: 'checkout-sync-1',
    payload: { idempotencyKey: 'checkout-sync-1', registerId: 'register-1', items: [], payments: [], totals: {} },
    createdAt: '2026-10-05T14:59:00.000Z', attempts: 1, syncState: 'queued',
  } as never);
  assert.equal(calls[0].url, BASE_URL + '/api/v1/sync/commands');
  assert.equal((calls[0].init?.headers as Record<string, string>).Authorization, 'Bearer token-sync');
  assert.equal(JSON.parse(String(calls[0].init?.body)).item.idempotencyKey, 'checkout-sync-1');
});

test('production refund adapter requires supervisor authorization', async () => {
  const calls = mockFetch({ ok: true });
  await assert.rejects(
    createProductionRefundApi('token-refund', BASE_URL).refund({
      orderId: 'ord-1', refundAmount: { amountInCents: 1000, currency: 'THB' }, reason: 'return',
      refundMethod: 'cash', itemsToRestock: [], idempotencyKey: 'refund-1', supervisorAuthorizationToken: '',
    }),
    /Server supervisor authorization is required/,
  );
  assert.equal(calls.length, 0);
});

test('production refund adapter forwards idempotency and supervisor authorization', async () => {
  const calls = mockFetch({ success: true, refundId: 'refund-1', orderId: 'ord-1', status: 'refunded',
    refundedAmount: { amountInCents: 1000, currency: 'THB' }, message: 'Refund committed.', idempotencyCached: false });
  await createProductionRefundApi('token-refund', BASE_URL).refund({
    orderId: 'ord-1', refundAmount: { amountInCents: 1000, currency: 'THB' }, reason: 'return',
    refundMethod: 'cash', itemsToRestock: [], idempotencyKey: 'refund-1', supervisorAuthorizationToken: 'grant-1',
  });
  assert.equal(calls[0].url, BASE_URL + '/api/v1/orders/refund');
  const headers = calls[0].init?.headers as Record<string, string>;
  assert.equal(headers.Authorization, 'Bearer token-refund');
  const body = JSON.parse(String(calls[0].init?.body));
  assert.equal(body.idempotencyKey, 'refund-1');
  assert.equal(body.supervisorAuthorizationToken, 'grant-1');
});


test('production inventory adapter persists retry keys until success and rotates them after success', async () => {
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
    if (attempt === 1) throw new TypeError('simulated lost response');
    return new Response(JSON.stringify({
      success: true,
      idempotencyCached: attempt === 2,
      adjustmentId: 'adjustment-1',
      entries: [{
        id: 'ledger-1', store_id: 'store-1', product_id: 'product-1',
        quantity_delta: 5, resulting_stock: 15, reason: 'purchase_received',
        reference_id: 'adjustment-1', performed_by_user_id: 'user-1',
        created_at: '2026-10-17T00:00:00.000Z',
      }],
    }), { status: 201, headers: { 'Content-Type': 'application/json' } });
  }) as typeof fetch;

  try {
    const api = createProductionInventoryAdjustmentApi('token-inventory', BASE_URL);
    const adjust = () => api.adjustStock('store-1', 'product-1', 5, 'purchase_received', 'user-1', 'PO-123');
    await assert.rejects(adjust(), /simulated lost response/);
    assert.equal(stored.size, 1, 'a failed request must retain its durable retry key');
    await adjust();
    assert.equal(stored.size, 0, 'a confirmed response must clear the durable retry key');
    await adjust();

    const keys = calls.map((call) => JSON.parse(String(call.init?.body)).idempotencyKey as string);
    assert.equal(calls.length, 3);
    assert.equal(calls[0].url, BASE_URL + '/api/v1/inventory/adjustments');
    assert.equal(keys[0], keys[1], 'a retry must reuse the original idempotency key');
    assert.notEqual(keys[1], keys[2], 'a later intentional operation after success must receive a new key');
    assert.equal((calls[0].init?.headers as Record<string, string>).Authorization, 'Bearer token-inventory');
  } finally {
    if (originalWindow === undefined) delete (globalThis as unknown as { window?: unknown }).window;
    else Object.defineProperty(globalThis, 'window', { configurable: true, value: originalWindow });
  }
});

test('production bulk inventory adjustment reports retry-key cleanup failure after server success', async () => {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const stored = new Map<string, string>();
  let failRemove = true;
  const originalWindow = (globalThis as unknown as { window?: unknown }).window;
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: {
      localStorage: {
        getItem: (key: string) => stored.get(key) ?? null,
        setItem: (key: string, value: string) => { stored.set(key, value); },
        removeItem: (key: string) => {
          if (failRemove) throw new Error('simulated storage cleanup failure');
          stored.delete(key);
        },
      },
    },
  });
  globalThis.fetch = (async (url: string | URL, init?: RequestInit) => {
    calls.push({ url: String(url), init });
    return new Response(JSON.stringify({ entries: [{
      id: 'ledger-bulk-1', store_id: 'store-1', product_id: 'product-1',
      quantity_delta: 2, resulting_stock: 12, reason: 'purchase_received',
      reference_id: 'bulk-1', performed_by_user_id: 'user-1',
      created_at: '2026-10-17T00:00:00.000Z',
    }] }), { status: 201, headers: { 'Content-Type': 'application/json' } });
  }) as typeof fetch;

  try {
    const api = createProductionInventoryAdjustmentApi('token-bulk', BASE_URL);
    const adjust = () => api.bulkAdjustStock('store-1', ['product-1'], 2, 'purchase_received', 'user-1', 'PO-BULK');
    await assert.rejects(adjust(), /could not be cleared from persistent storage/);
    assert.equal(stored.size, 1, 'the retry key must remain persisted when cleanup fails');
    failRemove = false;
    await adjust();
    assert.equal(stored.size, 0, 'a later confirmed retry must clear the persisted key');
    const keys = calls.map((call) => JSON.parse(String(call.init?.body)).idempotencyKey as string);
    assert.equal(calls.length, 2);
    assert.equal(keys[0], keys[1], 'retry after cleanup failure must reuse the original operation key');
  } finally {
    if (originalWindow === undefined) delete (globalThis as unknown as { window?: unknown }).window;
    else Object.defineProperty(globalThis, 'window', { configurable: true, value: originalWindow });
  }
});

test('production audit and inventory adapters fail closed without a bearer token', async () => {
  const calls = mockFetch({ ok: true });
  const audit = createProductionAuditApi('', BASE_URL);
  await assert.rejects(
    audit.recordEvent('store-1', '', 'user-1', 'Cashier', 'user_login', 'info', { source: 'pin' }),
    /Authenticated session token is required/,
  );
  const inventory = createProductionInventoryAdjustmentApi('', BASE_URL);
  await assert.rejects(
    inventory.adjustStock('store-1', 'product-1', 1, 'purchase_received', 'user-1'),
    /Authenticated session token is required/,
  );
  assert.equal(calls.length, 0, 'unauthenticated adapters must not issue network requests');
});
