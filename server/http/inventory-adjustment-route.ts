import type { Express, Request, Response } from 'express';
import { requirePermission } from './createApp';
import type { TransactionalSqlExecutor } from '../db/transaction';
import { createInventoryAdjustmentService, InventoryAdjustmentConflictError, InventoryAdjustmentValidationError } from '../transactions/inventory-adjustment-service';

const allowedReasons = new Set(['purchase_received','transfer_in','transfer_out','audit_count_adjustment','damaged_write_off']);

export const registerInventoryAdjustmentRoute = (app: Express, db: TransactionalSqlExecutor): void => {
  app.post('/api/v1/inventory/adjustments', requirePermission('inventory.adjust'), async (request: Request, response: Response) => {
    const context = request.prodxContext;
    if (!context) { response.status(500).json({ error: { code:'REQUEST_CONTEXT_MISSING', message:'Request context is required.', requestId:request.id } }); return; }
    const body=request.body as { productIds?: unknown; quantityDelta?: unknown; reason?: unknown; notes?: unknown; idempotencyKey?: unknown };
    const productIds=Array.isArray(body.productIds) ? body.productIds.filter((v): v is string => typeof v==='string') : [];
    const quantityDelta=typeof body.quantityDelta==='number' ? body.quantityDelta : NaN;
    const reason=typeof body.reason==='string' ? body.reason : '';
    if (!allowedReasons.has(reason)) { response.status(400).json({error:{code:'INVALID_INVENTORY_REASON',message:'Invalid inventory adjustment reason.',requestId:request.id}}); return; }
    try {
      const result=await createInventoryAdjustmentService(db).adjust({
        storeId:context.principal.storeId,
        organizationId:context.principal.organizationId,
        requesterUserId:context.principal.userId,
        productIds,
        quantityDelta,
        reason:reason as 'purchase_received'|'transfer_in'|'transfer_out'|'audit_count_adjustment'|'damaged_write_off',
        notes:typeof body.notes==='string'?body.notes:undefined,
        idempotencyKey:typeof body.idempotencyKey==='string'?body.idempotencyKey:'',
      });
      response.status(result.idempotencyCached?200:201).json(result);
    } catch(error) {
      if(error instanceof InventoryAdjustmentValidationError){response.status(400).json({error:{code:error.code,message:error.message,requestId:request.id}});return;}
      if(error instanceof InventoryAdjustmentConflictError){response.status(409).json({error:{code:error.code,message:error.message,requestId:request.id}});return;}
      throw error;
    }
  });
};