import { createProductionAuditApi } from './productionAuditApi';
import type { IAuditApi } from './types';

export const createAuditApi = (token: string): IAuditApi => createProductionAuditApi(token);
