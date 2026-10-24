import { shiftApi as mockShiftApi } from './mockAdapter';
import { createProductionShiftApi } from './productionShiftApi';
import type { IShiftApi } from './types';

import { shouldReadMock } from './env';

export const createShiftApi = (token: string): IShiftApi => {
  if (shouldReadMock()) return mockShiftApi;
  return createProductionShiftApi(token);
};
