import assert from 'node:assert/strict';
import test from 'node:test';
import { Pool } from 'pg';

const databaseUrl = process.env.DATABASE_URL;
const shouldRun = Boolean(databaseUrl) && process.env.NODE_ENV !== 'production';

const MIGRATION_TABLES = ['prodx_schema_migrations', 'prodx_migration_lock'];

// Schema-ownership guard. Migrations 0033/0034/0036 only classify tables named public.prodx_*.
// This test fails if a POS table is ever created without that prefix (it would silently escape
// RLS classification), and proves tables owned by other applications that share the database
// are unreachable from the prodx_app runtime role.
test('every POS table is prodx_-prefixed, has RLS enabled, and prodx_app cannot reach foreign tables', { skip: !shouldRun }, async () => {
  const pool = new Pool({ connectionString: databaseUrl, max: 1 });
  try {
    const tables = await pool.query<{ relname: string; rls: boolean }>(
      `SELECT c.relname, c.relrowsecurity AS rls
         FROM pg_class c
         JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p')
        ORDER BY c.relname`,
    );

    const unprefixed = tables.rows.filter((row) => !row.relname.startsWith('prodx_')).map((row) => row.relname);
    assert.deepEqual(
      unprefixed,
      [],
      'POS tables must be named public.prodx_*; migrations 0033/0034/0036 do not classify other tables',
    );

    const withoutRls = tables.rows
      .filter((row) => row.relname.startsWith('prodx_') && !MIGRATION_TABLES.includes(row.relname) && !row.rls)
      .map((row) => row.relname);
    assert.deepEqual(withoutRls, [], 'every PRODX table except migration bookkeeping must have RLS enabled');

    const migrationTablePrivileges = await pool.query<{ relname: string; can_select: boolean; can_write: boolean }>(
      `SELECT relname,
              has_table_privilege('prodx_app', format('public.%I', relname), 'SELECT') AS can_select,
              has_table_privilege('prodx_app', format('public.%I', relname), 'INSERT,UPDATE,DELETE') AS can_write
         FROM unnest($1::text[]) AS relname`,
      [MIGRATION_TABLES],
    );
    for (const row of migrationTablePrivileges.rows) {
      assert.equal(row.can_select, false, `${row.relname} must not be readable by prodx_app`);
      assert.equal(row.can_write, false, `${row.relname} must not be writable by prodx_app`);
    }

    // A table created later by another application in the same database must not inherit access.
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('CREATE TABLE public.zz_foreign_owner_roles (user_id uuid PRIMARY KEY, role text NOT NULL)');
      const privileges = await client.query<{ can_select: boolean; can_write: boolean }>(
        `SELECT has_table_privilege('prodx_app', 'public.zz_foreign_owner_roles', 'SELECT') AS can_select,
                has_table_privilege('prodx_app', 'public.zz_foreign_owner_roles', 'INSERT,UPDATE,DELETE') AS can_write`,
      );
      assert.deepEqual(privileges.rows[0], { can_select: false, can_write: false });
    } finally {
      await client.query('ROLLBACK').catch(() => undefined);
      client.release();
    }
  } finally {
    await pool.end();
  }
});
