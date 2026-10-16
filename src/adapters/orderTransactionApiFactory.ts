import { orderApi as mockOrderApi } from './mockAdapter';
import { createProductionOrderTransactionApi } from './productionOrderTransactionApi';

export function createOrderTransactionApi(token: string) {
  const isMockDisabled = localStorage.getItem('prodx_disable_mocks') === 'true';
  if (import.meta.env.DEV && !isMockDisabled) return mockOrderApi;
  return createProductionOrderTransactionApi(token);
}
