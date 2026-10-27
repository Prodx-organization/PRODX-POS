/**
 * Production authentication uses the PRODX backend as the password verifier.
 * The backend owns credential hashing, compromised-password screening,
 * rate limiting, device/store scope and short-lived POS sessions.
 */
import { IAuthApi } from './types';
import { authApi as mockAuthApi } from './mockAdapter';
import { createProductionAuthApi } from './productionAuthApi';
import { createSupabaseAuthApi } from './supabaseAuthApi';

const productionAuthApi: IAuthApi = createProductionAuthApi();
const supabaseAuthApi: IAuthApi = createSupabaseAuthApi();
const authProvider = import.meta.env.VITE_AUTH_PROVIDER?.trim().toLowerCase();

// Opt-in only: enable after each POS Auth user is explicitly linked to a POS staff record.
// The backend verifies issuer, signature, tenant/store scope and admin role before issuing a POS session.
export const authApi: IAuthApi = authProvider === 'supabase'
  ? supabaseAuthApi
  : import.meta.env.DEV ? mockAuthApi : productionAuthApi;

