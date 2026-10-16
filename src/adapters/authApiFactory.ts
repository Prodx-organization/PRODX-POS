/**
 * Production authentication uses the PRODX backend as the password verifier.
 * The backend owns credential hashing, compromised-password screening,
 * rate limiting, device/store scope and short-lived POS sessions.
 */
import { IAuthApi } from './types';
import { authApi as mockAuthApi } from './mockAdapter';
import { createProductionAuthApi } from './productionAuthApi';

const productionAuthApi: IAuthApi = createProductionAuthApi();

const isMockDisabled = typeof localStorage !== 'undefined' && localStorage.getItem('prodx_disable_mocks') === 'true';

export const authApi: IAuthApi = (import.meta.env.DEV && !isMockDisabled) ? mockAuthApi : productionAuthApi;
