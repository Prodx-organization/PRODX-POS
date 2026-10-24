import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveProductionDatabaseUrl } from '../../supabase/functions/prodx-db-broker/url';

test('production database broker rewrites the PRODX-POS direct host and preserves the runtime role', () => {
  assert.equal(
    resolveProductionDatabaseUrl('postgresql://prodx_app:runtime-secret@db.bbxoywnlayduqbrjeixj.supabase.co:5432/postgres'),
    'postgresql://prodx_app.bbxoywnlayduqbrjeixj:runtime-secret@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres?sslmode=require',
  );
});

test('production database broker preserves the correctly qualified runtime role and forces TLS', () => {
  assert.equal(
    resolveProductionDatabaseUrl('postgresql://prodx_app.bbxoywnlayduqbrjeixj:runtime-secret@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres?sslmode=disable'),
    'postgresql://prodx_app.bbxoywnlayduqbrjeixj:runtime-secret@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres?sslmode=require',
  );
});

test('production database broker rejects the administrative role on the direct host', () => {
  assert.throws(
    () => resolveProductionDatabaseUrl('postgresql://postgres:secret@db.bbxoywnlayduqbrjeixj.supabase.co:5432/postgres'),
    /dedicated prodx_app role/,
  );
});

test('production database broker rejects the qualified administrative role on the pooler', () => {
  assert.throws(
    () => resolveProductionDatabaseUrl('postgresql://postgres.bbxoywnlayduqbrjeixj:secret@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres'),
    /dedicated prodx_app role/,
  );
});

test('production database broker rejects an HTTP project URL instead of returning it as a database URL', () => {
  assert.throws(
    () => resolveProductionDatabaseUrl('https://bbxoywnlayduqbrjeixj.supabase.co'),
    /must use the PostgreSQL protocol/,
  );
});

test('production database broker rejects unsupported database hosts', () => {
  assert.throws(
    () => resolveProductionDatabaseUrl('postgresql://prodx_app:secret@db.example.com:5432/postgres'),
    /approved Supabase endpoint/,
  );
});

test('production database broker rejects the previous project pooler', () => {
  assert.throws(
    () => resolveProductionDatabaseUrl('postgresql://prodx_app:secret@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres'),
    /approved Supabase endpoint/,
  );
});

test('production database broker rejects a pooler username qualified for another project', () => {
  assert.throws(
    () => resolveProductionDatabaseUrl('postgresql://prodx_app.otherproject:secret@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres'),
    /dedicated prodx_app role/,
  );
});
