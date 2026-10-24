import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getOwnerSupabaseConfig,
  getPosSupabaseConfig,
  type SupabaseClientEnvironment,
} from './supabaseClientConfig';

const isolatedEnvironment: SupabaseClientEnvironment = {
  VITE_SUPABASE_URL: 'https://pos-project.supabase.co',
  VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_pos',
  VITE_OWNER_SUPABASE_URL: 'https://owner-project.supabase.co',
  VITE_OWNER_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_owner',
};

test('POS and Owner clients resolve only their own URL and publishable key', () => {
  assert.deepEqual(getPosSupabaseConfig(isolatedEnvironment), {
    url: 'https://pos-project.supabase.co',
    publishableKey: 'sb_publishable_pos',
  });
  assert.deepEqual(getOwnerSupabaseConfig(isolatedEnvironment), {
    url: 'https://owner-project.supabase.co',
    publishableKey: 'sb_publishable_owner',
  });
});

test('missing POS configuration fails closed without falling back to Owner credentials', () => {
  assert.throws(
    () => getPosSupabaseConfig({
      VITE_OWNER_SUPABASE_URL: isolatedEnvironment.VITE_OWNER_SUPABASE_URL,
      VITE_OWNER_SUPABASE_PUBLISHABLE_KEY: isolatedEnvironment.VITE_OWNER_SUPABASE_PUBLISHABLE_KEY,
    }),
    /VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY/,
  );
});

test('missing Owner configuration fails closed without falling back to POS credentials', () => {
  assert.throws(
    () => getOwnerSupabaseConfig({
      VITE_SUPABASE_URL: isolatedEnvironment.VITE_SUPABASE_URL,
      VITE_SUPABASE_PUBLISHABLE_KEY: isolatedEnvironment.VITE_SUPABASE_PUBLISHABLE_KEY,
    }),
    /VITE_OWNER_SUPABASE_URL and VITE_OWNER_SUPABASE_PUBLISHABLE_KEY/,
  );
});

test('rejects non-HTTPS remote URLs and URLs embedding credentials', () => {
  assert.throws(
    () => getPosSupabaseConfig({
      VITE_SUPABASE_URL: 'http://pos-project.supabase.co',
      VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_pos',
    }),
    /must use HTTPS/,
  );
  assert.throws(
    () => getOwnerSupabaseConfig({
      VITE_OWNER_SUPABASE_URL: 'https://user:password@owner-project.supabase.co',
      VITE_OWNER_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_owner',
    }),
    /must not contain credentials/,
  );
});

test('permits localhost HTTP for local Supabase development only', () => {
  assert.deepEqual(getPosSupabaseConfig({
    VITE_SUPABASE_URL: 'http://127.0.0.1:54321/',
    VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_local',
  }), {
    url: 'http://127.0.0.1:54321',
    publishableKey: 'sb_publishable_local',
  });
});
