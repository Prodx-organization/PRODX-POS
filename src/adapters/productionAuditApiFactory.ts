import { createProductionAuditApi } from './productionAuditApi';
import { MockAuditApi } from './mockAdapter';
import type { IAuditApi } from './types';

export const createAuditApi=(token:string):IAuditApi=>import.meta.env.DEV ? new MockAuditApi() : createProductionAuditApi(token);
