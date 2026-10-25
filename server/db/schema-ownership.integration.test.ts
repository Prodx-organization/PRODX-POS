import assert from 'node:assert/strict';
import test from 'node:test';
import { Pool } from 'pg';

const databaseUrl = process.env.DATABASE_URL;
const shouldRun = Boolean(databaseUrl) && process.env.NODE_ENV !== 'production';

const MIGRATION_TABLES = ['prodx_schema_migrations', 'prodx_migration_lock'];

// Schema-ownership guard. Migrations 0033/0034/0036 classify only public.prodx_* objects.
// Verify every PRODX table has RLS and that shared foreign tables/sequences remain inaccessible
// to the runtime role, including objects created after the migrations.
test('PRODX tables have RLS and foreign objects remain inaccessible to prodx_app', { skip: !shouldRun }, async () => {
  const pool = new Pool({ connectionString: databaseUrl, max: 1 });
  try {
    const tables = await pool.query<{ relname: string; rls: boolean }>(
      `SELECT c.relname, c.relrowsecurity AS rls
         FROM pg_class c
         JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p')
        ORDER BY c.relname`,
    );

    // Other applications may legitimately own unprefixed public tables (for example
    // Owner Console tables). Verify those objects are not reachable by prodx_app instead
    // of requiring the shared public schema to contain only PRODX tables.
    const foreignTables = tables.rows
      .filter((row) => !row.relname.startsWith('prodx_'))
      .map((row) => row.relname);
    const foreignTablePrivileges = await pool.query<{
      relname: string;
      can_select: boolean;
      can_write: boolean;
    }>(
      `SELECT foreign_table.relname,
              has_table_privilege('prodx_app', format('public.%I', foreign_table.relname), 'SELECT') AS can_select,
              has_table_privilege('prodx_app', format('public.%I', foreign_table.relname), 'INSERT,UPDATE,DELETE') AS can_write
         FROM unnest($1::text[]) AS foreign_table(relname)
        ORDER BY foreign_table.relname`,
      [foreignTables],
    );
    for (const row of foreignTablePrivileges.rows) {
      assert.equal(row.can_select, false, `foreign table ${row.relname} must not be readable by prodx_app`);
      assert.equal(row.can_write, false, `foreign table ${row.relname} must not be writable by prodx_app`);
    }

    const foreignSequences = await pool.query<{ relname: string }>(
      `SELECT c.relname
         FROM pg_class c
         JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public'
          AND c.relkind = 'S'
          AND c.relname NOT LIKE 'prodx\\_%' ESCAPE '\\'
        ORDER BY c.relname`,
    );
    const foreignSequencePrivileges = await pool.query<{
      relname: string;
      can_use: boolean;
      can_select: boolean;
    }>(
      `SELECT foreign_sequence.relname,
              has_sequence_privilege('prodx_app', format('public.%I', foreign_sequence.relname), 'USAGE') AS can_use,
              has_sequence_privilege('prodx_app', format('public.%I', foreign_sequence.relname), 'SELECT') AS can_select
         FROM unnest($1::text[]) AS foreign_sequence(relname)
        ORDER BY foreign_sequence.relname`,
      [foreignSequences.rows.map((row) => row.relname)],
    );
    for (const row of foreignSequencePrivileges.rows) {
      assert.equal(row.can_use, false, `foreign sequence ${row.relname} must not be usable by prodx_app`);
      assert.equal(row.can_select, false, `foreign sequence ${row.relname} must not be readable by prodx_app`);
    }

    const defaultPrivileges = await pool.query<{ object_type: string; privilege_type: string }>(
      `SELECT d.defaclobjtype::text AS object_type, acl.privilege_type
         FROM pg_default_acl d
         CROSS JOIN LATERAL aclexplode(d.defaclacl) AS acl
         JOIN pg_roles grantee ON grantee.oid = acl.grantee
        WHERE grantee.rolname = 'prodx_app'
          AND d.defaclrole = (SELECT oid FROM pg_roles WHERE rolname = current_user)
          AND d.defaclnamespace IN (0::oid, 'public'::regnamespace::oid)
          AND d.defaclobjtype IN ('r', 'S')
          AND acl.privilege_type IN ('SELECT', 'INSERT', 'UPDATE', 'DELETE', 'USAGE')
        ORDER BY d.defaclobjtype, acl.privilege_type`,
    );
    assert.deepEqual(
      defaultPrivileges.rows,
      [],
      'prodx_app must not receive schema-wide or global default privileges for future tables/sequences',
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
      await client.query('CREATE TABLE public.zz_foreign_owner_roles (id bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY, user_id uuid, role text NOT NULL)');
      const privileges = await client.query<{
        can_select: boolean;
        can_write: boolean;
        sequence_can_use: boolean;
        sequence_can_select: boolean;
      }>(
        `SELECT has_table_privilege('prodx_app', 'public.zz_foreign_owner_roles', 'SELECT') AS can_select,
                has_table_privilege('prodx_app', 'public.zz_foreign_owner_roles', 'INSERT,UPDATE,DELETE') AS can_write,
                has_sequence_privilege('prodx_app', pg_get_serial_sequence('public.zz_foreign_owner_roles', 'id'), 'USAGE') AS sequence_can_use,
                has_sequence_privilege('prodx_app', pg_get_serial_sequence('public.zz_foreign_owner_roles', 'id'), 'SELECT') AS sequence_can_select`,
      );
      assert.deepEqual(privileges.rows[0], {
        can_select: false,
        can_write: false,
        sequence_can_use: false,
        sequence_can_select: false,
      });
    } finally {
      await client.query('ROLLBACK').catch(() => undefined);
      client.release();
    }
  } finally {
    await pool.end();
  }
});
