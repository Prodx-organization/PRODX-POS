import assert from 'node:assert/strict';
import test from 'node:test';
import {
  AUTH_SESSION_STORAGE_KEY,
  clearPersistedSession,
  readPersistedSession,
  writePersistedSession,
  type SessionStorageLike,
} from '../../src/context/authSessionStorage';

class MemoryStorage implements SessionStorageLike {
  private readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }
}

test('session persistence stores only a normalized bearer token', () => {
  const storage = new MemoryStorage();
  writePersistedSession(storage, ' token-1 ');

  assert.equal(storage.getItem(AUTH_SESSION_STORAGE_KEY), '{"token":"token-1"}');
  assert.deepEqual(readPersistedSession(storage), { token: 'token-1' });
});

test('session persistence rejects blank tokens and malformed state', () => {
  const storage = new MemoryStorage();
  assert.throws(() => writePersistedSession(storage, '   '), /token is required/);

  storage.setItem(AUTH_SESSION_STORAGE_KEY, '{"token":');
  assert.equal(readPersistedSession(storage), null);

  storage.setItem(AUTH_SESSION_STORAGE_KEY, '{"organization":{"id":"untrusted"}}');
  assert.equal(readPersistedSession(storage), null);
});

test('session persistence clears the browser-scoped token', () => {
  const storage = new MemoryStorage();
  writePersistedSession(storage, 'token-2');
  clearPersistedSession(storage);
  assert.equal(readPersistedSession(storage), null);
});