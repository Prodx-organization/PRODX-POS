import crypto from 'node:crypto';
import type { TransactionalSqlExecutor, SqlQueryExecutor } from '../db/transaction';
import { hashPassword, verifyPassword } from '../auth/password';

type Context = { organizationId: string; storeId: string; userId: string };

export class TimeclockValidationError extends Error { readonly code = 'TIMECLOCK_VALIDATION_FAILED'; }
export class TimeclockConflictError extends Error { readonly code = 'TIMECLOCK_CONFLICT'; }
export class TimeclockAuthenticationError extends Error { readonly code = 'TIMECLOCK_PIN_INVALID'; }
export class TimeclockLockedError extends Error { readonly code = 'TIMECLOCK_PIN_LOCKED'; }

type RecordRow = {
  id: string; store_id: string; user_id: string; status: 'clocked_in' | 'clocked_out';
  clocked_in_at: string | Date; clocked_out_at?: string | Date | null;
  display_name: string; username: string;
};

type CredentialRow = {
  user_id: string; pin_hash: string; failed_attempts: number;
  locked_until: string | Date | null; status: 'active' | 'disabled'; display_name: string;
};

const PIN_RE = /^\d{4}$/;
const MAX_ATTEMPTS = 5;
const LOCK_MINUTES = 15;
const getPinPepper = () => {
  const pepper = process.env.TIMECLOCK_PIN_PEPPER;
  if (!pepper) throw new Error('TIMECLOCK_PIN_PEPPER is required for production timeclock credentials.');
  return pepper;
};

const lookupHash = (pin: string) =>
  crypto.createHmac('sha256', getPinPepper()).update(pin).digest('hex');

const hashPayload = (value: unknown) =>
  crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');

const mapRecord = (row: RecordRow) => ({
  id: row.id,
  userId: row.user_id,
  userName: row.display_name,
  employeeCode: row.username,
  status: row.status,
  clockedInAt: new Date(row.clocked_in_at).toISOString(),
  ...(row.clocked_out_at ? { clockedOutAt: new Date(row.clocked_out_at).toISOString() } : {}),
});

const loadRecord = async (db: SqlQueryExecutor, id: string, storeId: string) => {
  const result = await db.query<RecordRow>(
    `SELECT t.id,t.store_id,t.user_id,t.status,t.clocked_in_at,t.clocked_out_at,
            u.display_name,u.username
       FROM prodx_timeclock_records t
       JOIN prodx_users u ON u.id=t.user_id AND u.organization_id=t.organization_id
      WHERE t.id=$1 AND t.store_id=$2`,
    [id, storeId],
  );
  if (!result.rows[0]) throw new TimeclockConflictError('Timeclock record was not found in this store.');
  return mapRecord(result.rows[0]);
};

const recordFailedActorAttempt = async (tx: SqlQueryExecutor, context: Context) => {
  const result = await tx.query<{ failed_attempts: number }>(
    `INSERT INTO prodx_timeclock_auth_attempts
       (organization_id,store_id,actor_user_id,failed_attempts,locked_until,updated_at)
     VALUES($1,$2,$3,1,NULL,CURRENT_TIMESTAMP)
     ON CONFLICT(organization_id,store_id,actor_user_id)
     DO UPDATE SET failed_attempts=prodx_timeclock_auth_attempts.failed_attempts + 1,
                   locked_until=CASE
                     WHEN prodx_timeclock_auth_attempts.failed_attempts + 1 >= $4::integer
                     THEN CURRENT_TIMESTAMP + ($5::integer || ' minutes')::interval
                     ELSE prodx_timeclock_auth_attempts.locked_until
                   END,
                   updated_at=CURRENT_TIMESTAMP
     RETURNING failed_attempts`,
    [context.organizationId, context.storeId, context.userId, MAX_ATTEMPTS, LOCK_MINUTES],
  );
  const failedAttempts = Number(result.rows[0]?.failed_attempts ?? 0);
  if (failedAttempts >= MAX_ATTEMPTS) {
    throw new TimeclockLockedError('Timeclock PIN attempts are temporarily locked.');
  }
};

const assertActorNotLocked = async (tx: SqlQueryExecutor, context: Context) => {
  const result = await tx.query<{ locked_until: string | Date | null }>(
    `SELECT locked_until
       FROM prodx_timeclock_auth_attempts
      WHERE organization_id=$1 AND store_id=$2 AND actor_user_id=$3
      FOR UPDATE`,
    [context.organizationId, context.storeId, context.userId],
  );
  const lockedUntil = result.rows[0]?.locked_until;
  if (lockedUntil && new Date(lockedUntil).getTime() > Date.now()) {
    throw new TimeclockLockedError('Timeclock PIN attempts are temporarily locked.');
  }
};

const resetActorAttempts = async (tx: SqlQueryExecutor, context: Context) => {
  await tx.query(
    `DELETE FROM prodx_timeclock_auth_attempts
      WHERE organization_id=$1 AND store_id=$2 AND actor_user_id=$3`,
    [context.organizationId, context.storeId, context.userId],
  );
};

