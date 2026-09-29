import assert from 'node:assert/strict';
import test from 'node:test';
import type { QueryResultRow } from 'pg';
import { createApp } from './createApp';
import { registerCatalogRoute } from './catalog-route';
import type { SqlQueryExecutor } from '../db/transaction';

const principal = {
  userId: 'user-1',
  organizationId: 'org-1',
  storeId: 'store-authorized',
  sessionId: 'session-1',
};

const start = async (app: ReturnType<typeof createApp>) => {
  const server = await new Promise<import('node:http').Server>((resolve) => {
    const instance = app.listen(0, () => resolve(instance));
  });
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    close: () =>
      new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      ),
  };
};

test('catalog production routes are authenticated, permissioned, and store-scoped', async () => {
  const queries: Array<{ sql: string; parameters: readonly unknown[] }> = [];
  const query = async <T extends QueryResultRow>(
    sql: string,
    parameters: readonly unknown[] = [],
  ) => {
    queries.push({ sql, parameters });

    if (sql.includes('FROM prodx_categories')) {
      return {
        rows: [{ id: 'cat-1', name: 'Coffee', slug: 'coffee' }] as unknown as T[],
      };
    }

    if (sql.includes('FROM prodx_products') && sql.includes('ORDER BY name,id')) {
      return {
        rows: [{
          id: 'product-1',
          store_id: principal.storeId,
          sku: 'SKU-1',
          barcode: '123456',
          name: 'Coffee',
          category_id: 'cat-1',
          price_amount: '65.00',
          cost_price_amount: '15.00',
          currency: 'THB',
          tax_rate_bps: 700,
          current_stock: 10,
          reorder_point: 2,
          unit_of_measure: 'cup',
          active: true,
        }] as unknown as T[],
      };
    }

    if (sql.includes('FROM prodx_products') && sql.includes('barcode=$2')) {
      return {
        rows: [{
          id: 'product-1',
          store_id: principal.storeId,
          sku: 'SKU-1',
          barcode: '123456',
          name: 'Coffee',
          category_id: 'cat-1',
          price_amount: '65.00',
          cost_price_amount: '15.00',
          currency: 'THB',
          tax_rate_bps: 700,
          current_stock: 10,
          reorder_point: 2,
          unit_of_measure: 'cup',
          active: true,
        }] as unknown as T[],
      };
    }

    throw new Error(`Unexpected SQL: ${sql}`);
  };

  const db: SqlQueryExecutor = { query };
  const app = createApp({
    authenticateRequest: () => principal,
    authorizeRequest: (_context, permission) => permission === 'catalog.read',
    configureRoutes: (configuredApp) => registerCatalogRoute(configuredApp, db),
  });
  const server = await start(app);

  try {
    const categories = await fetch(`${server.baseUrl}/api/v1/catalog/categories`);
    assert.equal(categories.status, 200);
    assert.deepEqual(await categories.json(), [{ id: 'cat-1', name: 'Coffee', slug: 'coffee' }]);

    const products = await fetch(
      `${server.baseUrl}/api/v1/catalog/products?categoryId=cat-1&search=coffee`,
    );
    assert.equal(products.status, 200);
    assert.deepEqual(await products.json(), [{
      id: 'product-1',
      storeId: principal.storeId,
      sku: 'SKU-1',
      barcode: '123456',
      name: 'Coffee',
      categoryId: 'cat-1',
      price: { amountInCents: 6500, currency: 'THB' },
      costPrice: { amountInCents: 1500, currency: 'THB' },
      taxRateBps: 700,
      currentStock: 10,
      reorderPoint: 2,
      unitOfMeasure: 'cup',
    }]);

    const barcode = await fetch(`${server.baseUrl}/api/v1/catalog/products/by-barcode/123456`);
    assert.equal(barcode.status, 200);
    assert.equal((await barcode.json()).storeId, principal.storeId);

    const productQuery = queries.find((q) => q.sql.includes('FROM prodx_products') && q.sql.includes('ORDER BY name,id'));
    assert.deepEqual(productQuery?.parameters, [principal.storeId, 'cat-1', '%coffee%']);
  } finally {
    await server.close();
  }
});

test('catalog production routes fail closed when permission is denied', async () => {
  const db: SqlQueryExecutor = {
    query: async () => {
      throw new Error('database must not be reached');
    },
  };

  const app = createApp({
    authenticateRequest: () => principal,
    authorizeRequest: () => false,
    configureRoutes: (configuredApp) => registerCatalogRoute(configuredApp, db),
  });
  const server = await start(app);

  try {
    const response = await fetch(`${server.baseUrl}/api/v1/catalog/products`);
    assert.equal(response.status, 403);
    assert.equal((await response.json()).error.code, 'FORBIDDEN');
  } finally {
    await server.close();
  }
});
