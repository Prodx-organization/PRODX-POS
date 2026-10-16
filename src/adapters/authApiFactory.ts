/**
 * Production authentication uses the PRODX backend as the password verifier.
 * The backend owns credential hashing, compromised-password screening,
 * rate limiting, device/store scope and short-lived POS sessions.
 */
import { IAuthApi } from './types';
import { authApi as mockAuthApi } from './mockAdapter';
import { createProductionAuthApi } from './productionAuthApi';

import { shouldReadMock } from './env';

const productionAuthApi: IAuthApi = createProductionAuthApi();

export const authApi: IAuthApi = shouldReadMock() ? mockAuthApi : productionAuthApi;
