import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import pg from 'pg';

const { Pool } = pg;
const migrationDir = path.resolve(process.cwd(), 'db/migrations');
const migrationFiles = (await readdir(migrationDir))
  .filter((name) => /^\d+_.+\.sql$/.test(name))
  .sort((a, b) => a.localeCompare(b));

if (migrationFiles.length === 0) throw new Error('No database migrations found.');

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL is required for database migrations.');

const pool = new Pool({ connectionString: databaseUrl });
const client = await pool.connect();

try {
  await client.query('BEGIN');
  await client.query("SELECT pg_advisory_xact_lock(hashtextextended('prodx-pos:migrations', 0))");

  for (const file of migrationFiles) {
    const version = file.slice(0, -'.sql'.length);
    const result = await client.query(
      'SELECT 1 FROM prodx_schema_migrations WHERE version = $1 LIMIT 1',
      [version],
    ).catch((error: unknown) => {
      if (version === '0001_m0_foundation') return { rowCount: 0 };
      throw error;
    });

    if (result.rowCount === 1) continue;

    const sql = await readFile(path.join(migrationDir, file), 'utf8');
    if (!sql.trim()) throw new Error(`Migration ${version} is empty.`);

    console.log(`Applying migration ${version}`);
    await client.query(sql);

    const recorded = await client.query(
      'SELECT 1 FROM prodx_schema_migrations WHERE version = $1 LIMIT 1',
      [version],
    );
    if (recorded.rowCount !== 1) {
      throw new Error(`Migration ${version} completed without recording its version.`);
    }
  }

  await client.query('COMMIT');
  console.log(`Database migrations verified: ${migrationFiles.length} migration files.`);
} catch (error) {
  await client.query('ROLLBACK');
  throw error;
} finally {
  client.release();
  await pool.end();
}
