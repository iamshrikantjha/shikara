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

// Testing default set — installed once on first launch (AddonsContext),
// exactly as if the user pasted each URL into the Addon Manager themselves.
// Not hardcoded fallback manifests like Cinemeta above: these are fetched
// live and simply don't get added if unreachable (best-effort, same as any
// manual install failure) rather than blocking startup or showing an error.
export const DEFAULT_SEED_ADDON_URLS: string[] = [
  'https://torrentio.strem.fun/manifest.json',
  'https://7a82163c306e-stremio-netflix-catalog-addon.baby-beamup.club/manifest.json',
  'https://comet.elfhosted.com/manifest.json',
  'https://thepiratebay-plus.strem.fun/manifest.json',
  'https://aiostreams.elfhosted.com/stremio/manifest.json',
  'https://top-streaming.stream/username=temporary_username/manifest.json',
  'https://hdhub.thevolecitor.qzz.io/eyJ0b3Jib3giOiJ1bnNldCIsInF1YWxpdGllcyI6IjIxNjBwLDEwODBwLDcyMHAiLCJzb3J0IjoiZGVzYyJ9/manifest.json',
  'https://torrentclaw.com/api/stremio/manifest.json',
  'https://mediafusion.elfhosted.com/manifest.json',
  'https://torrentsdb.com/manifest.json',
  'https://addon-marvel.gonp.deno.net/manifest.json',
  'https://94c8cb9f702d-tmdb-addon.baby-beamup.club/manifest.json',
];
