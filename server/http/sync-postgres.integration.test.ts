import assert from 'node:assert/strict';
import test from 'node:test';
import { createPostgresPool } from '../db/postgres';
import { createTransactionalPostgresExecutor } from '../db/transaction';
import { createApp } from './createApp';
import { registerSyncRoute } from './sync-route';
import type { CheckoutRequest } from '../../src/adapters/types';

const url = process.env.DATABASE_URL;
const pool = url ? createPostgresPool({ connectionString: url, max: 8 }) : null;
const db = pool ? createTransactionalPostgresExecutor(pool) : null;

const id = {
  org: '00000000-0000-4000-8000-000000002001',
  store: '00000000-0000-4000-8000-000000002002',
  user: '00000000-0000-4000-8000-000000002003',
  register: '00000000-0000-4000-8000-000000002004',
  shift: '00000000-0000-4000-8000-000000002005',
  category: '00000000-0000-4000-8000-000000002006',
  product: '00000000-0000-4000-8000-000000002007',
  payment: '00000000-0000-4000-8000-000000002008',
};

const request = (key: string): CheckoutRequest => ({
  idempotencyKey: key,
  storeId: id.store,
  registerId: id.register,
  cashierId: id.user,
  items: [{
    lineId: 'sync-line',
    product: {
      id: id.product,
      storeId: id.store,
      sku: 'SYNC-1',
      barcode: 'SYNC-1',
      name: 'Sync Product',
      categoryId: id.category,
      price: { amountInCents: 1000, currency: 'THB' },
      costPrice: { amountInCents: 500, currency: 'THB' },
      taxRateBps: 0,
      currentStock: 10,
      reorderPoint: 1,
      unitOfMeasure: 'each',
    },
    quantity: 1,
    unitPrice: { amountInCents: 1000, currency: 'THB' },
    discountBps: 0,
    lineSubtotal: { amountInCents: 1000, currency: 'THB' },
    lineTax: { amountInCents: 0, currency: 'THB' },
    lineTotal: { amountInCents: 1000, currency: 'THB' },
  }],
  totals: {
    grossSubtotal: { amountInCents: 1000, currency: 'THB' },
    itemDiscounts: { amountInCents: 0, currency: 'THB' },
    orderDiscount: { amountInCents: 0, currency: 'THB' },
    netSubtotal: { amountInCents: 1000, currency: 'THB' },
    totalTax: { amountInCents: 0, currency: 'THB' },
    grandTotal: { amountInCents: 1000, currency: 'THB' },
    totalItemsCount: 1,
  },
  payments: [{
    id: id.payment,
    method: 'cash',
    amount: { amountInCents: 1000, currency: 'THB' },
    tenderedCash: { amountInCents: 1000, currency: 'THB' },
    changeGiven: { amountInCents: 0, currency: 'THB' },
    timestamp: '2026-10-05T00:00:00.000Z',
  }],
});

async function clean(): Promise<void> {
  if (!pool) return;
  const statements = [
    ['DELETE FROM prodx_cash_movements WHERE shift_id=$1', [id.shift]],
    ['DELETE FROM prodx_audit_log WHERE store_id=$1', [id.store]],
    ['DELETE FROM prodx_payments WHERE store_id=$1', [id.store]],
    ['DELETE FROM prodx_order_items WHERE store_id=$1', [id.store]],
    ['DELETE FROM prodx_inventory_ledger WHERE store_id=$1', [id.store]],
    ['DELETE FROM prodx_orders WHERE store_id=$1', [id.store]],
    ['DELETE FROM prodx_shifts WHERE id=$1', [id.shift]],
    ['DELETE FROM prodx_products WHERE id=$1', [id.product]],
    ['DELETE FROM prodx_categories WHERE id=$1', [id.category]],
    ['DELETE FROM prodx_registers WHERE id=$1', [id.register]],
    ['DELETE FROM prodx_store_memberships WHERE store_id=$1', [id.store]],
    ['DELETE FROM prodx_users WHERE id=$1', [id.user]],
    ['DELETE FROM prodx_stores WHERE id=$1', [id.store]],
    ['DELETE FROM prodx_organizations WHERE id=$1', [id.org]],
  ] as const;
  for (const [sql, params] of statements) await pool.query(sql, params);
}

