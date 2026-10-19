import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { createPostgresPool, resolveConfiguredDatabaseUrl } from './db/postgres';

const workspaceRoot = process.cwd();

test('Architecture Gate 1: Authoritative financial modules contain zero IEEE-754 floating-point money conversions', () => {
  const authoritativeFinancialFiles = [
    'server/shift/shift-service.ts',
    'server/http/catalog-pricing-route.ts',
    'server/http/catalog-import-route.ts',
    'server/transactions/checkout-service.ts',
    'server/transactions/refund-service.ts',
    'server/transactions/void-service.ts',
    'src/domain/money.ts',
    'src/domain/order.ts',
    'src/domain/taxInvoice.ts',
  ];

  const forbiddenPatterns = [
    /parseFloat\s*\(/,
    /Math\.round\s*\(\s*Number\s*\(/,
    /amountInCents\s*\/\s*100\b/,
    /cents\s*\([^)]*\)\s*\/\s*100\b/,
  ];

  for (const relativePath of authoritativeFinancialFiles) {
    const fullPath = path.join(workspaceRoot, relativePath);
    const content = fs.readFileSync(fullPath, 'utf8');
    for (const pattern of forbiddenPatterns) {
      assert.equal(
        pattern.test(content),
        false,
        `Forbidden floating-point money pattern ${pattern} found in ${relativePath}`,
      );
    }
  }
});

test('Architecture Gate 2: Production POS, Shift, Orders, Inventory, and Returns modules do not import mockAdapter directly', () => {
  const productionFiles = [
    'src/modules/returns/ReturnsAuthorizationModule.tsx',
    'src/modules/inventory/InventoryScreen.tsx',
    'src/modules/shift/ShiftScreen.tsx',
    'src/modules/orders/OrdersScreen.tsx',
    'src/components/orders/OrderRefundModal.tsx',
  ];

  for (const relativePath of productionFiles) {
    const fullPath = path.join(workspaceRoot, relativePath);
    const content = fs.readFileSync(fullPath, 'utf8');
    assert.equal(
      content.includes('mockAdapter'),
      false,
      `Unauthorized direct mockAdapter import found in ${relativePath}`,
    );
  }
});

test('Security Gate 3: Refund and Returns UI modules contain zero hardcoded supervisor PINs', () => {
  const files = [
    'src/modules/returns/ReturnsAuthorizationModule.tsx',
    'src/components/orders/OrderRefundModal.tsx',
  ];

  for (const relativePath of files) {
    const fullPath = path.join(workspaceRoot, relativePath);
    const content = fs.readFileSync(fullPath, 'utf8');
    assert.equal(
      /\['1234',\s*'9999'/.test(content),
      false,
      `Hardcoded supervisor PIN array found in ${relativePath}`,
    );
  }
});

test('Database & Security Gate 4: PostgreSQL append-only audit trigger, RLS, and least-privilege prodx_app role are enforced', async (t) => {
  const databaseUrl = resolveConfiguredDatabaseUrl(process.env.DATABASE_URL);
  if (!databaseUrl) {
    t.skip('DATABASE_URL not configured');
    return;
  }

  const pool = createPostgresPool({ connectionString: databaseUrl, max: 2 });
  t.after(async () => {
    await pool.end();
  });

  // 1. Verify append-only trigger on prodx_audit_log
  const triggerRes = await pool.query<{ tgname: string; tgenabled: string }>(
    `SELECT tgname, tgenabled
       FROM pg_trigger
      WHERE tgname = 'prodx_audit_log_immutable_guard'
        AND NOT tgisinternal`,
  );
  assert.equal(triggerRes.rows.length, 1, 'prodx_audit_log_immutable_guard trigger must exist');
  assert.equal(triggerRes.rows[0].tgenabled, 'O', 'prodx_audit_log_immutable_guard trigger must be enabled');

  // 2. Verify Row-Level Security (RLS) is enabled on core tenant tables
  const rlsTables = [
    'prodx_orders',
    'prodx_order_items',
    'prodx_payments',
    'prodx_refunds',
    'prodx_voids',
    'prodx_shifts',
    'prodx_cash_movements',
    'prodx_inventory_ledger',
    'prodx_audit_log',
  ];
  const rlsRes = await pool.query<{ relname: string; relrowsecurity: boolean }>(
    `SELECT relname, relrowsecurity
       FROM pg_class
      WHERE relname = ANY($1::text[])`,
    [rlsTables],
  );
  assert.equal(rlsRes.rows.length, rlsTables.length);
  for (const row of rlsRes.rows) {
    assert.equal(row.relrowsecurity, true, `RLS must be enabled on ${row.relname}`);
  }

  // 3. Verify least-privilege prodx_app role flags
  const roleRes = await pool.query<{
    rolname: string;
    rolsuper: boolean;
    rolbypassrls: boolean;
    rolcreatedb: boolean;
    rolcreaterole: boolean;
  }>(
    `SELECT rolname, rolsuper, rolbypassrls, rolcreatedb, rolcreaterole
       FROM pg_roles
      WHERE rolname = 'prodx_app'`,
  );
  assert.equal(roleRes.rows.length, 1, 'prodx_app role must exist');
  assert.equal(roleRes.rows[0].rolsuper, false, 'prodx_app must not be superuser');
  assert.equal(roleRes.rows[0].rolbypassrls, false, 'prodx_app must not bypass RLS');
  assert.equal(roleRes.rows[0].rolcreatedb, false, 'prodx_app must not have CREATEDB');
  assert.equal(roleRes.rows[0].rolcreaterole, false, 'prodx_app must not have CREATEROLE');
});
