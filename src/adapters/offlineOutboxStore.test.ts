import assert from 'node:assert/strict';
import test from 'node:test';
import { loadOutboxItems } from './offlineOutboxStore';

test('durable outbox fails closed when IndexedDB is unavailable', async () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'indexedDB');
  try {
    Object.defineProperty(globalThis, 'indexedDB', {
      configurable: true,
      value: undefined,
    });

    await assert.rejects(
      loadOutboxItems(),
      /IndexedDB is unavailable in this browser\./,
    );
  } finally {
    if (descriptor) {
      Object.defineProperty(globalThis, 'indexedDB', descriptor);
    } else {
      Reflect.deleteProperty(globalThis, 'indexedDB');
    }
  }
});
