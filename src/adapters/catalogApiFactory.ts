import { createProductionCatalogReadApi, createProductionCatalogApi } from './productionCatalogApi';
import type { ICatalogApi } from './types';

export const createCatalogReadApi = (token: string) => createProductionCatalogReadApi(token);
export const createCatalogApi = (token: string): ICatalogApi => createProductionCatalogApi(token);