async function seed(): Promise<void> {
  assert.ok(pool);
  await clean();
  await pool.query('INSERT INTO prodx_organizations(id,code,name) VALUES($1,$2,$3)', [id.org, 'sync-http', 'Sync HTTP']);
  await pool.query(
    'INSERT INTO prodx_stores(id,organization_id,code,name,business_timezone) VALUES($1,$2,$3,$4,$5)',
    [id.store, id.org, 'sync-store', 'Sync Store', 'Asia/Bangkok'],
  );
  await pool.query(
    'INSERT INTO prodx_users(id,organization_id,username,display_name) VALUES($1,$2,$3,$4)',
    [id.user, id.org, 'sync-user', 'Sync User'],
  );
  await pool.query(
    'INSERT INTO prodx_store_memberships(organization_id,store_id,user_id) VALUES($1,$2,$3)',
    [id.org, id.store, id.user],
  );
  await pool.query(
    'INSERT INTO prodx_registers(id,organization_id,store_id,code,name) VALUES($1,$2,$3,$4,$5)',
    [id.register, id.org, id.store, 'SYNC-R1', 'Sync Register'],
  );
  await pool.query(
    "INSERT INTO prodx_shifts(id,organization_id,store_id,register_id,cashier_id,opening_float_amount,currency) VALUES($1,$2,$3,$4,$5,0,'THB')",
    [id.shift, id.org, id.store, id.register, id.user],
  );
  await pool.query(
    'INSERT INTO prodx_categories(id,organization_id,store_id,name,slug) VALUES($1,$2,$3,$4,$5)',
    [id.category, id.org, id.store, 'Sync Category', 'sync-category'],
  );
  await pool.query(
    "INSERT INTO prodx_products(id,organization_id,store_id,category_id,sku,barcode,name,price_amount,cost_price_amount,currency,tax_rate_bps,current_stock,reorder_point,unit_of_measure) VALUES($1,$2,$3,$4,'SYNC-1','SYNC-1','Sync Product',10.00,5.00,'THB',0,10,1,'each')",
    [id.product, id.org, id.store, id.category],
  );
}

test('production sync HTTP path commits once and returns cached result on replay', async (t) => {
  if (!pool || !db) {
    t.skip('DATABASE_URL not configured');
    return;
  }

  await seed();
  t.after(async () => {
    await clean();
    await pool.end();
  });

  const principal = {
    userId: id.user,
    organizationId: id.org,
    storeId: id.store,
    sessionId: 'sync-http-session',
  };
  const app = createApp({
    authenticateRequest: () => principal,
    authorizeRequest: (_context, permission) => permission === 'pos.sell',
    configureRoutes: (configuredApp) => registerSyncRoute(configuredApp, db),
  });
  const server = await new Promise<import('node:http').Server>((resolve) => {
    const instance = app.listen(0, () => resolve(instance));
  });
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  const baseUrl = `http://127.0.0.1:${address.port}`;

  try {
    const item = {
      id: 'offline-sync-1',
      type: 'order_transaction' as const,
      idempotencyKey: 'offline-sync-key',
      payload: request('offline-sync-key'),
      createdAt: '2026-10-05T00:00:00.000Z',
      attempts: 0,
      syncState: 'queued' as const,
    };

    const first = await fetch(`${baseUrl}/api/v1/sync/commands`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ item }),
    });
    assert.equal(first.status, 201);
    const firstBody = await first.json() as {
      confirmedOrder: { id: string };
      serverConfirmed: boolean;
      idempotencyCached: boolean;
    };
    assert.equal(firstBody.serverConfirmed, true);
    assert.equal(firstBody.idempotencyCached, false);

    const replay = await fetch(`${baseUrl}/api/v1/sync/commands`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ item: { ...item, attempts: 1 } }),
    });
    assert.equal(replay.status, 200);
    const replayBody = await replay.json() as {
      confirmedOrder: { id: string };
      serverConfirmed: boolean;
      idempotencyCached: boolean;
    };
    assert.equal(replayBody.serverConfirmed, true);
    assert.equal(replayBody.idempotencyCached, true);
    assert.equal(replayBody.confirmedOrder.id, firstBody.confirmedOrder.id);

    const orderCount = await pool.query(
      'SELECT count(*)::int AS count FROM prodx_orders WHERE store_id=$1 AND idempotency_key=$2',
      [id.store, item.idempotencyKey],
    );
    const stock = await pool.query('SELECT current_stock FROM prodx_products WHERE id=$1', [id.product]);
    const paymentCount = await pool.query(
      'SELECT count(*)::int AS count FROM prodx_payments WHERE store_id=$1 AND order_id=$2',
      [id.store, firstBody.confirmedOrder.id],
    );

    assert.equal(orderCount.rows[0].count, 1);
    assert.equal(stock.rows[0].current_stock, 9);
    assert.equal(paymentCount.rows[0].count, 1);
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});
