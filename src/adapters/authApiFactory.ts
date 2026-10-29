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

// Supabase Auth is opt-in until first-tenant bootstrap and identity binding are fully verified.
export const authApi: IAuthApi = authProvider === 'supabase'
  ? supabaseAuthApi
  : import.meta.env.DEV ? mockAuthApi : productionAuthApi;

