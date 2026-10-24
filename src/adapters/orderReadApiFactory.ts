import { orderApi as mockOrderReadApi } from './mockAdapter';
import { createProductionOrderReadApi } from './productionOrderReadApi';

import { shouldReadMock } from './env';

export function createOrderReadApi(token: string) {
  if (shouldReadMock()) return mockOrderReadApi;
  return createProductionOrderReadApi(token);
}
