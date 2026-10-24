import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveOwnerDatabaseUrl } from './owner-postgres';

test('Owner database configuration is separate from DATABASE_URL and fails closed when missing', () => {
  const previousOwner = process.env.OWNER_DATABASE_URL;
  const previousPos = process.env.DATABASE_URL;
  try {
    delete process.env.OWNER_DATABASE_URL;
    process.env.DATABASE_URL = 'postgresql://pos.example.invalid/pos';
    assert.throws(() => resolveOwnerDatabaseUrl(), /OWNER_DATABASE_URL is required/);
    assert.equal(process.env.DATABASE_URL, 'postgresql://pos.example.invalid/pos');
  } finally {
    if (previousOwner === undefined) delete process.env.OWNER_DATABASE_URL;
    else process.env.OWNER_DATABASE_URL = previousOwner;
    if (previousPos === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = previousPos;
  }
});

test('Owner database URL must use PostgreSQL and include connection components', () => {
  assert.throws(() => resolveOwnerDatabaseUrl('https://example.com'), /PostgreSQL protocol/);
  assert.throws(() => resolveOwnerDatabaseUrl('postgresql://'), /valid PostgreSQL connection URL/);
  assert.equal(resolveOwnerDatabaseUrl('postgresql://owner:secret@localhost:5432/owner'), 'postgresql://owner:secret@localhost:5432/owner');
});
