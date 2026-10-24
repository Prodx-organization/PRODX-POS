import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveOwnerDatabaseUrl } from './owner-postgres';

const valid = 'postgresql://owner_user:secret@db.bbxoywnlayduqbrjeixj.supabase.co:5432/postgres';

test('Owner database resolver requires OWNER_DATABASE_URL and never falls back to DATABASE_URL', () => {
  assert.throws(() => resolveOwnerDatabaseUrl(undefined), /OWNER_DATABASE_URL is required/);
  assert.throws(() => resolveOwnerDatabaseUrl(''), /OWNER_DATABASE_URL is required/);
});

test('Owner database resolver accepts the dedicated Owner Supabase endpoint', () => {
  assert.equal(resolveOwnerDatabaseUrl(valid), valid);
});

test('Owner database resolver rejects invalid protocols and other database hosts', () => {
  assert.throws(() => resolveOwnerDatabaseUrl('https://user:pass@db.bbxoywnlayduqbrjeixj.supabase.co/postgres'), /PostgreSQL protocol/);
  assert.throws(() => resolveOwnerDatabaseUrl('postgresql://user:pass@db.sjgwesmmpegtzsqqqhvd.supabase.co/postgres'), /isolated Owner/);
  assert.throws(() => resolveOwnerDatabaseUrl('postgresql://user:pass@other.example.com/postgres'), /isolated Owner/);
});
