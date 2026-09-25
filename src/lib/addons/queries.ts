import type { InstalledAddon, Media, MediaType, Stream, SubtitleTrack } from '../types';
import { addonsSupporting, catalogFor } from './capability';
import { fetchCatalog, fetchMeta, fetchStream, fetchSubtitles, type CatalogExtra } from './api';
import { normalizeCatalogItem, normalizeMeta, normalizeStream, normalizeSubtitle } from './normalize';
import { combineStreamResults, mergeMediaLists, mergeSubtitleTracks, settleAcrossAddons, unionGenres } from './merge';

export interface MergedCatalogResult {
  items: Media[];
  failedAddons: InstalledAddon[];
}

// Home/Discover/Search all fan out to every catalog-capable addon that
// declares a catalog for this type, merge the results, and isolate failures
// per-addon (docs/02-Phase2-API-Integration.md §6, §9).
export async function fetchMergedCatalog(
  addons: InstalledAddon[],
  type: MediaType,
  extra?: CatalogExtra,
): Promise<MergedCatalogResult> {
  const capable = addons.filter(a => a.enabled && catalogFor(a, type));
  const { results, failedAddons } = await settleAcrossAddons(capable, async addon => {
    const catalog = catalogFor(addon, type)!;
    const raw = await fetchCatalog(addon, type, catalog.id, extra);
    return raw.map(item => normalizeCatalogItem(item, type));
  });
  return { items: mergeMediaLists(results.map(r => r.value)), failedAddons };
}

// First meta-capable addon (in Addon Manager priority order) that returns a
// result wins — docs §6.
export async function fetchMergedMeta(addons: InstalledAddon[], type: MediaType, id: string): Promise<Media | null> {
  const capable = addonsSupporting(addons, 'meta');
  for (const addon of capable) {
    try {
      const raw = await fetchMeta(addon, type, id);
      if (raw) {
        return normalizeMeta(raw, type);
      }
    } catch {
      // try the next addon in priority order
    }
  }
  return null;
}

// "More Like This" — real catalog data filtered client-side by genre overlap,
// since the addon protocol has no dedicated related-titles endpoint.
export async function fetchRelated(
  addons: InstalledAddon[],
  type: MediaType,
  excludeId: string,
  genres: string[],
): Promise<Media[]> {
  const { items } = await fetchMergedCatalog(addons, type);
  return items.filter(item => item.id !== excludeId && item.genres.some(g => genres.includes(g))).slice(0, 8);
}

export interface MergedStreamResult {
  items: Stream[];
  failedAddons: InstalledAddon[];
}

// Streams screen fans out to every stream-capable addon in parallel and
// concatenates results — multiple sources for the same title is the point,
// unlike catalog/meta's id-collapsing merge (docs/03-Phase3-Torrent-Streaming.md §4.1.3).
export async function fetchMergedStreams(addons: InstalledAddon[], type: MediaType, id: string): Promise<MergedStreamResult> {
  const capable = addonsSupporting(addons, 'stream');
  const { results, failedAddons } = await settleAcrossAddons(capable, async addon => {
    const raw = await fetchStream(addon, type, id);
    return raw.map(item => normalizeStream(item, addon.manifest.name));
  });
  return { items: combineStreamResults(results.map(r => r.value)), failedAddons };
}

export interface MergedSubtitleResult {
  items: SubtitleTrack[];
  failedAddons: InstalledAddon[];
}

// Player's subtitle picker fans out to every subtitles-capable addon and
// dedupes only exact duplicates (docs/03 §3.2/§4.2.3).
export async function fetchMergedSubtitles(
  addons: InstalledAddon[],
  type: MediaType,
  id: string,
): Promise<MergedSubtitleResult> {
  const capable = addonsSupporting(addons, 'subtitles');
  const { results, failedAddons } = await settleAcrossAddons(capable, async addon => {
    const raw = await fetchSubtitles(addon, type, id);
    return raw.map(item => normalizeSubtitle(item, addon.manifest.name));
  });
  return { items: mergeSubtitleTracks(results.map(r => r.value)), failedAddons };
}

// Genre chip options for Discover — unioned from whatever installed catalog
// addons declare, no hardcoded list (docs §6).
export function genresFor(addons: InstalledAddon[], type: MediaType): string[] {
  const options = addons
    .filter(a => a.enabled)
    .map(a => catalogFor(a, type)?.genreOptions)
    .filter((o): o is string[] => Boolean(o));
  return unionGenres(options);
}
