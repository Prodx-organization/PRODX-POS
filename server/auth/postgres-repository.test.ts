import assert from 'node:assert/strict';
import test from 'node:test';
import { createPostgresAuthenticationRepository, type SqlExecutor } from './postgres-repository';

test('credential lookup maps authoritative user and credential state', async () => {
  const calls: Array<{ sql: string; parameters: readonly unknown[] }> = [];
  const db: SqlExecutor = {
    async query<T extends Record<string, unknown>>(sql: string, parameters = []): Promise<readonly T[]> {
      calls.push({ sql, parameters });
      const row = { userId: 'user-1', organizationId: 'org-1', username: 'cashier', status: 'active',
        credential_type: 'password', secret_hash: 'scrypt$hash', failed_attempts: 2, locked_until: null };
      return [row as unknown as T];
    },
  };
  const repository = createPostgresAuthenticationRepository(db);
  const result = await repository.findCredentialByUsername('cashier');
  assert.deepEqual(result, { userId: 'user-1', organizationId: 'org-1', username: 'cashier', status: 'active',
    credentialType: 'password', secretHash: 'scrypt$hash', failedAttempts: 2, lockedUntil: null });
  assert.deepEqual(calls[0].parameters, ['cashier', null]);
  assert.match(calls[0].sql, /lower\(u\.username\) = lower\(\$1\)/);
});

test('credential lookup is scoped to the requested organization', async () => {
  const calls: Array<{ sql: string; parameters: readonly unknown[] }> = [];
  const db: SqlExecutor = {
    async query<T extends Record<string, unknown>>(sql: string, parameters = []): Promise<readonly T[]> {
      calls.push({ sql, parameters });
      return [];
    },
  };
  assert.equal(await createPostgresAuthenticationRepository(db).findCredentialByUsername('cashier', 'org-2'), null);
  assert.deepEqual(calls[0].parameters, ['cashier', 'org-2']);
  assert.match(calls[0].sql, /u\.organization_id = \$2::uuid/);
});

test('session revocation only revokes active sessions', async () => {
  const calls: Array<{ sql: string; parameters: readonly unknown[] }> = [];
  const db: SqlExecutor = {
    async query<T extends Record<string, unknown>>(sql: string, parameters = []): Promise<readonly T[]> {
      calls.push({ sql, parameters });
      return [];
    },
  };
  const at = new Date('2030-01-01T00:00:00Z');
  await createPostgresAuthenticationRepository(db).revokeSession('session-1', at);
  assert.deepEqual(calls[0].parameters, ['session-1', at]);
  assert.match(calls[0].sql, /SET revoked_at = \$2/);
  assert.match(calls[0].sql, /revoked_at IS NULL/);
});

test('session lookup joins user status instead of trusting session state', async () => {
  const db: SqlExecutor = { async query<T extends Record<string, unknown>>(): Promise<readonly T[]> {
    return [{ id: 'session-1', organization_id: 'org-1', user_id: 'user-1', device_id: 'device-1',
      token_hash: 'hash', expires_at: new Date('2030-01-01T00:00:00Z'), revoked_at: null, user_status: 'active' } as unknown as T];
  }};
  const result = await createPostgresAuthenticationRepository(db).findSessionByTokenHash('hash');
  assert.equal(result?.userStatus, 'active');
  assert.equal(result?.organizationId, 'org-1');
  assert.equal(result?.tokenHash, 'hash');
});

test('credential and session writes remain parameterized and persist auth security events atomically', async () => {
  const calls: Array<{ sql: string; parameters: readonly unknown[] }> = [];
  const db: SqlExecutor = { async query<T extends Record<string, unknown>>(sql: string, parameters = []): Promise<readonly T[]> {
    calls.push({ sql, parameters }); return [];
  }};
  const repository = createPostgresAuthenticationRepository(db);
  const lockout = new Date('2030-01-01T00:15:00Z');
  await repository.createSession({ id: 'session-1', organizationId: 'org-1', userId: 'user-1', deviceId: 'device-1', tokenHash: 'token-hash', expiresAt: new Date('2030-01-01T00:00:00Z') });
  await repository.recordFailedAttempt('user-1', lockout);
  await repository.resetFailedAttempts('user-1');
  await repository.touchSession('session-1', new Date('2030-01-01T00:00:00Z'));
  assert.equal(calls.length, 4);
  assert.ok(calls.every(({ sql }) => !sql.includes('token-hash')));
  assert.deepEqual(calls[1].parameters.slice(0, 2), ['user-1', lockout]);
  assert.equal(calls[1].parameters.length, 3);
  assert.match(calls[1].sql, /AUTH_LOCKOUT/);
  assert.match(calls[2].sql, /AUTH_LOCKOUT_RESET/);
  assert.equal(calls[2].parameters.length, 2);
});
