import type { AddonManifest, InstalledAddon } from '../types';

export const CINEMETA_MANIFEST_URL = 'https://v3-cinemeta.strem.io/manifest.json';

// Best-effort offline seed so the app is usable before the first real manifest
// fetch completes (or if it fails). Replaced in the background by the live
// fetch of CINEMETA_MANIFEST_URL on every app start
// (docs/02-Phase2-API-Integration.md §3).
const CINEMETA_FALLBACK_MANIFEST: AddonManifest = {
  id: 'com.linvo.cinemeta',
  name: 'Cinemeta',
  version: '1.4.0',
  description: 'Movie/series catalog and metadata',
  resources: ['catalog', 'meta'],
  types: ['movie', 'series'],
  catalogs: [
    { type: 'movie', id: 'top', name: 'Popular', extraSupported: ['search', 'skip', 'genre'] },
    { type: 'series', id: 'top', name: 'Popular', extraSupported: ['search', 'skip', 'genre'] },
  ],
  idPrefixes: ['tt'],
};

export function defaultInstalledAddons(): InstalledAddon[] {
  return [{ manifestUrl: CINEMETA_MANIFEST_URL, manifest: CINEMETA_FALLBACK_MANIFEST, enabled: true }];
}
