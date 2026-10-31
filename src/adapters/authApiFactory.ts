/**
 * Production authentication uses the PRODX backend as the password verifier.
 * The backend owns credential hashing, compromised-password screening,
 * rate limiting, device/store scope and short-lived POS sessions.
 */
import { IAuthApi } from './types';
import { developmentMockAuthApi } from './developmentMockAuthApi';
import { createProductionAuthApi } from './productionAuthApi';
import { createSupabaseAuthApi } from './supabaseAuthApi';

const productionAuthApi: IAuthApi = createProductionAuthApi();
const supabaseAuthApi: IAuthApi = createSupabaseAuthApi();
const authProvider = import.meta.env.VITE_AUTH_PROVIDER?.trim().toLowerCase();

// Supabase Auth is opt-in until first-tenant bootstrap and identity binding are fully verified.
// Only explicit local development may use mock authentication. Production and preview
// builds must use a real server-authoritative provider or fail closed.
if (!import.meta.env.DEV && authProvider !== 'supabase' && authProvider !== 'production') {
  throw new Error('Authentication provider must be explicitly configured for non-development builds.');
}

export const authApi: IAuthApi = import.meta.env.DEV
  ? developmentMockAuthApi
  : authProvider === 'supabase'
    ? supabaseAuthApi
    : productionAuthApi;