const resolvePinUser = async (tx: SqlQueryExecutor, context: Context, pin: string): Promise<CredentialRow> => {
  if (!PIN_RE.test(pin)) throw new TimeclockValidationError('PIN must be exactly 4 digits.');
  await assertActorNotLocked(tx, context);

  const credentials = await tx.query<CredentialRow>(
    `SELECT c.user_id,c.pin_hash,c.failed_attempts,c.locked_until,u.status,u.display_name
       FROM prodx_timeclock_credentials c
       JOIN prodx_users u ON u.id=c.user_id AND u.organization_id=c.organization_id
      WHERE c.organization_id=$1 AND c.store_id=$2 AND c.pin_lookup_hash=$3
      FOR UPDATE OF c`,
    [context.organizationId, context.storeId, lookupHash(pin)],
  );
  const row = credentials.rows[0];
  if (!row || row.status !== 'active') {
    await recordFailedActorAttempt(tx, context);
    throw new TimeclockAuthenticationError('Invalid timeclock PIN.');
  }
  if (row.locked_until && new Date(row.locked_until).getTime() > Date.now()) {
    throw new TimeclockLockedError('Timeclock PIN is locked temporarily.');
  }
  if (!(await verifyPassword(pin, row.pin_hash))) {
    const next = row.failed_attempts + 1;
    await tx.query(
      `UPDATE prodx_timeclock_credentials
          SET failed_attempts=$4,
              locked_until=CASE WHEN $4 >= $5 THEN CURRENT_TIMESTAMP + ($6 || ' minutes')::interval ELSE locked_until END,
              updated_at=CURRENT_TIMESTAMP
        WHERE organization_id=$1 AND store_id=$2 AND user_id=$3`,
      [context.organizationId, context.storeId, row.user_id, next, MAX_ATTEMPTS, LOCK_MINUTES],
    );
    await recordFailedActorAttempt(tx, context);
    throw new TimeclockAuthenticationError('Invalid timeclock PIN.');
  }
  await tx.query(
    `UPDATE prodx_timeclock_credentials
        SET failed_attempts=0,last_authenticated_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP
      WHERE organization_id=$1 AND store_id=$2 AND user_id=$3`,
    [context.organizationId, context.storeId, row.user_id],
  );
  await resetActorAttempts(tx, context);
  return row;
};

const operation = async (
  tx: SqlQueryExecutor, context: Context, type: 'clock_in' | 'clock_out', key: string, payload: unknown,
) => {
  if (!key.trim()) throw new TimeclockValidationError('Idempotency key is required.');
  const payloadHash = hashPayload(payload);
  const inserted = await tx.query<{ id: string }>(
    `INSERT INTO prodx_timeclock_operations
       (id,organization_id,store_id,user_id,operation_type,idempotency_key,payload_hash)
     VALUES($1,$2,$3,$4,$5,$6,$7)
     ON CONFLICT(organization_id,store_id,user_id,operation_type,idempotency_key) DO NOTHING RETURNING id`,
    [crypto.randomUUID(), context.organizationId, context.storeId, context.userId, type, key.trim(), payloadHash],
  );
  if (inserted.rows[0]) return { id: inserted.rows[0].id, replay: false, resultId: null as string | null };
  const existing = await tx.query<{ id: string; payload_hash: string; result_id: string | null }>(
    `SELECT id,payload_hash,result_id FROM prodx_timeclock_operations
      WHERE organization_id=$1 AND store_id=$2 AND user_id=$3 AND operation_type=$4 AND idempotency_key=$5 FOR UPDATE`,
    [context.organizationId, context.storeId, context.userId, type, key.trim()],
  );
  const row = existing.rows[0];
  if (!row || row.payload_hash !== payloadHash) {
    throw new TimeclockConflictError('Idempotency key was already used for a different timeclock operation.');
  }
  return { id: row.id, replay: true, resultId: row.result_id };
};

const authenticatePin = async (db: TransactionalSqlExecutor, context: Context, pin: string): Promise<CredentialRow> => {
  const outcome = await db.transaction(async (tx) => {
    try {
      return { user: await resolvePinUser(tx, context, pin) };
    } catch (error) {
      if (error instanceof TimeclockAuthenticationError || error instanceof TimeclockLockedError) return { error };
      throw error;
    }
  });
  if ('error' in outcome) throw outcome.error;
  return outcome.user;
};

