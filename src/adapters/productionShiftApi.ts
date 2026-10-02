import type { IShiftApi } from './types';
import type { CashMovement, Shift, TimeclockRecord, CashMovementType } from '../domain/shift';

const API_BASE_URL = import.meta.env.VITE_AUTH_API_BASE_URL;
const base = () => {
  if (!API_BASE_URL) throw new Error('Production shift API is not configured: VITE_AUTH_API_BASE_URL is missing.');
  return API_BASE_URL.replace(/\/$/, '');
};

export function createProductionShiftApi(token: string): IShiftApi {
  if (!token.trim()) throw new Error('Authenticated session token is required for shift access.');
  const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
    const res = await fetch(base() + path, {
      ...init,
      credentials: 'include',
      headers: { Accept: 'application/json', Authorization: 'Bearer ' + token, ...(init?.headers ?? {}) },
    });
    const body = await res.json().catch(() => null);
    if (!res.ok) {
      const message = body && typeof body === 'object' && 'error' in body
        ? String((body as Record<string, any>).error?.message ?? 'Shift request failed.')
        : 'Shift request failed.';
      throw new Error(message);
    }
    return body as T;
  };
  return {
    getCurrentShift: (_storeId, registerId) => request<Shift>('/api/v1/shifts/current?registerId=' + encodeURIComponent(registerId)),
    openShift: (_storeId, registerId, openingFloat, cashier, idempotencyKey = crypto.randomUUID()) => request<Shift>('/api/v1/shifts/open', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ registerId, openingFloat, cashierId: cashier.id, cashierName: cashier.name, idempotencyKey }) }),
    closeShift: (shiftId, actualCountedCash, notes, idempotencyKey = crypto.randomUUID()) => request<Shift>('/api/v1/shifts/' + encodeURIComponent(shiftId) + '/close', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ actualCountedCash, notes, idempotencyKey }) }),
    recordCashMovement: (shiftId, type, amount, reason, _userId, idempotencyKey = crypto.randomUUID()) => request<CashMovement>('/api/v1/shifts/' + encodeURIComponent(shiftId) + '/cash-movements', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type, amount, reason, idempotencyKey }) }),
    clockIn: (pin, _storeId, idempotencyKey = crypto.randomUUID()) => request<TimeclockRecord>('/api/v1/timeclock/clock-in', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pin, idempotencyKey }) }),
    clockOut: (pin, _storeId, idempotencyKey = crypto.randomUUID()) => request<TimeclockRecord>('/api/v1/timeclock/clock-out', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pin, idempotencyKey }) }),
    getTimeclockRecords: (_storeId) => request<TimeclockRecord[]>('/api/v1/timeclock/records'),
  };
}