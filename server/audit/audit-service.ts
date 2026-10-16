import crypto from 'node:crypto';
import type { SqlQueryExecutor, TransactionalSqlExecutor } from '../db/transaction';

export class AuditValidationError extends Error { readonly code = 'AUDIT_VALIDATION_FAILED'; }
type DbRow = Record<string, unknown>;

const clampLimit = (limit?: number): number => {
  if (limit === undefined) return 50;
  if (!Number.isInteger(limit) || limit < 1 || limit > 200) {
    throw new AuditValidationError('Limit must be an integer between 1 and 200.');
  }
  return limit;
};

export const createAuditReadService = (db: SqlQueryExecutor) => ({
  async getLogs(storeId: string, limit?: number) {
    if (!storeId?.trim()) throw new AuditValidationError('Store is required.');
    const result = await db.query<DbRow>(
      `SELECT a.id, a.store_id,
              COALESCE(r.code, '') AS register_id,
              a.user_id, COALESCE(u.display_name, '') AS user_name,
              a.action, a.severity, a.details, a.created_at
         FROM prodx_audit_log a
         LEFT JOIN prodx_registers r ON r.id = a.register_id AND r.store_id = a.store_id
         JOIN prodx_users u ON u.id = a.user_id AND u.organization_id = a.organization_id
        WHERE a.store_id = $1
        ORDER BY a.created_at DESC, a.id DESC
        LIMIT $2`,
      [storeId, clampLimit(limit)],
    );
    return result.rows.map((row) => ({
      id: row.id, storeId: row.store_id, registerId: row.register_id,
      userId: row.user_id, userName: row.user_name, action: row.action,
      severity: row.severity, details: row.details ?? {},
      timestamp: new Date(String(row.created_at)).toISOString(),
    }));
  },
});


// Never accept client-origin copies of server-authoritative financial,
// inventory, shift, or refund events through this supplemental write endpoint.
const clientAuditSeverity: Record<string, 'info' | 'warn'> = {
  user_login: 'info',
  user_logout: 'info',
  order_checkout_queued_offline: 'warn',
};
const allowedClientAuditActions = new Set(Object.keys(clientAuditSeverity));

export type AuditWriteInput = {
  organizationId: string;
  storeId: string;
  userId: string;
  action: unknown;
  severity: unknown;
  details: unknown;
};

export const createAuditWriteService = (db: TransactionalSqlExecutor) => ({
  async recordEvent(input: AuditWriteInput) {
    if (!input.organizationId?.trim() || !input.storeId?.trim() || !input.userId?.trim()) {
      throw new AuditValidationError('Authenticated organization, store, and user are required.');
    }
    if (typeof input.action !== 'string' || !allowedClientAuditActions.has(input.action)) {
      throw new AuditValidationError('Unsupported audit action.');
    }
    // Severity is policy-derived, not client-controlled; supplemental client
    // events are never allowed to label themselves critical.
    const severity = clientAuditSeverity[input.action];
    if (!input.details || typeof input.details !== 'object' || Array.isArray(input.details)) {
      throw new AuditValidationError('Audit details must be a JSON object.');
    }
    let detailsJson: string;
    try {
      detailsJson = JSON.stringify(input.details);
    } catch {
      throw new AuditValidationError('Audit details must be serializable JSON.');
    }
    if (detailsJson.length > 16384) {
      throw new AuditValidationError('Audit details exceed the 16 KB limit.');
    }

    return db.transaction(async (tx) => {
      const inserted = await tx.query<DbRow>(
        `INSERT INTO prodx_audit_log
           (id, organization_id, store_id, register_id, user_id, action, severity, details)
         VALUES ($1, $2, $3, NULL, $4, $5, $6, $7::jsonb)
         RETURNING id`,
        [crypto.randomUUID(), input.organizationId, input.storeId, input.userId, input.action, severity, detailsJson],
      );
      const id = inserted.rows[0]?.id;
      if (typeof id !== 'string') throw new Error('Audit write did not return a persisted record identifier.');
      const result = await tx.query<DbRow>(
        `SELECT a.id, a.store_id, ''::text AS register_id, a.user_id,
                COALESCE(u.display_name, '') AS user_name,
                a.action, a.severity, a.details, a.created_at
           FROM prodx_audit_log a
           JOIN prodx_users u ON u.id = a.user_id AND u.organization_id = a.organization_id
          WHERE a.id = $1 AND a.organization_id = $2 AND a.store_id = $3
          LIMIT 1`,
        [id, input.organizationId, input.storeId],
      );
      const row = result.rows[0];
      if (!row) throw new Error('Persisted audit record could not be read back within its transaction.');
      return {
        id: String(row.id),
        storeId: String(row.store_id),
        registerId: String(row.register_id ?? ''),
        userId: String(row.user_id),
        userName: String(row.user_name ?? ''),
        action: String(row.action),
        severity: String(row.severity),
        details: (row.details ?? {}) as Record<string, unknown>,
        timestamp: new Date(String(row.created_at)).toISOString(),
      };
    });
  },
});
