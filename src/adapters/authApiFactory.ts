/**
 * Authentication adapter selection.
 *
 * Development keeps the local mock adapter. Production uses Supabase Auth
 * for identity and exchanges the verified Supabase JWT for the POS server's
 * short-lived, store-scoped session token.
 */
import { IAuthApi } from './types';
import { authApi as mockAuthApi } from './mockAdapter';
import { createSupabaseAuthApi } from './supabaseAuthApi';

const productionAuthApi: IAuthApi = createSupabaseAuthApi();

export const authApi: IAuthApi = import.meta.env.DEV ? mockAuthApi : productionAuthApi;
