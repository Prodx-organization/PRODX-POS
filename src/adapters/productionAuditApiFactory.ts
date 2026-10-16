import { auditApi as mockAuditApi } from './mockAdapter';
import { createProductionAuditApi } from './productionAuditApi';
import type { IAuditApi } from './types';

import { shouldReadMock } from './env';

export const createAuditApi = (token: string): IAuditApi => {
  if (shouldReadMock()) return mockAuditApi;
  return createProductionAuditApi(token);
};
