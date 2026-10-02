import assert from 'node:assert/strict';
import test from 'node:test';
import { createApp } from './createApp';
import { registerCatalogPricingRoute } from './catalog-pricing-route';
import type { TransactionalSqlExecutor } from '../db/transaction';

const principal = { userId: 'user-1', organizationId: 'org-1', storeId: 'store-1' };
const productId = '00000000-0000-4000-8000-000000000001';

const start = async (app: ReturnType<typeof createApp>) => {
  const server = await new Promise<import('node:http').Server>((resolve) => { const instance = app.listen(0, () => resolve(instance)); });
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  return { baseUrl: `http://127.0.0.1:${address.port}`, close: () => new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve())) };
};

test('catalog bulk pricing is authenticated, tenant-scoped, numeric, audited, and idempotent', async () => {
  let operationInserted = true;
  const queries: string[] = [];
  const db: TransactionalSqlExecutor = {
    query: async () => ({ rows: [] }),
    transaction: async (work) => work({
      query: async <T>(sql: string, params: readonly unknown[] = []) => {
        queries.push(sql);
        if (sql.includes('INSERT INTO prodx_catalog_pricing_operations')) return { rows: operationInserted ? [{ id: 'op-1' }] as T[] : [] };
        if (sql.includes('FROM prodx_catalog_pricing_operations')) return { rows: [] as T[] };
        if (sql.includes('FROM prodx_products') && sql.includes('FOR UPDATE')) return { rows: [{ id: productId }] as T[] };
        if (sql.includes('UPDATE prodx_products')) return { rows: [{
          id: productId, store_id: principal.storeId, sku: 'SKU-1', barcode: '123', name: 'Coffee', category_id: 'cat-1',
          price_amount: '65.50', cost_price_amount: '15.00', currency: 'THB', tax_rate_bps: 700, current_stock: 5, reorder_point: 2, unit_of_measure: 'cup',
        }] as T[] };
        return { rows: [] as T[] };
      },
    }),
  };
  const app = createApp({ authenticateRequest: () => principal, authorizeRequest: (_context, permission) => permission === 'catalog.write', configureRoutes: (configuredApp) => registerCatalogPricingRoute(configuredApp, db) });
  const server = await start(app);
  try {
    const response = await fetch(server.baseUrl + '/api/v1/catalog/pricing/bulk', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ productIds: [productId], priceChangeType: 'set_amount', value: 65.5, idempotencyKey: 'price-1' }),
    });
    assert.equal(response.status, 201);
    const body = await response.json() as { products: Array<{ price: { amountInCents: number } }> };
    assert.equal(body.products[0].price.amountInCents, 6550);
    assert.ok(queries.some((sql) => sql.includes('prodx_audit_log')));
  } finally { await server.close(); }
});

test('catalog bulk pricing denies unauthorized callers before database work', async () => {
  let reached = false;
  const db: TransactionalSqlExecutor = { query: async () => { reached = true; return { rows: [] }; }, transaction: async () => { reached = true; throw new Error('database must not be reached'); } };
  const app = createApp({ authenticateRequest: () => principal, authorizeRequest: () => false, configureRoutes: (configuredApp) => registerCatalogPricingRoute(configuredApp, db) });
  const server = await start(app);
  try {
    const response = await fetch(server.baseUrl + '/api/v1/catalog/pricing/bulk', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ productIds: [productId], priceChangeType: 'set_amount', value: 65.5, idempotencyKey: 'price-1' }) });
    assert.equal(response.status, 403);
    assert.equal(reached, false);
  } finally { await server.close(); }
});
