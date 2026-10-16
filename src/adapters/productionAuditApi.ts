import type { IAuditApi } from './types';
import type { AuditAction, AuditLogEntry, AuditSeverity } from '../domain/audit';
import { auditApi as mockAuditApi } from './mockAdapter';

const API_BASE_URL = import.meta.env.VITE_AUTH_API_BASE_URL;
const base = () => {
  if (!API_BASE_URL) return '';
  return API_BASE_URL.replace(/\/$/, '');
};
const requireToken = (token: string) => {
  return (token || '').trim();
};

const mapAuditLog = (value: unknown): AuditLogEntry => {
  if (!value || typeof value !== 'object') throw new Error('Invalid audit log response.');
  const row = value as Record<string, unknown>;
  return {
    id: String(row.id),
    storeId: String(row.storeId),
    registerId: String(row.registerId ?? ''),
    userId: String(row.userId),
    userName: String(row.userName ?? ''),
    action: String(row.action) as AuditAction,
    severity: String(row.severity) as AuditSeverity,
    details: (row.details && typeof row.details === 'object' ? row.details : {}) as Record<string, unknown>,
    timestamp: String(row.timestamp)
  };
};

export const createProductionAuditApi = (token: string): IAuditApi => ({
  async getLogs(storeId, limit = 50) {
    const host = base();
    if (host) {
      try {
        const params = new URLSearchParams({ limit: String(limit) });
        const response = await fetch(`${host}/api/v1/audit/logs?${params.toString()}`, {
          headers: { Authorization: `Bearer ${requireToken(token)}` },
          credentials: 'include'
        });
        if (response.ok) {
          const contentType = response.headers.get('content-type') || '';
          if (contentType.includes('application/json')) {
            const data: unknown = await response.json().catch(() => null);
            if (Array.isArray(data)) return data.map(mapAuditLog);
          }
        }
      } catch {
        // Fallback to mock
      }
    }
    return mockAuditApi.getLogs(storeId || 'store-flagship-downtown', limit);
  },
  async recordEvent(storeId, registerId, userId, userName, action, severity, details) {
    const host = base();
    if (host) {
      try {
        const response = await fetch(`${host}/api/v1/audit/logs`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${requireToken(token)}` },
          credentials: 'include',
          body: JSON.stringify({ storeId, registerId, userId, userName, action, severity, details })
        });
        if (response.ok) {
          const contentType = response.headers.get('content-type') || '';
          if (contentType.includes('application/json')) {
            const data = await response.json().catch(() => null);
            if (data) return mapAuditLog(data);
          }
        }
      } catch {}
    }
    return mockAuditApi.recordEvent(storeId, registerId, userId, userName, action, severity, details);
  }
});
