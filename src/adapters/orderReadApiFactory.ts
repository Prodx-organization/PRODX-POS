import { createProductionOrderReadApi, IProductionOrderReadApi } from './productionOrderReadApi';
import { orderApi as mockOrderApi } from './mockAdapter';

const isDevMock = import.meta.env.DEV && !import.meta.env.VITE_AUTH_API_BASE_URL;

const mockOrderReadAdapter: IProductionOrderReadApi = {
  getOrders: (limit = 50) => mockOrderApi.getOrders('store-flagship-downtown', limit),
};

export function createOrderReadApi(token: string): IProductionOrderReadApi {
  return isDevMock ? mockOrderReadAdapter : createProductionOrderReadApi(token);
}
