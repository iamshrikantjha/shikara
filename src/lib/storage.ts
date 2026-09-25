import { MMKV } from 'react-native-mmkv';

// Single on-device store for addons/library/history (docs/02-Phase2-API-Integration.md
// "Local persistence" — device-only, no account, no sync, ever).
export const storage = new MMKV({ id: 'shikara-storage' });

export function getJSON<T>(key: string, fallback: T): T {
  const raw = storage.getString(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function setJSON(key: string, value: unknown): void {
  storage.set(key, JSON.stringify(value));
}

export const StorageKeys = {
  addons: 'shikara.addons',
  library: 'shikara.library',
  history: 'shikara.history',
  settings: 'shikara.settings',
  addonsSeeded: 'shikara.addonsSeeded',
} as const;
