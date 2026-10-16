/**
 * Production authentication uses the PRODX backend as the password verifier.
 * The backend owns credential hashing, compromised-password screening,
 * rate limiting, device/store scope and short-lived POS sessions.
 */
import { IAuthApi } from './types';
import { authApi as mockAuthApi } from './mockAdapter';
import { createProductionAuthApi } from './productionAuthApi';

const productionAuthApi: IAuthApi = createProductionAuthApi();

// Only an explicit development build may select the mock auth adapter.
// Missing production configuration must fail closed inside createProductionAuthApi.
export const authApi: IAuthApi = import.meta.env.DEV ? mockAuthApi : productionAuthApi;
