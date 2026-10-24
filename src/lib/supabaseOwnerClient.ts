import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getOwnerSupabaseConfig } from './supabaseClientConfig';

let client: SupabaseClient | null = null;

/**
 * Owner Console Supabase client. Keep its project, issuer, and browser storage
 * isolated from the POS client.
 */
export function getOwnerSupabaseClient(): SupabaseClient {
  if (client) return client;

  const { url, publishableKey } = getOwnerSupabaseConfig(import.meta.env);
  client = createClient(url, publishableKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: window.sessionStorage,
      storageKey: 'prodx_owner_auth_session',
    },
  });
  return client;
}
