import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getPosSupabaseConfig } from './supabaseClientConfig';

let client: SupabaseClient | null = null;

/**
 * Shared POS Supabase client. This is intentionally configured independently
 * from the Owner Console auth issuer and storage key.
 */
export function getPosSupabaseClient(): SupabaseClient {
  if (client) return client;

  const { url, publishableKey } = getPosSupabaseConfig(import.meta.env);
  client = createClient(url, publishableKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: window.sessionStorage,
      storageKey: 'prodx_pos_supabase_session',
    },
  });
  return client;
}
