import { createProductionCatalogReadApi, createProductionCatalogApi, IProductionCatalogReadApi } from './productionCatalogApi';
import { catalogApi as mockCatalogApi } from './mockAdapter';
import type { ICatalogApi } from './types';

const isDevMock = import.meta.env.DEV && !import.meta.env.VITE_AUTH_API_BASE_URL;

const mockCatalogReadAdapter: IProductionCatalogReadApi = {
  getCategories: () => mockCatalogApi.getCategories('store-flagship-downtown'),
  getProducts: (categoryId, search) => mockCatalogApi.getProducts('store-flagship-downtown', categoryId, search),
  getProductByBarcode: (barcode) => mockCatalogApi.getProductByBarcode('store-flagship-downtown', barcode),
  getInventoryLedger: (productId) => mockCatalogApi.getInventoryLedger('store-flagship-downtown', productId),
  bulkUpdatePricing: (storeId, productIds, priceChangeType, value, userId) =>
    mockCatalogApi.bulkUpdatePricing(storeId, productIds, priceChangeType, value, userId),
  bulkImportProducts: (storeId, items, mode, userId, notes) =>
    mockCatalogApi.bulkImportProducts(storeId, items, mode, userId, notes),
};

export const createCatalogReadApi = (token: string): IProductionCatalogReadApi =>
  isDevMock ? mockCatalogReadAdapter : createProductionCatalogReadApi(token);

export const createCatalogApi = (token: string): ICatalogApi =>
  isDevMock ? mockCatalogApi : createProductionCatalogApi(token);
