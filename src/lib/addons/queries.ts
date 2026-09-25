import type { InstalledAddon, Media, MediaType } from '../types';
import { addonsSupporting, catalogFor } from './capability';
import { fetchCatalog, fetchMeta, type CatalogExtra } from './api';
import { normalizeCatalogItem, normalizeMeta } from './normalize';
import { mergeMediaLists, settleAcrossAddons, unionGenres } from './merge';

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

// Genre chip options for Discover — unioned from whatever installed catalog
// addons declare, no hardcoded list (docs §6).
export function genresFor(addons: InstalledAddon[], type: MediaType): string[] {
  const options = addons
    .filter(a => a.enabled)
    .map(a => catalogFor(a, type)?.genreOptions)
    .filter((o): o is string[] => Boolean(o));
  return unionGenres(options);
}