export const createTimeclockService = (db: TransactionalSqlExecutor) => ({
  async clockIn(context: Context, pin: string, idempotencyKey: string) {
    const user = await authenticatePin(db, context, pin);
    return db.transaction(async (tx) => {
      const op = await operation(tx, context, 'clock_in', idempotencyKey, { userId: user.user_id });
      if (op.replay && op.resultId) return loadRecord(tx, op.resultId, context.storeId);
      const existing = await tx.query<{ id: string }>(
        `SELECT id FROM prodx_timeclock_records
          WHERE store_id=$1 AND user_id=$2 AND status='clocked_in' FOR UPDATE`,
        [context.storeId, user.user_id],
      );
      if (existing.rows[0]) throw new TimeclockConflictError('User is already clocked in at this store.');
      const id = crypto.randomUUID();
      await tx.query(
        `INSERT INTO prodx_timeclock_records(id,organization_id,store_id,user_id,status)
         VALUES($1,$2,$3,$4,'clocked_in')`,
        [id, context.organizationId, context.storeId, user.user_id],
      );
      await tx.query(`UPDATE prodx_timeclock_operations SET result_id=$1 WHERE id=$2`, [id, op.id]);
      await tx.query(
        `INSERT INTO prodx_audit_log(id,organization_id,store_id,user_id,action,severity,details)
         VALUES($1,$2,$3,$4,'timeclock_clocked_in','info',$5::jsonb)`,
        [crypto.randomUUID(), context.organizationId, context.storeId, context.userId,
          JSON.stringify({ employeeUserId: user.user_id, recordId: id })],
      );
      return loadRecord(tx, id, context.storeId);
    });
  },

  async clockOut(context: Context, pin: string, idempotencyKey: string) {
    const user = await authenticatePin(db, context, pin);
    return db.transaction(async (tx) => {
      const op = await operation(tx, context, 'clock_out', idempotencyKey, { userId: user.user_id });
      if (op.replay && op.resultId) return loadRecord(tx, op.resultId, context.storeId);
      const current = await tx.query<{ id: string }>(
        `SELECT id FROM prodx_timeclock_records
          WHERE store_id=$1 AND user_id=$2 AND status='clocked_in' FOR UPDATE`,
        [context.storeId, user.user_id],
      );
      if (!current.rows[0]) throw new TimeclockConflictError('User is not currently clocked in at this store.');
      await tx.query(
        `UPDATE prodx_timeclock_records SET status='clocked_out',clocked_out_at=CURRENT_TIMESTAMP
          WHERE id=$1 AND store_id=$2`,
        [current.rows[0].id, context.storeId],
      );
      await tx.query(`UPDATE prodx_timeclock_operations SET result_id=$1 WHERE id=$2`, [current.rows[0].id, op.id]);
      await tx.query(
        `INSERT INTO prodx_audit_log(id,organization_id,store_id,user_id,action,severity,details)
         VALUES($1,$2,$3,$4,'timeclock_clocked_out','info',$5::jsonb)`,
        [crypto.randomUUID(), context.organizationId, context.storeId, context.userId,
          JSON.stringify({ employeeUserId: user.user_id, recordId: current.rows[0].id })],
      );
      return loadRecord(tx, current.rows[0].id, context.storeId);
    });
  },

  async getRecords(context: Context, limit = 100) {
    if (!Number.isInteger(limit) || limit < 1 || limit > 200) {
      throw new TimeclockValidationError('Limit must be between 1 and 200.');
    }
    const result = await db.query<RecordRow>(
      `SELECT t.id,t.store_id,t.user_id,t.status,t.clocked_in_at,t.clocked_out_at,u.display_name,u.username
         FROM prodx_timeclock_records t
         JOIN prodx_users u ON u.id=t.user_id AND u.organization_id=t.organization_id
        WHERE t.organization_id=$1 AND t.store_id=$2
        ORDER BY t.clocked_in_at DESC,t.id DESC LIMIT $3`,
      [context.organizationId, context.storeId, limit],
    );
    return result.rows.map(mapRecord);
  },

  async provisionPin(context: Context, targetUserId: string, pin: string) {
    if (!PIN_RE.test(pin)) throw new TimeclockValidationError('PIN must be exactly 4 digits.');
    const target = await db.query<{ id: string }>(
      `SELECT u.id FROM prodx_users u
       JOIN prodx_store_memberships m
         ON m.organization_id=u.organization_id AND m.user_id=u.id
        AND m.store_id=$2 AND m.active=TRUE
       WHERE u.id=$1 AND u.organization_id=$3 AND u.status='active'`,
      [targetUserId, context.storeId, context.organizationId],
    );
    if (!target.rows[0]) throw new TimeclockConflictError('Target user is not active in this store.');
    const pinHash = await hashPassword(pin);
    const pinLookupHash = lookupHash(pin);
    await db.transaction(async (tx) => {
      await tx.query(
        `INSERT INTO prodx_timeclock_credentials
           (organization_id,store_id,user_id,pin_hash,pin_lookup_hash)
         VALUES($1,$2,$3,$4,$5)
         ON CONFLICT(organization_id,store_id,user_id)
         DO UPDATE SET pin_hash=EXCLUDED.pin_hash,pin_lookup_hash=EXCLUDED.pin_lookup_hash,
                       failed_attempts=0,locked_until=NULL,updated_at=CURRENT_TIMESTAMP`,
        [context.organizationId, context.storeId, targetUserId, pinHash, pinLookupHash],
      );
      await tx.query(
        `INSERT INTO prodx_audit_log(id,organization_id,store_id,user_id,action,severity,details)
         VALUES($1,$2,$3,$4,'timeclock_pin_provisioned','info',$5::jsonb)`,
        [crypto.randomUUID(), context.organizationId, context.storeId, context.userId,
          JSON.stringify({ employeeUserId: targetUserId })],
      );
    });
  },
});