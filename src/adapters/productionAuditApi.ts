import type { IAuditApi } from './types';
import type { AuditAction, AuditLogEntry, AuditSeverity } from '../domain/audit';

const API_BASE_URL = import.meta.env.VITE_AUTH_API_BASE_URL;
const base = () => {
  if (!API_BASE_URL) throw new Error('VITE_AUTH_API_BASE_URL is required for production audit operations.');
  return API_BASE_URL.replace(/\/$/, '');
};
const requireToken = (token: string) => token.trim();

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

export const createProductionAuditApi = (token: string): IAuditApi => ({
  async getLogs(storeId, limit = 50) {
    const params = new URLSearchParams({ storeId, limit: String(limit) });
    const response = await fetch(`${base()}/api/v1/audit/logs?${params.toString()}`, {
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
    const response = await fetch(`${base()}/api/v1/audit/logs`, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json', Authorization: `Bearer ${requireToken(token)}` },
      credentials: 'include',
      body: JSON.stringify({ storeId, registerId, userId, userName, action, severity, details }),
    });
    if (!response.ok) throw new Error(`Production audit write failed with HTTP ${response.status}; event was not confirmed persisted.`);
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) throw new Error('Production audit API returned a non-JSON write response.');
    return mapAuditLog(await response.json());
  },
});
