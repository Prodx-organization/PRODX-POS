import assert from 'node:assert/strict';
import test from 'node:test';
import { checkLoginThrottle, fingerprintClient, recordLoginFailure, type LoginThrottleDecision } from './login-rate-limit';
import type { SqlExecutor } from './postgres-repository';

test('client fingerprints are deterministic and do not equal raw addresses', () => {
  assert.equal(fingerprintClient('203.0.113.10'), fingerprintClient('203.0.113.10'));
  assert.notEqual(fingerprintClient('203.0.113.10'), '203.0.113.10');
});

test('login throttle blocks after twenty failures without blocking the first nineteen', async () => {
  const state = { failedAttempts: 0, windowStartedAt: new Date('2026-10-05T00:00:00.000Z'), lockedUntil: null as Date | null };
  const db: SqlExecutor = {
    async query<T extends Record<string, unknown>>(sql: string, parameters: readonly unknown[] = []): Promise<readonly T[]> {
      if (sql.includes('SELECT locked_until')) {
        return (state.failedAttempts === 0 ? [] : [{ failed_attempts: state.failedAttempts, window_started_at: state.windowStartedAt, locked_until: state.lockedUntil }] as T[]);
      }
      if (sql.includes('INSERT INTO prodx_auth_login_throttles')) {
        const now = parameters[1] as Date;
        state.failedAttempts = state.windowStartedAt.getTime() + 10 * 60 * 1000 <= now.getTime() ? 1 : state.failedAttempts + 1;
        state.windowStartedAt = state.failedAttempts === 1 ? now : state.windowStartedAt;
        state.lockedUntil = state.failedAttempts >= 20 ? new Date(now.getTime() + 60_000) : null;
        return [{ failed_attempts: state.failedAttempts, locked_until: state.lockedUntil }] as T[];
      }
      if (sql.includes('UPDATE prodx_auth_login_throttles')) {
        state.failedAttempts = 0;
        state.lockedUntil = null;
        state.windowStartedAt = parameters[1] as Date;
        return [] as T[];
      }
      return [] as T[];
    },
  };
  const now = new Date('2026-10-05T00:00:00.000Z');
  let decision: LoginThrottleDecision = { allowed: true };
  for (let attempt = 1; attempt <= 20; attempt += 1) {
    decision = await recordLoginFailure(db, '203.0.113.10', now);
    if (attempt < 20) assert.equal(decision.allowed, true);
  }
  assert.equal(decision.allowed, false);
  assert.ok((decision.retryAfterSeconds ?? 0) > 0);
  const blocked = await checkLoginThrottle(db, '203.0.113.10', now);
  assert.equal(blocked.allowed, false);
});
