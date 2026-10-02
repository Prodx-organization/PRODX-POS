import { clearAllCachedData } from '../lib/indexedDb';

/**
 * PRODX POS - Complete System Cache & Storage Reset Utility
 *
 * Clears client-owned cache/storage only. Authoritative production state is
 * server-owned and must never be reset through the mock adapter.
 */
export async function clearEntireSystemCache(reloadWindow = false): Promise<void> {
  try {
    // 1. Clear IndexedDB offline storage
    await clearAllCachedData();

    // 2. Clear client-owned LocalStorage keys
    if (typeof window !== 'undefined' && window.localStorage) {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('prodx_') || key.startsWith('PRODX_') || key.includes('pos_') || key.includes('theme'))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
    }

    // 3. Clear SessionStorage
    if (typeof window !== 'undefined' && window.sessionStorage) {
      sessionStorage.clear();
    }

    // 4. Broadcast reset event across open tabs
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        const bc = new BroadcastChannel('prodx_pos_system_events');
        bc.postMessage({ type: 'SYSTEM_CACHE_CLEARED', timestamp: Date.now() });
        bc.close();
      } catch {
        // ignore
      }
    }

    if (reloadWindow && typeof window !== 'undefined') {
      window.location.reload();
    }
  } catch (error) {
    console.error('[SystemReset] Error clearing system cache:', error);
    throw error;
  }
}
