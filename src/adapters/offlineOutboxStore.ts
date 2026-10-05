import type { OutboxItem } from '../domain/sync';

const DB_NAME = 'prodx-pos-offline';
const DB_VERSION = 1;
const STORE_NAME = 'outbox';

function openDatabase(): Promise<IDBDatabase> {
  if (typeof indexedDB === 'undefined') {
    return Promise.reject(new Error('IndexedDB is unavailable in this browser.'));
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error ?? new Error('Failed to open offline outbox database.'));
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
  });
}

export async function loadOutboxItems(): Promise<OutboxItem[]> {
  const db = await openDatabase();
  try {
    return await new Promise<OutboxItem[]>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const request = transaction.objectStore(STORE_NAME).getAll();
      request.onerror = () => reject(request.error ?? new Error('Failed to load offline outbox.'));
      request.onsuccess = () => resolve(request.result as OutboxItem[]);
    });
  } finally {
    db.close();
  }
}

export async function putOutboxItem(item: OutboxItem): Promise<void> {
  const db = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      transaction.onerror = () => reject(transaction.error ?? new Error('Failed to persist offline outbox item.'));
      transaction.oncomplete = () => resolve();
      transaction.objectStore(STORE_NAME).put(item);
    });
  } finally {
    db.close();
  }
}

export async function replaceOutboxItems(items: OutboxItem[]): Promise<void> {
  const db = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      transaction.onerror = () => reject(transaction.error ?? new Error('Failed to replace offline outbox.'));
      transaction.oncomplete = () => resolve();
      const store = transaction.objectStore(STORE_NAME);
      store.clear();
      for (const item of items) store.put(item);
    });
  } finally {
    db.close();
  }
}

export async function removeOutboxItem(id: string): Promise<void> {
  const db = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      transaction.onerror = () => reject(transaction.error ?? new Error('Failed to remove offline outbox item.'));
      transaction.oncomplete = () => resolve();
      transaction.objectStore(STORE_NAME).delete(id);
    });
  } finally {
    db.close();
  }
}

export async function clearOutboxItems(): Promise<void> {
  const db = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      transaction.onerror = () => reject(transaction.error ?? new Error('Failed to clear offline outbox.'));
      transaction.oncomplete = () => resolve();
      transaction.objectStore(STORE_NAME).clear();
    });
  } finally {
    db.close();
  }
}
