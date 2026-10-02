import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeOutboxForRecovery } from './sync-recovery';
import type { OutboxItem } from './sync';

const item = (syncState: OutboxItem['syncState']): OutboxItem => ({
  id: `outbox-${syncState}`,
  type: 'order_transaction',
  idempotencyKey: 'idem-1',
  payload: {},
  createdAt: '2026-10-02T00:00:00.000Z',
  attempts: 1,
  syncState,
});

test('offline recovery requeues commands left syncing by a crashed browser', () => {
  const recovered = normalizeOutboxForRecovery([
    item('syncing'),
    item('queued'),
    item('failed'),
    item('synced'),
  ]);

  assert.deepEqual(recovered.map((entry) => entry.syncState), [
    'queued',
    'queued',
    'failed',
    'synced',
  ]);
});

test('offline recovery preserves server-confirmed synced items', () => {
  const synced: OutboxItem = {
    ...item('synced'),
    serverConfirmedId: 'order-1',
    serverConfirmedAt: '2026-10-02T00:01:00.000Z',
  };

  const [recovered] = normalizeOutboxForRecovery([synced]);
  assert.equal(recovered.syncState, 'synced');
  assert.equal(recovered.serverConfirmedId, 'order-1');
  assert.equal(recovered.serverConfirmedAt, '2026-10-02T00:01:00.000Z');
});