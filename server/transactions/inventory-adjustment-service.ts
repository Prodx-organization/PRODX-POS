import crypto from 'node:crypto';
import type { TransactionalSqlExecutor } from '../db/transaction';

type Reason = 'purchase_received' | 'transfer_in' | 'transfer_out' | 'audit_count_adjustment' | 'damaged_write_off';
type Request = { storeId: string; organizationId: string; requesterUserId: string; productIds: readonly string[]; quantityDelta: number; reason: Reason; notes?: string; idempotencyKey: string; };
export class InventoryAdjustmentValidationError extends Error { readonly code = 'INVENTORY_ADJUSTMENT_VALIDATION_FAILED'; }
export class InventoryAdjustmentConflictError extends Error { readonly code = 'INVENTORY_ADJUSTMENT_CONFLICT'; }

export const createInventoryAdjustmentService = (db: TransactionalSqlExecutor) => ({
  async adjust(request: Request) {
    if (!request.storeId || !request.organizationId || !request.requesterUserId || !request.idempotencyKey.trim()) throw new InventoryAdjustmentValidationError('Store, organization, requester and idempotency key are required.');
    if (!Number.isInteger(request.quantityDelta) || request.quantityDelta === 0) throw new InventoryAdjustmentValidationError('Quantity delta must be a non-zero integer.');
    const productIds = [...new Set(request.productIds.map((id) => id.trim()).filter(Boolean))];
    if (!productIds.length) throw new InventoryAdjustmentValidationError('At least one product is required.');
    if (productIds.length > 200) throw new InventoryAdjustmentValidationError('A maximum of 200 products can be adjusted per operation.');

    return db.transaction(async (tx) => {
      const existing = (await tx.query('SELECT id, organization_id, product_ids::text AS product_ids, quantity_delta, reason FROM prodx_inventory_adjustments WHERE store_id=$1 AND idempotency_key=$2 LIMIT 1',[request.storeId,request.idempotencyKey.trim()])).rows[0] as {id:string;organization_id:string;product_ids:string;quantity_delta:number;reason:Reason}|undefined;
      if (existing) {
        if (existing.organization_id !== request.organizationId || existing.quantity_delta !== request.quantityDelta || existing.reason !== request.reason || JSON.stringify(JSON.parse(existing.product_ids).sort()) !== JSON.stringify([...productIds].sort())) throw new InventoryAdjustmentConflictError('The idempotency key was already used for a different inventory adjustment.');
        const cached=(await tx.query('SELECT id,store_id,product_id,quantity_delta,resulting_stock,reason,reference_id,performed_by_user_id,created_at FROM prodx_inventory_ledger WHERE store_id=$1 AND reference_id=$2 ORDER BY created_at,id',[request.storeId,existing.id])).rows;
        return {success:true as const,idempotencyCached:true,adjustmentId:existing.id,entries:cached};
      }
      const products=(await tx.query('SELECT id,current_stock FROM prodx_products WHERE organization_id=$1 AND store_id=$2 AND id=ANY($3::uuid[]) AND active=true ORDER BY id FOR UPDATE',[request.organizationId,request.storeId,productIds])).rows as Array<{id:string;current_stock:number}>;
      if (products.length !== productIds.length) throw new InventoryAdjustmentValidationError('One or more products do not belong to the authenticated store or are inactive.');
      if (request.quantityDelta < 0 && products.some((p)=>p.current_stock+request.quantityDelta<0)) throw new InventoryAdjustmentConflictError('Inventory adjustment would make stock negative.');

      const adjustmentId=crypto.randomUUID();
      const inserted=(await tx.query('INSERT INTO prodx_inventory_adjustments (id,organization_id,store_id,requester_user_id,idempotency_key,quantity_delta,reason,product_ids,notes) VALUES($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9) ON CONFLICT (store_id,idempotency_key) DO NOTHING RETURNING id',[adjustmentId,request.organizationId,request.storeId,request.requesterUserId,request.idempotencyKey.trim(),request.quantityDelta,request.reason,JSON.stringify(productIds),request.notes?.trim()||null])).rows[0] as {id:string}|undefined;
      if (!inserted) throw new InventoryAdjustmentConflictError('Concurrent inventory adjustment detected; retry with the same idempotency key.');

      const entries=[];
      for (const product of products) {
        const updated=(await tx.query('UPDATE prodx_products SET current_stock=current_stock+$1,updated_at=CURRENT_TIMESTAMP WHERE id=$2 AND store_id=$3 RETURNING current_stock',[request.quantityDelta,product.id,request.storeId])).rows[0] as {current_stock:number};
        const entry=(await tx.query('INSERT INTO prodx_inventory_ledger (id,organization_id,store_id,product_id,quantity_delta,resulting_stock,reason,reference_id,performed_by_user_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id,store_id,product_id,quantity_delta,resulting_stock,reason,reference_id,performed_by_user_id,created_at',[crypto.randomUUID(),request.organizationId,request.storeId,product.id,request.quantityDelta,updated.current_stock,request.reason,adjustmentId,request.requesterUserId])).rows[0];
        entries.push(entry);
      }
      await tx.query("INSERT INTO prodx_audit_log (id,organization_id,store_id,user_id,action,severity,details) VALUES($1,$2,$3,$4,'inventory_adjustment_committed','critical',$5::jsonb)",[crypto.randomUUID(),request.organizationId,request.storeId,request.requesterUserId,JSON.stringify({adjustmentId,productIds,quantityDelta:request.quantityDelta,reason:request.reason,idempotencyKey:request.idempotencyKey.trim()})]);
      return {success:true as const,idempotencyCached:false,adjustmentId,entries};
    });
  },
});