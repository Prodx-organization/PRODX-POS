import crypto from 'node:crypto';
import type { TransactionalSqlExecutor } from '../db/transaction';
import { createSupervisorAuthorizationService, SupervisorAuthorizationError } from '../auth/supervisor-authorization';

type VoidRequest = { storeId: string; orderId: string; reason: string; idempotencyKey: string; requesterUserId: string; requesterSessionId: string; supervisorAuthorizationToken: string; };
export class VoidValidationError extends Error { readonly code = 'VOID_VALIDATION_FAILED'; }
export class VoidConflictError extends Error { readonly code = 'VOID_CONFLICT'; }
export class VoidProviderUnavailableError extends Error { readonly code = 'VOID_PROVIDER_UNAVAILABLE'; }

const dbCents = (value: unknown): bigint => {
  const match = /^(\\d+)\\.(\\d{2})$/.exec(String(value));
  if (!match) throw new VoidValidationError('Database monetary value is invalid.');
  return BigInt(match[1]) * 100n + BigInt(match[2]);
};
const numeric = (cents: bigint): string => \`\${cents / 100n}.\${(cents % 100n).toString().padStart(2, '0')}\`;

export const createVoidService = (db: TransactionalSqlExecutor) => ({
  async voidOrder(request: VoidRequest) {
    if (!request.storeId || !request.orderId || !request.requesterUserId || !request.requesterSessionId || !request.supervisorAuthorizationToken.trim() || !request.idempotencyKey.trim()) {
      throw new VoidValidationError('Store, order, requester session, supervisor authorization and idempotency key are required.');
    }
    if (!request.reason.trim()) throw new VoidValidationError('Void reason is required.');

    return db.transaction(async (tx) => {
      const order = (await tx.query('SELECT * FROM prodx_orders WHERE id=$1 AND store_id=$2 FOR UPDATE', [request.orderId, request.storeId])).rows[0] as Record<string, any> | undefined;
      if (!order) throw new VoidValidationError('Order was not found in the authenticated store.');

      const existing = (await tx.query(
        'SELECT id, order_id FROM prodx_voids WHERE store_id=$1 AND (idempotency_key=$2 OR order_id=$3) ORDER BY created_at LIMIT 1',
        [request.storeId, request.idempotencyKey, request.orderId],
      )).rows[0] as { id: string; order_id: string } | undefined;
      if (existing) {
        if (existing.order_id !== request.orderId) throw new VoidConflictError('This idempotency key was already used for a different order void.');
        return { success: true as const, orderId: request.orderId, status: 'voided' as const, voidId: existing.id, idempotencyCached: true, message: 'Order void already committed; returning the existing transaction.' };
      }
      if (order.status !== 'server_confirmed') throw new VoidConflictError('Only server-confirmed sales can be voided.');

      let supervisorUserId: string;
      try {
        supervisorUserId = (await createSupervisorAuthorizationService({
          query: async <T extends Record<string, unknown>>(sql: string, parameters: readonly unknown[] = []) => (await tx.query<T>(sql, parameters)).rows,
        }).consume({
          token: request.supervisorAuthorizationToken, organizationId: String(order.organization_id), storeId: request.storeId,
          requesterUserId: request.requesterUserId, requesterSessionId: request.requesterSessionId, action: 'void', orderId: request.orderId,
        })).supervisorUserId;
      } catch (error) {
        if (error instanceof SupervisorAuthorizationError) throw new VoidConflictError('Supervisor authorization is expired, already consumed, or not bound to this void request.');
        throw error;
      }

      const membership = (await tx.query(
        'SELECT 1 FROM prodx_store_memberships WHERE organization_id=$1 AND store_id=$2 AND user_id=$3 AND active=true FOR UPDATE',
        [order.organization_id, request.storeId, supervisorUserId],
      )).rows[0];
      if (!membership) throw new VoidConflictError('The authorizing user is not an active member of the target store.');

      const payments = (await tx.query(
        'SELECT method, amount::text AS amount, currency, status FROM prodx_payments WHERE store_id=$1 AND order_id=$2 ORDER BY created_at,id FOR UPDATE',
        [request.storeId, request.orderId],
      )).rows as Array<{ method: string; amount: string; currency: string; status: string }>;
      if (payments.length === 0) throw new VoidConflictError('The order has no recorded payments.');
      if (payments.some((payment) => payment.status !== 'captured' && payment.status !== 'settled')) throw new VoidConflictError('The order contains a payment that is not captured or settled.');
      if (payments.some((payment) => payment.method !== 'cash')) throw new VoidProviderUnavailableError('Card and QR voids require a configured payment-provider void adapter; the server fails closed until one is configured.');
      const orderCurrency = String(order.currency).trim();
      if (payments.some((payment) => String(payment.currency).trim() !== orderCurrency)) throw new VoidConflictError('The order contains a payment recorded in a different currency.');
      const paid = payments.reduce((sum, payment) => sum + dbCents(payment.amount), 0n);
      if (paid !== dbCents(order.grand_total_amount)) throw new VoidConflictError('Recorded cash payments do not match the order total.');

      const shift = (await tx.query("SELECT id FROM prodx_shifts WHERE id=$1 AND store_id=$2 AND status='open' FOR UPDATE", [order.shift_id, request.storeId])).rows[0] as { id: string } | undefined;
      if (!shift) throw new VoidConflictError('The originating shift is not open; cash reversal cannot be committed.');

      const voidId = crypto.randomUUID();
      const inserted = (await tx.query(
        'INSERT INTO prodx_voids (id,organization_id,store_id,order_id,reason,authorized_by_user_id,requester_user_id,idempotency_key) VALUES($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT DO NOTHING RETURNING id',
        [voidId, order.organization_id, request.storeId, request.orderId, request.reason.trim(), supervisorUserId, request.requesterUserId, request.idempotencyKey],
      )).rows[0] as { id: string } | undefined;
      if (!inserted) throw new VoidConflictError('Concurrent void could not be resolved; retry with the same idempotency key.');

      const items = (await tx.query(
        'SELECT id, product_id, quantity FROM prodx_order_items WHERE store_id=$1 AND order_id=$2 ORDER BY id FOR UPDATE',
        [request.storeId, request.orderId],
      )).rows as Array<{ id: string; product_id: string; quantity: number }>;
      if (items.length === 0) throw new VoidConflictError('The order has no recorded items.');

      for (const item of items) {
        const stock = (await tx.query(
          'UPDATE prodx_products SET current_stock=current_stock+$1, updated_at=CURRENT_TIMESTAMP WHERE id=$2 AND store_id=$3 AND active=true RETURNING current_stock',
          [item.quantity, item.product_id, request.storeId],
        )).rows[0] as { current_stock: number } | undefined;
        if (!stock) throw new VoidConflictError(\`Product \${item.product_id} is unavailable for void reversal.\`);
        await tx.query(
          "INSERT INTO prodx_inventory_ledger (id,organization_id,store_id,product_id,quantity_delta,resulting_stock,reason,reference_id,performed_by_user_id) VALUES($1,$2,$3,$4,$5,$6,'void_reversal',$7,$8)",
          [crypto.randomUUID(), order.organization_id, request.storeId, item.product_id, item.quantity, stock.current_stock, voidId, supervisorUserId],
        );
      }

      const amount = dbCents(order.grand_total_amount);
      await tx.query(
        "INSERT INTO prodx_cash_movements (id,organization_id,store_id,shift_id,type,amount,reason,performed_by_user_id,currency) VALUES($1,$2,$3,$4,'cash_refund',$5,$6,$7,$8)",
        [crypto.randomUUID(), order.organization_id, request.storeId, shift.id, numeric(amount), \`Void for Order #\${order.order_number}: \${request.reason.trim()}\`, supervisorUserId, orderCurrency],
      );
      await tx.query('UPDATE prodx_orders SET status=$1 WHERE id=$2 AND store_id=$3', ['voided', request.orderId, request.storeId]);
      await tx.query(
        "INSERT INTO prodx_audit_log (id,organization_id,store_id,register_id,user_id,action,severity,details) VALUES($1,$2,$3,$4,$5,'order_void_committed','critical',$6::jsonb)",
        [crypto.randomUUID(), order.organization_id, request.storeId, order.register_id, request.requesterUserId,
          JSON.stringify({ voidId, orderId: request.orderId, amount: numeric(amount), reason: request.reason.trim(), supervisorUserId, requesterUserId: request.requesterUserId, idempotencyKey: request.idempotencyKey })],
      );
      return { success: true as const, orderId: request.orderId, status: 'voided' as const, voidId, idempotencyCached: false, message: 'Order void committed atomically with inventory reversal, cash reversal and audit trail.' };
    });
  },
});
