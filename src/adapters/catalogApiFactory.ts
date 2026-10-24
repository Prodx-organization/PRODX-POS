import { catalogApi as mockCatalogApi } from './mockAdapter';
import { createProductionCatalogReadApi, createProductionCatalogApi } from './productionCatalogApi';
import type { ICatalogApi } from './types';

import { shouldReadMock } from './env';

export const createCatalogReadApi = (token: string) => {
  if (shouldReadMock()) return mockCatalogApi;
  return createProductionCatalogReadApi(token);
};

export const createCatalogApi = (token: string): ICatalogApi => {
  if (shouldReadMock()) return mockCatalogApi;
  return createProductionCatalogApi(token);
};
