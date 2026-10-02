import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import test from 'node:test';
import type { SqlQueryExecutor, TransactionalSqlExecutor } from '../db/transaction';
import { hashPassword } from '../auth/password';
import {
  createTimeclockService,
  TimeclockAuthenticationError,
  TimeclockConflictError,
  TimeclockLockedError,
} from './timeclock-service';

const context = { organizationId: 'org-1', storeId: 'store-1', userId: 'operator-1' };
const PEPPER = 'test-pepper';

type CredentialState = {
  user_id: string;
  pin: string;
  pin_hash: string;
  failed_attempts: number;
  locked_until: Date | null;
  status: 'active' | 'disabled';
  display_name: string;
};

const makeDb = async (
  pins: Record<string, string> = { '1234': 'employee-1', '5678': 'employee-2' },
): Promise<TransactionalSqlExecutor> => {
  const credentials = new Map<string, CredentialState>();
  for (const [pin, user_id] of Object.entries(pins)) {
    credentials.set(user_id, {
      user_id,
      pin,
      pin_hash: await hashPassword(pin),
      failed_attempts: 0,
      locked_until: null,
      status: 'active',
      display_name: user_id === 'employee-1' ? 'Employee One' : 'Employee Two',
    });
  }

  const actorAttempts = new Map<string, { failed_attempts: number; locked_until: Date | null }>();
  let record: { id: string; user_id: string; status: 'clocked_in' | 'clocked_out' } | null = null;
  const operations = new Map<string, { id: string; payload_hash: string; result_id: string | null }>();
  const operationIds = new Map<string, string>();
  const operationResults = new Map<string, string>();
  let nextOperationId = 1;

  const query = async (sql: string, params: readonly unknown[] = []) => {
    const actorKey = String(params[0]) + ':' + String(params[1]) + ':' + String(params[2]);

    if (sql.includes('INSERT INTO prodx_timeclock_auth_attempts') && sql.includes('VALUES($1,$2,$3,0,NULL')) {
      const current = actorAttempts.get(actorKey) ?? { failed_attempts: 0, locked_until: null };
      actorAttempts.set(actorKey, current);
      return { rows: [{ locked_until: current.locked_until }] };
    }
    if (sql.includes('SELECT failed_attempts') && sql.includes('FROM prodx_timeclock_auth_attempts')) {
      const current = actorAttempts.get(actorKey);
      return { rows: current ? [current] : [] };
    }
    if (sql.includes('INSERT INTO prodx_timeclock_auth_attempts') && sql.includes('VALUES($1,$2,$3,$4')) {
      const failed_attempts = Number(params[3]);
      actorAttempts.set(actorKey, {
        failed_attempts,
        locked_until: failed_attempts >= 5 ? new Date(Date.now() + 900_000) : null,
      });
      return { rows: [] };
    }
    if (sql.includes('DELETE FROM prodx_timeclock_auth_attempts')) {
      actorAttempts.delete(actorKey);
      return { rows: [] };
    }
    if (sql.includes('FROM prodx_timeclock_credentials') && sql.includes('pin_lookup_hash')) {
      const lookup = String(params[2]);
      const matched = [...credentials.values()].find(
        (candidate) => createHmac('sha256', PEPPER).update(candidate.pin).digest('hex') === lookup,
      );
      return {
        rows: matched ? [{
          user_id: matched.user_id,
          pin_hash: matched.pin_hash,
          failed_attempts: matched.failed_attempts,
          locked_until: matched.locked_until,
          status: matched.status,
          display_name: matched.display_name,
        }] : [],
      };
    }
    if (sql.includes('UPDATE prodx_timeclock_credentials') && sql.includes('failed_attempts=$4')) {
      const userId = String(params[2]);
      const current = credentials.get(userId);
      assert.ok(current);
      const failed_attempts = Number(params[3]);
      current.failed_attempts = failed_attempts;
      current.locked_until = failed_attempts >= 5 ? new Date(Date.now() + 900_000) : current.locked_until;
      return { rows: [] };
    }
    if (sql.includes('UPDATE prodx_timeclock_credentials') && sql.includes('failed_attempts=0')) {
      const userId = String(params[2]);
      const current = credentials.get(userId);
      assert.ok(current);
      current.failed_attempts = 0;
      current.locked_until = null;
      return { rows: [] };
    }
    if (sql.trimStart().startsWith('UPDATE prodx_timeclock_operations')) {
      const resultId = String(params[0]);
      const operationId = String(params[1]);
      const operationEntry = [...operations.entries()].find(([, value]) => value.id === operationId);
      assert.ok(operationEntry, `Unknown timeclock operation id: ${operationId}`);
      const [operationKey, operation] = operationEntry;
      operations.set(operationKey, { ...operation, result_id: resultId });
      operationResults.set(operationId, resultId);
      return { rows: [] };
    }
    if (sql.includes('INSERT INTO prodx_timeclock_operations')) {
      const operationKey = String(params[1]) + ':' + String(params[2]) + ':' + String(params[3]) + ':' + String(params[4]) + ':' + String(params[5]);
      if (operations.has(operationKey)) return { rows: [] };
      const id = 'op-' + String(nextOperationId++);
      operations.set(operationKey, { id, payload_hash: String(params[6]), result_id: null });
      operationIds.set(id, operationKey);
      return { rows: [{ id }] };
    }
    if (sql.includes('DELETE FROM prodx_timeclock_operations')) {
      const operationId = String(params[0]);
      const operationKey = operationIds.get(operationId);
      if (operationKey) {
        operations.delete(operationKey);
        operationIds.delete(operationId);
        operationResults.delete(operationId);
      }
      return { rows: [] };
    }
    if (sql.includes('FROM prodx_timeclock_operations')) {
      const operationKey = String(params[0]) + ':' + String(params[1]) + ':' + String(params[2]) + ':' + String(params[3]) + ':' + String(params[4]);
      const operation = operations.get(operationKey);
      return {
        rows: operation
          ? [{ ...operation, result_id: operationResults.get(operation.id) ?? operation.result_id }]
          : [],
      };
    }
    if (sql.includes('FROM prodx_timeclock_records') && sql.includes("status='clocked_in'")) {
      const userId = String(params[2]);
      return { rows: record?.status === 'clocked_in' && record.user_id === userId ? [{ id: record.id }] : [] };
    }
    if (sql.includes('INSERT INTO prodx_timeclock_records')) {
      record = { id: String(params[0]), user_id: String(params[3]), status: 'clocked_in' };
      return { rows: [] };
    }
    if (sql.includes('UPDATE prodx_timeclock_records SET status')) {
      if (record) record.status = 'clocked_out';
      return { rows: [] };
    }
    if (sql.includes('SELECT t.id,t.store_id,t.user_id')) {
      return {
        rows: record ? [{
          id: record.id,
          store_id: 'store-1',
          user_id: record.user_id,
          status: record.status,
          clocked_in_at: new Date().toISOString(),
          clocked_out_at: record.status === 'clocked_out' ? new Date().toISOString() : null,
          display_name: record.user_id === 'employee-1' ? 'Employee One' : 'Employee Two',
          username: record.user_id,
        }] : [],
      };
    }
    if (sql.includes('INSERT INTO prodx_audit_log')) return { rows: [] };
    return { rows: [] };
  };

  return {
    query: query as SqlQueryExecutor['query'],
    transaction: async <T>(work: (tx: SqlQueryExecutor) => Promise<T>) =>
      work({ query: query as SqlQueryExecutor['query'] }),
  };
};

