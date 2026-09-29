import 'dotenv/config';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import pg from 'pg';

const { Pool } = pg;

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL is required for Railway test migrations.');

const pool = new Pool({ connectionString: databaseUrl, max: 4 });

try {
  const directory = path.resolve('db/migrations');
  const files = (await readdir(directory))
    .filter((name) => name.endsWith('.sql'))
    .sort();

  if (files.length === 0) throw new Error('No SQL migrations found.');

  for (const file of files) {
    const sql = await readFile(path.join(directory, file), 'utf8');
    process.stdout.write(`Applying ${file}\\n`);
    await pool.query(sql);
  }

  process.stdout.write(`Applied ${files.length} migrations.\\n`);
} finally {
  await pool.end();
}
