import { orderApi as mockOrderApi } from './mockAdapter';
import { createProductionOrderTransactionApi } from './productionOrderTransactionApi';

import { shouldReadMock } from './env';

export function createOrderTransactionApi(token: string) {
  if (shouldReadMock()) return mockOrderApi;
  return createProductionOrderTransactionApi(token);
}
