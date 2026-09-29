import type { Express, Request, Response } from 'express';
import { requirePermission } from './createApp';
import { createVoidService, VoidConflictError, VoidProviderUnavailableError, VoidValidationError } from '../transactions/void-service';
import type { TransactionalSqlExecutor } from '../db/transaction';

type VoidBody = { orderId: string; reason: string; idempotencyKey: string; supervisorAuthorizationToken: string; };
const valid = (value: unknown): value is VoidBody => {
  if (!value || typeof value !== 'object') return false;
  const body = value as Record<string, unknown>;
  return typeof body.orderId === 'string' && body.orderId.trim().length > 0 &&
    typeof body.reason === 'string' && body.reason.trim().length > 0 &&
    typeof body.idempotencyKey === 'string' && body.idempotencyKey.trim().length > 0 &&
    typeof body.supervisorAuthorizationToken === 'string' && body.supervisorAuthorizationToken.trim().length > 0;
};

export const registerVoidRoute = (app: Express, db: TransactionalSqlExecutor): void => {
  const service = createVoidService(db);
  app.post('/api/v1/orders/void', requirePermission('pos.void'), async (request: Request, response: Response) => {
    const context = request.prodxContext;
    if (!context) {
      response.status(500).json({ error: { code: 'REQUEST_CONTEXT_MISSING', message: 'Request context is required.', requestId: request.id } });
      return;
    }
    const sessionId = 'sessionId' in context.principal && typeof context.principal.sessionId === 'string' ? context.principal.sessionId : null;
    if (!sessionId) {
      response.status(500).json({ error: { code: 'SESSION_CONTEXT_MISSING', message: 'Authenticated session context is required.', requestId: request.id } });
      return;
    }
    if (!valid(request.body)) {
      response.status(400).json({ error: { code: 'VOID_VALIDATION_FAILED', message: 'The void request body is malformed.', requestId: request.id } });
      return;
    }
    try {
      const result = await service.voidOrder({
        storeId: context.principal.storeId,
        orderId: request.body.orderId,
        reason: request.body.reason,
        idempotencyKey: request.body.idempotencyKey,
        requesterUserId: context.principal.userId,
        requesterSessionId: sessionId,
        supervisorAuthorizationToken: request.body.supervisorAuthorizationToken,
      });
      response.status(result.idempotencyCached ? 200 : 201).json(result);
    } catch (error) {
      if (error instanceof VoidValidationError) {
        response.status(400).json({ error: { code: error.code, message: error.message, requestId: request.id } });
        return;
      }
      if (error instanceof VoidConflictError) {
        response.status(409).json({ error: { code: error.code, message: error.message, requestId: request.id } });
        return;
      }
      if (error instanceof VoidProviderUnavailableError) {
        response.status(503).json({ error: { code: error.code, message: error.message, requestId: request.id } });
        return;
      }
      throw error;
    }
  });
};
