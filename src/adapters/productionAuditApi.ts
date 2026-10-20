import type { IAuditApi } from './types';
import type { AuditAction, AuditLogEntry, AuditSeverity } from '../domain/audit';

const API_BASE_URL = typeof import.meta.env === 'undefined' ? undefined : import.meta.env.VITE_AUTH_API_BASE_URL;
const base = (apiBaseUrl: string | undefined = API_BASE_URL) => {
  if (!apiBaseUrl) throw new Error('VITE_AUTH_API_BASE_URL is required for production audit operations.');
  return apiBaseUrl.replace(/\/$/, '');
};
const requireToken = (token: string) => {
  const normalized = token.trim();
  if (!normalized) throw new Error('Authenticated session token is required for production audit operations.');
  return normalized;
};
const eventRetryKeys = new Map<string, string>();

const storageKeyForEvent = async (signature: string): Promise<string> => {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(signature));
  const fingerprint = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `prodx:audit-event:idempotency:${fingerprint}`;
};

const idempotencyKeyForEvent = async (signature: string): Promise<string> => {
  const cached = eventRetryKeys.get(signature);
  if (cached) return cached;
  if (typeof window !== 'undefined') {
    try {
      const storageKey = await storageKeyForEvent(signature);
      const persisted = window.localStorage.getItem(storageKey);
      if (persisted) {
        eventRetryKeys.set(signature, persisted);
        return persisted;
      }
      const key = `audit-event:${crypto.randomUUID()}`;
      window.localStorage.setItem(storageKey, key);
      eventRetryKeys.set(signature, key);
      return key;
    } catch {
      throw new Error('Persistent browser storage is required to safely retry production audit writes.');
    }
  }
  const key = `audit-event:${crypto.randomUUID()}`;
  eventRetryKeys.set(signature, key);
  return key;
};

const clearEventIdempotencyKey = async (signature: string): Promise<void> => {
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.removeItem(await storageKeyForEvent(signature));
    } catch {
      throw new Error('Audit event was accepted, but its retry key could not be cleared from persistent storage.');
    }
  }
  eventRetryKeys.delete(signature);
};

const mapAuditLog = (value: unknown): AuditLogEntry => {
  if (!value || typeof value !== 'object') throw new Error('Invalid audit log response.');
  const row = value as Record<string, unknown>;
  if (typeof row.id !== 'string' || typeof row.storeId !== 'string' || typeof row.userId !== 'string') {
    throw new Error('Production audit API returned an incomplete audit record.');
  }
  return {
    id: row.id,
    storeId: row.storeId,
    registerId: String(row.registerId ?? ''),
    userId: row.userId,
    userName: String(row.userName ?? ''),
    action: String(row.action) as AuditAction,
    severity: String(row.severity) as AuditSeverity,
    details: (row.details && typeof row.details === 'object' ? row.details : {}) as Record<string, unknown>,
    timestamp: String(row.timestamp),
  };
};

export const createProductionAuditApi = (token: string, apiBaseUrl?: string): IAuditApi => ({
  async getLogs(storeId, limit = 50) {
    const params = new URLSearchParams({ storeId, limit: String(limit) });
    const response = await fetch(`${base(apiBaseUrl)}/api/v1/audit/logs?${params.toString()}`, {
      headers: { Accept: 'application/json', Authorization: `Bearer ${requireToken(token)}` },
      credentials: 'include',
    });
    if (!response.ok) throw new Error(`Production audit read failed with HTTP ${response.status}.`);
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) throw new Error('Production audit API returned a non-JSON response.');
    const data: unknown = await response.json();
    if (!Array.isArray(data)) throw new Error('Production audit API returned an invalid log collection.');
    return data.map(mapAuditLog);
  },
  async recordEvent(storeId, registerId, userId, userName, action, severity, details) {
    const bearerToken = requireToken(token);
    const signature = JSON.stringify({ storeId, userId, action, details });
    const idempotencyKey = await idempotencyKeyForEvent(signature);
    const response = await fetch(`${base(apiBaseUrl)}/api/v1/audit/logs`, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json', Authorization: `Bearer ${bearerToken}` },
      credentials: 'include',
      body: JSON.stringify({ storeId, registerId, userId, userName, action, severity, details, idempotencyKey }),
    });
    if (!response.ok) throw new Error(`Production audit write failed with HTTP ${response.status}; event was not confirmed persisted.`);
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) throw new Error('Production audit API returned a non-JSON write response.');
    const event = mapAuditLog(await response.json());
    await clearEventIdempotencyKey(signature);
    return event;
  },
});
