/**
 * Authentication adapter selection.
 *
 * Mock authentication is allowed only in Vite development mode. Production
 * builds always use the network adapter and fail closed when it is not
 * configured.
 */
import { IAuthApi } from './types';
import { productionAuthApi } from './authApi';
import { authApi as mockAuthApi } from './mockAdapter';

export const authApi: IAuthApi = import.meta.env.DEV ? mockAuthApi : productionAuthApi;
