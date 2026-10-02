import type { Express, NextFunction, Request, Response } from 'express';
import { requirePermission } from './createApp';
import type { TransactionalSqlExecutor } from '../db/transaction';
import {
  createTimeclockService,
  TimeclockAuthenticationError,
  TimeclockConflictError,
  TimeclockLockedError,
  TimeclockValidationError,
} from '../shift/timeclock-service';

const error = (res: Response, req: Request, status: number, code: string, message: string) =>
  res.status(status).json({ error: { code, message, requestId: req.id } });

export const registerTimeclockRoute = (app: Express, db: TransactionalSqlExecutor) => {
  const service = createTimeclockService(db);
  const context = (req: Request) => {
    const principal = req.prodxContext?.principal;
    if (!principal) throw new TimeclockValidationError('Request context is required.');
    return {
      organizationId: principal.organizationId,
      storeId: principal.storeId,
      userId: principal.userId,
    };
  };

  app.post('/api/v1/timeclock/clock-in', requirePermission('timeclock.use'), async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = req.body as { pin?: string; idempotencyKey?: string };
      if (typeof body?.pin !== 'string' || typeof body?.idempotencyKey !== 'string') {
        return error(res, req, 400, 'INVALID_REQUEST', 'PIN and idempotencyKey are required.');
      }
      return res.status(201).json(await service.clockIn(context(req), body.pin, body.idempotencyKey));
    } catch (e) {
      if (e instanceof TimeclockValidationError) return error(res, req, 400, e.code, e.message);
      if (e instanceof TimeclockAuthenticationError) return error(res, req, 401, e.code, e.message);
      if (e instanceof TimeclockLockedError) return error(res, req, 423, e.code, e.message);
      if (e instanceof TimeclockConflictError) return error(res, req, 409, e.code, e.message);
      return next(e);
    }
  });

  app.post('/api/v1/timeclock/clock-out', requirePermission('timeclock.use'), async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = req.body as { pin?: string; idempotencyKey?: string };
      if (typeof body?.pin !== 'string' || typeof body?.idempotencyKey !== 'string') {
        return error(res, req, 400, 'INVALID_REQUEST', 'PIN and idempotencyKey are required.');
      }
      return res.json(await service.clockOut(context(req), body.pin, body.idempotencyKey));
    } catch (e) {
      if (e instanceof TimeclockValidationError) return error(res, req, 400, e.code, e.message);
      if (e instanceof TimeclockAuthenticationError) return error(res, req, 401, e.code, e.message);
      if (e instanceof TimeclockLockedError) return error(res, req, 423, e.code, e.message);
      if (e instanceof TimeclockConflictError) return error(res, req, 409, e.code, e.message);
      return next(e);
    }
  });

  app.get('/api/v1/timeclock/records', requirePermission('timeclock.use'), async (req: Request, res: Response, next: NextFunction) => {
    try {
      return res.json(await service.getRecords(context(req), Number(req.query.limit ?? 100)));
    } catch (e) {
      if (e instanceof TimeclockValidationError) return error(res, req, 400, e.code, e.message);
      return next(e);
    }
  });

  app.post('/api/v1/timeclock/credentials', requirePermission('timeclock.manage'), async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = req.body as { userId?: string; pin?: string };
      if (typeof body?.userId !== 'string' || typeof body?.pin !== 'string') {
        return error(res, req, 400, 'INVALID_REQUEST', 'userId and PIN are required.');
      }
      await service.provisionPin(context(req), body.userId, body.pin);
      return res.status(204).send();
    } catch (e) {
      if (e instanceof TimeclockValidationError) return error(res, req, 400, e.code, e.message);
      if (e instanceof TimeclockConflictError) return error(res, req, 409, e.code, e.message);
      return next(e);
    }
  });
};
