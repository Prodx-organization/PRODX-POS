import { createProductionShiftApi } from './productionShiftApi';
import { MockShiftApi } from './mockAdapter';
import type { IShiftApi } from './types';

export const createShiftApi=(token:string):IShiftApi=>import.meta.env.DEV ? new MockShiftApi() : createProductionShiftApi(token);
