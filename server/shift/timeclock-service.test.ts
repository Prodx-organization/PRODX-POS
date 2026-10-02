import assert from 'node:assert/strict';
import test from 'node:test';
import type { SqlQueryExecutor, TransactionalSqlExecutor } from '../db/transaction';
import { hashPassword } from '../auth/password';
import { createTimeclockService, TimeclockAuthenticationError, TimeclockConflictError } from './timeclock-service';

const context = { organizationId: 'org-1', storeId: 'store-1', userId: 'operator-1' };

const makeDb = async (pin = '1234'): Promise<TransactionalSqlExecutor> => {
  const pinHash = await hashPassword(pin);
  const credentials = new Map<string, { failed_attempts: number; locked_until: Date | null }>();
  let record: { id: string; user_id: string; status: 'clocked_in' | 'clocked_out' } | null = null;
  const operations = new Map<string, { id: string; payload_hash: string; result_id: string | null }>();

  const query = async (sql: string, params: readonly unknown[] = []) => {
    if (sql.includes('FROM prodx_timeclock_auth_attempts')) return { rows: [] };
    if (sql.includes('FROM prodx_timeclock_credentials') && sql.includes('pin_lookup_hash')) {
      if (pin !== '1234') return { rows: [] };
      const state = credentials.get('employee-1') ?? { failed_attempts: 0, locked_until: null };
      return { rows: [{ user_id: 'employee-1', pin_hash: pinHash, ...state, status: 'active', display_name: 'Employee' }] };
    }
    if (sql.includes('UPDATE prodx_timeclock_credentials') && sql.includes('failed_attempts=$4')) {
      const current = credentials.get('employee-1') ?? { failed_attempts: 0, locked_until: null };
      const next = Number(params[3]);
      credentials.set('employee-1', { failed_attempts: next, locked_until: next >= 5 ? new Date(Date.now() + 900_000) : current.locked_until });
      return { rows: [] };
    }
    if (sql.includes('UPDATE prodx_timeclock_credentials') && sql.includes('failed_attempts=0')) {
      credentials.set('employee-1', { failed_attempts: 0, locked_until: null });
      return { rows: [] };
    }
    if (sql.includes('INSERT INTO prodx_timeclock_auth_attempts') || sql.includes('DELETE FROM prodx_timeclock_auth_attempts')) return { rows: [] };
    if (sql.includes('INSERT INTO prodx_timeclock_operations')) {
      const key = String(params[5]);
      if (operations.has(key)) return { rows: [] };
      const id = `op-${operations.size + 1}`;
      operations.set(key, { id, payload_hash: String(params[6]), result_id: null });
      return { rows: [{ id }] };
    }
    if (sql.includes('FROM prodx_timeclock_operations')) {
      const key = String(params[2]);
      const op = operations.get(key);
      return { rows: op ? [op] : [] };
    }
    if (sql.includes('FROM prodx_timeclock_records') && sql.includes("status='clocked_in'")) {
      return { rows: record?.status === 'clocked_in' ? [{ id: record.id }] : [] };
    }
    if (sql.includes('INSERT INTO prodx_timeclock_records')) {
      record = { id: String(params[0]), user_id: 'employee-1', status: 'clocked_in' };
      return { rows: [] };
    }
    if (sql.includes('UPDATE prodx_timeclock_records SET status')) {
      if (record) record.status = 'clocked_out';
      return { rows: [] };
    }
    if (sql.includes('UPDATE prodx_timeclock_operations')) {
      for (const op of operations.values()) if (op.id === String(params[1])) op.result_id = String(params[0]);
      return { rows: [] };
    }
    if (sql.includes('SELECT t.id,t.store_id,t.user_id')) {
      return { rows: record ? [{ id: record.id, store_id: 'store-1', user_id: record.user_id, status: record.status, clocked_in_at: new Date().toISOString(), clocked_out_at: record.status === 'clocked_out' ? new Date().toISOString() : null, display_name: 'Employee', username: 'employee-1' }] : [] };
    }
    if (sql.includes('prodx_audit_log')) return { rows: [] };
    return { rows: [] };
  };

  return {
    query: query as SqlQueryExecutor['query'],
    transaction: async work => work({ query: query as SqlQueryExecutor['query'] }),
  };
};

test('clock-in is idempotent and duplicate open clock is rejected', async () => {
  process.env.TIMECLOCK_PIN_PEPPER = 'test-pepper';
  const service = createTimeclockService(await makeDb());
  const first = await service.clockIn(context, '1234', 'clock-in-1');
  assert.equal(first.status, 'clocked_in');
  const replay = await service.clockIn(context, '1234', 'clock-in-1');
  assert.equal(replay.id, first.id);
  await assert.rejects(service.clockIn(context, '1234', 'clock-in-2'), TimeclockConflictError);
});

test('wrong PIN is rejected without returning credential details', async () => {
  process.env.TIMECLOCK_PIN_PEPPER = 'test-pepper';
  const service = createTimeclockService(await makeDb());
  await assert.rejects(service.clockIn(context, '9999', 'bad-pin-1'), TimeclockAuthenticationError);
});

test('clock-out requires an active clock-in', async () => {
  process.env.TIMECLOCK_PIN_PEPPER = 'test-pepper';
  const service = createTimeclockService(await makeDb());
  await assert.rejects(service.clockOut(context, '1234', 'clock-out-1'), TimeclockConflictError);
});

test('malformed PIN is rejected before database authentication', async () => {
  process.env.TIMECLOCK_PIN_PEPPER = 'test-pepper';
  const service = createTimeclockService(await makeDb());
  await assert.rejects(service.clockIn(context, '12', 'bad-format-1'), /4 digits/);
});
