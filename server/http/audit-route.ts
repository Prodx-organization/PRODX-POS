import type { Express, NextFunction, Request, Response } from 'express';
import { requirePermission } from './createApp';
import type { SqlQueryExecutor } from '../db/transaction';
import { AuditValidationError, createAuditReadService } from '../audit/audit-service';

export const registerAuditRoute = (app: Express, db: SqlQueryExecutor): void => {
  const service = createAuditReadService(db);
  app.get('/api/v1/audit/logs', requirePermission('audit.read'), async (request: Request, response: Response, next: NextFunction) => {
    try {
      const context = request.prodxContext;
      if (!context) {
        response.status(500).json({ error: { code: 'REQUEST_CONTEXT_MISSING', message: 'Request context is required.', requestId: request.id } });
        return;
      }
      const rawLimit = typeof request.query.limit === 'string' ? Number(request.query.limit) : undefined;
      response.json(await service.getLogs(context.principal.storeId, rawLimit));
    } catch (error) {
      if (error instanceof AuditValidationError) {
        response.status(400).json({ error: { code: error.code, message: error.message, requestId: request.id } });
        return;
      }
      next(error);
    }
  });

  app.post('/api/v1/audit/logs', async (request: Request, response: Response, next: NextFunction) => {
    try {
      const context = request.prodxContext;
      if (!context) {
        response.status(500).json({ error: { code: 'REQUEST_CONTEXT_MISSING', message: 'Request context is required.', requestId: request.id } });
        return;
      }
      const body = (request.body ?? {}) as Record<string, unknown>;
      const requestedStoreId = typeof body.storeId === 'string' && body.storeId.trim() ? body.storeId.trim() : context.principal.storeId;
      if (requestedStoreId !== context.principal.storeId) {
        response.status(403).json({ error: { code: 'STORE_SCOPE_MISMATCH', message: 'Audit log storeId must match authenticated store scope.', requestId: request.id } });
        return;
      }
      const entry = await service.recordEvent({
        organizationId: context.principal.organizationId,
        storeId: context.principal.storeId,
        userId: context.principal.userId,
        userName: typeof body.userName === 'string' ? body.userName : undefined,
        userRole: typeof body.userRole === 'string' ? body.userRole : undefined,
        registerId: typeof body.registerId === 'string' ? body.registerId : undefined,
        action: typeof body.action === 'string' ? body.action : '',
        severity: typeof body.severity === 'string' ? body.severity : 'info',
        details: body.details,
      });
      response.status(201).json(entry);
    } catch (error) {
      if (error instanceof AuditValidationError) {
        response.status(400).json({ error: { code: error.code, message: error.message, requestId: request.id } });
        return;
      }
      next(error);
    }
  });
};
