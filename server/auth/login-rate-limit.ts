import crypto from 'node:crypto';
import type { SqlExecutor } from './postgres-repository';

const WINDOW_MS = 10 * 60 * 1000;

export const fingerprintClient = (clientAddress: string): string =>
  crypto.createHash('sha256').update(clientAddress, 'utf8').digest('hex');

export type LoginThrottleDecision = { allowed: boolean; retryAfterSeconds?: number };

export const checkLoginThrottle = async (db: SqlExecutor, clientAddress: string, now = new Date()): Promise<LoginThrottleDecision> => {
  const fingerprint = fingerprintClient(clientAddress);
  const rows = await db.query<{ locked_until: Date | null; window_started_at: Date; failed_attempts: number }>(
    `SELECT locked_until, window_started_at, failed_attempts
       FROM prodx_auth_login_throttles
      WHERE client_fingerprint = $1
      LIMIT 1`, [fingerprint]);
  const row = rows[0];
  if (!row) return { allowed: true };
  if (row.locked_until && row.locked_until > now) {
    return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((row.locked_until.getTime() - now.getTime()) / 1000)) };
  }
  if (now.getTime() - row.window_started_at.getTime() >= WINDOW_MS) {
    await db.query(`UPDATE prodx_auth_login_throttles SET failed_attempts = 0, window_started_at = $2, locked_until = NULL, updated_at = $2 WHERE client_fingerprint = $1`, [fingerprint, now]);
  }
  return { allowed: true };
};

export const recordLoginFailure = async (db: SqlExecutor, clientAddress: string, now = new Date()): Promise<LoginThrottleDecision> => {
  const fingerprint = fingerprintClient(clientAddress);
  const rows = await db.query<{ failed_attempts: number; locked_until: Date | null }>(
    `INSERT INTO prodx_auth_login_throttles (client_fingerprint, failed_attempts, window_started_at, locked_until, updated_at)
     VALUES ($1, 1, $2, NULL, $2)
     ON CONFLICT (client_fingerprint) DO UPDATE
       SET failed_attempts = CASE
             WHEN prodx_auth_login_throttles.window_started_at + INTERVAL '10 minutes' <= $2
               THEN 1 ELSE prodx_auth_login_throttles.failed_attempts + 1 END,
           window_started_at = CASE
             WHEN prodx_auth_login_throttles.window_started_at + INTERVAL '10 minutes' <= $2
               THEN $2 ELSE prodx_auth_login_throttles.window_started_at END,
           locked_until = CASE
             WHEN prodx_auth_login_throttles.window_started_at + INTERVAL '10 minutes' <= $2
               THEN NULL
             WHEN prodx_auth_login_throttles.failed_attempts + 1 >= 20
               THEN $2 + INTERVAL '1 minute'
             ELSE prodx_auth_login_throttles.locked_until END,
           updated_at = $2
     RETURNING failed_attempts, locked_until`, [fingerprint, now]);
  const row = rows[0];
  if (row?.locked_until && row.locked_until > now) {
    return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((row.locked_until.getTime() - now.getTime()) / 1000)) };
  }
  return { allowed: true };
};
