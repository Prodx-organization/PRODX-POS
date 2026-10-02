import type { OutboxItem } from './sync';

export function normalizeOutboxForRecovery(items: OutboxItem[]): OutboxItem[] {
  return items.map((item) =>
    item.syncState === 'syncing'
      ? { ...item, syncState: 'queued' }
      : item
  );
}