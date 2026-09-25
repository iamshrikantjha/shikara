import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import { storage } from './storage';

// Persists the TanStack Query cache to MMKV so a cold start renders from
// yesterday's cache immediately, then silently revalidates
// (docs/02-Phase2-API-Integration.md §7.3 "persisted cache").
const mmkvStorageAdapter = {
  getItem: (key: string) => storage.getString(key) ?? null,
  setItem: (key: string, value: string) => storage.set(key, value),
  removeItem: (key: string) => storage.delete(key),
};

export const queryPersister = createSyncStoragePersister({
  storage: mmkvStorageAdapter,
  key: 'shikara.query-cache',
});
