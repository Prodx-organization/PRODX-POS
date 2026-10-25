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

  try {
    const triggerRes = await pool.query<{ tgname: string; tgenabled: string }>(
      `SELECT tgname, tgenabled
         FROM pg_trigger
        WHERE tgname = 'prodx_audit_log_immutable_guard'
          AND NOT tgisinternal`,
    );
    assert.equal(triggerRes.rows.length, 1, 'prodx_audit_log_immutable_guard trigger must exist');
    assert.equal(triggerRes.rows[0].tgenabled, 'O', 'prodx_audit_log_immutable_guard trigger must be enabled');

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
  } catch (err: any) {
    if (err?.code === 'ECONNREFUSED' || err?.message?.includes('ECONNREFUSED')) {
      t.skip('PostgreSQL database not running locally (running in Firestore mode)');
      return;
    }
    throw err;
  }
});

test('Security Gate 5: RLS enablement migration must not alter tables owned by other applications', () => {
  const migration = fs.readFileSync(
    path.join(workspaceRoot, 'db/migrations/0034_security_enable_rls_all_tables.sql'),
    'utf8',
  );
  assert.match(migration, /c\.relname\s+LIKE\s+'prodx\\_%'\s+ESCAPE\s+'\\'/);
  assert.doesNotMatch(
    migration,
    /WHERE\s+n\.nspname\s*=\s*'public'\s+AND\s+c\.relkind\s*=\s*'r'\s+AND\s+c\.relname\s+NOT\s+IN/i,
    'RLS migration must not enable RLS indiscriminately on every public table',
  );
});

test('Security Gate 6: tenant RLS migration only classifies PRODX-owned tables and sequences', () => {
  const migration = fs.readFileSync(
    path.join(workspaceRoot, 'db/migrations/0036_security_tenant_store_rls.sql'),
    'utf8',
  );
  assert.match(migration, /c\.relname\s+LIKE\s+'prodx\\_%'\s+ESCAPE\s+'\\'/);
  assert.doesNotMatch(
    migration,
    /WHERE\s+n\.nspname\s*=\s*'public'\s+AND\s+c\.relkind\s*=\s*'r'\s+AND\s+c\.relname\s+NOT\s+IN/i,
    'Tenant RLS migration must not classify every table in public',
  );
  assert.doesNotMatch(
    migration,
    /REVOKE\s+USAGE\s*,\s*SELECT\s+ON\s+ALL\s+SEQUENCES\s+IN\s+SCHEMA\s+public/i,
    'Tenant RLS migration must not revoke sequence privileges from other applications',
  );
  assert.doesNotMatch(
    migration,
    /ALTER\s+DEFAULT\s+PRIVILEGES\s+IN\s+SCHEMA\s+public/i,
    'Tenant RLS migration must not alter schema-wide default privileges',
  );
});

test('Security Gate 7: shared-schema cleanup revokes only known PRODX grants from non-PRODX objects', () => {
  const migration = fs.readFileSync(
    path.join(workspaceRoot, 'db/migrations/0037_security_cleanup_shared_schema_grants.sql'),
    'utf8',
  );
  assert.match(migration, /DROP\s+POLICY\s+IF\s+EXISTS/i);
  assert.match(migration, /REVOKE\s+ALL\s+PRIVILEGES\s+ON\s+TABLE/i);
  assert.match(migration, /c\.relname\s+NOT\s+LIKE\s+'prodx\\_%'\s+ESCAPE\s+'\\'/);
  assert.match(migration, /VALUES\s*\('0037_security_cleanup_shared_schema_grants'\)/);
});

