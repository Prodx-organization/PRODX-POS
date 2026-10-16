import type { Express, NextFunction, Request, Response } from 'express';
import { requirePermission } from './createApp';
import type { TransactionalSqlExecutor } from '../db/transaction';
import { AuditValidationError, createAuditReadService, createAuditWriteService } from '../audit/audit-service';

export const registerAuditRoute = (app: Express, db: TransactionalSqlExecutor): void => {
  const readService = createAuditReadService(db);
  const writeService = createAuditWriteService(db);

  app.get('/api/v1/audit/logs', requirePermission('audit.read'), async (request: Request, response: Response, next: NextFunction) => {
    try {
      const context = request.prodxContext;
      if (!context) {
        response.status(500).json({ error: { code: 'REQUEST_CONTEXT_MISSING', message: 'Request context is required.', requestId: request.id } });
        return;
      }
      const rawLimit = typeof request.query.limit === 'string' ? Number(request.query.limit) : undefined;
      response.json(await readService.getLogs(context.principal.storeId, rawLimit));
    } catch (error) {
      if (error instanceof AuditValidationError) {
        response.status(400).json({ error: { code: error.code, message: error.message, requestId: request.id } });
        return;
      }
      next(error);
    }
  });

  // Client-submitted audit events are supplemental records. Actor and tenant
  // scope always come from the authenticated server context, never the body.
  // Register identity is omitted until the authenticated device is mapped to a
  // canonical register row; client-supplied register IDs are not trusted.
  app.post('/api/v1/audit/logs', requirePermission('audit.write'), async (request: Request, response: Response, next: NextFunction) => {
    try {
      const context = request.prodxContext;
      if (!context) {
        response.status(500).json({ error: { code: 'REQUEST_CONTEXT_MISSING', message: 'Request context is required.', requestId: request.id } });
        return;
      }
      const body = request.body && typeof request.body === 'object' && !Array.isArray(request.body)
        ? request.body as Record<string, unknown>
        : {};
      const event = await writeService.recordEvent({
        organizationId: context.principal.organizationId,
        storeId: context.principal.storeId,
        userId: context.principal.userId,
        action: body.action,
        severity: body.severity,
        details: body.details,
      });
      response.status(201).json(event);
    } catch (error) {
      if (error instanceof AuditValidationError) {
        response.status(400).json({ error: { code: error.code, message: error.message, requestId: request.id } });
        return;
      }
      next(error);
    }
  });
};