test('clock-in is idempotent and duplicate open clock is rejected without poisoning a retry key', async () => {
  process.env.TIMECLOCK_PIN_PEPPER = PEPPER;
  const service = createTimeclockService(await makeDb());
  const first = await service.clockIn(context, '1234', 'clock-in-1');
  const replay = await service.clockIn(context, '1234', 'clock-in-1');
  assert.equal(replay.id, first.id);
  await assert.rejects(service.clockIn(context, '1234', 'clock-in-2'), TimeclockConflictError);
  await service.clockOut(context, '1234', 'clock-out-1');
  const retry = await service.clockIn(context, '1234', 'clock-in-2');
  assert.notEqual(retry.id, first.id);
});

test('same operator reusing an idempotency key for another employee is rejected', async () => {
  process.env.TIMECLOCK_PIN_PEPPER = PEPPER;
  const service = createTimeclockService(await makeDb());
  await service.clockIn(context, '1234', 'shared-key');
  await assert.rejects(service.clockIn(context, '5678', 'shared-key'), TimeclockConflictError);
});

test('wrong PIN attempts persist lockout state instead of rolling back', async () => {
  process.env.TIMECLOCK_PIN_PEPPER = PEPPER;
  const service = createTimeclockService(await makeDb());
  for (let attempt = 0; attempt < 4; attempt += 1) {
    await assert.rejects(service.clockIn(context, '9999', 'bad-pin-' + attempt), TimeclockAuthenticationError);
  }
  await assert.rejects(service.clockIn(context, '9999', 'bad-pin-4'), TimeclockLockedError);
  await assert.rejects(service.clockIn(context, '1234', 'after-lock'), TimeclockLockedError);
});

test('clock-out requires an active clock-in', async () => {
  process.env.TIMECLOCK_PIN_PEPPER = PEPPER;
  const service = createTimeclockService(await makeDb());
  await assert.rejects(service.clockOut(context, '1234', 'clock-out-1'), TimeclockConflictError);
});

test('malformed PIN and missing idempotency key are rejected before database work', async () => {
  process.env.TIMECLOCK_PIN_PEPPER = PEPPER;
  const service = createTimeclockService(await makeDb());
  await assert.rejects(service.clockIn(context, '12', 'bad-format-1'), /4 digits/);
  await assert.rejects(service.clockIn(context, '1234', '   '), /Idempotency key is required/);
});
