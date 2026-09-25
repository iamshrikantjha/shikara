import type { InstalledAddon, MediaType } from '../types';
import type { RawMetaItem, RawStreamItem, RawSubtitleItem } from './normalize';

export class AddonRequestError extends Error {}

function addonBaseUrl(addon: InstalledAddon): string {
  return addon.manifestUrl.replace(/\/manifest\.json$/, '');
}

export interface CatalogExtra {
  skip?: number;
  search?: string;
  genre?: string;
}

function buildExtraSegment(extra?: CatalogExtra): string {
  if (!extra) return '';
  const parts: string[] = [];
  if (extra.search) parts.push(`search=${encodeURIComponent(extra.search)}`);
  if (extra.genre) parts.push(`genre=${encodeURIComponent(extra.genre)}`);
  if (extra.skip) parts.push(`skip=${extra.skip}`);
  return parts.length > 0 ? `/${parts.join('&')}` : '';
}

async function getJson<T>(url: string): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url);
  } catch (err) {
    throw new AddonRequestError(`Network request failed: ${(err as Error).message}`);
  }
  if (!response.ok) {
    throw new AddonRequestError(`Addon responded with ${response.status}`);
  }
  return response.json() as Promise<T>;
}

// GET {addonBaseURL}/catalog/{type}/{catalogId}[/extra].json
// (docs/02-Phase2-API-Integration.md §2.2) — plain GET, no auth, same
// convention for every addon regardless of name.
export async function fetchCatalog(
  addon: InstalledAddon,
  type: MediaType,
  catalogId: string,
  extra?: CatalogExtra,
): Promise<RawMetaItem[]> {
  const url = `${addonBaseUrl(addon)}/catalog/${type}/${catalogId}${buildExtraSegment(extra)}.json`;
  const data = await getJson<{ metas?: RawMetaItem[] }>(url);
  return data.metas ?? [];
}

// GET {addonBaseURL}/meta/{type}/{id}.json
export async function fetchMeta(addon: InstalledAddon, type: MediaType, id: string): Promise<RawMetaItem | null> {
  const url = `${addonBaseUrl(addon)}/meta/${type}/${encodeURIComponent(id)}.json`;
  const data = await getJson<{ meta?: RawMetaItem }>(url);
  return data.meta ?? null;
}

// GET {addonBaseURL}/stream/{type}/{id}.json (docs/03-Phase3-Torrent-Streaming.md §4.1.2)
// {id} is `{imdbId}` for a movie or `{imdbId}:{season}:{episode}` for an episode.
export async function fetchStream(addon: InstalledAddon, type: MediaType, id: string): Promise<RawStreamItem[]> {
  const url = `${addonBaseUrl(addon)}/stream/${type}/${encodeURIComponent(id)}.json`;
  const data = await getJson<{ streams?: RawStreamItem[] }>(url);
  return data.streams ?? [];
}

// GET {addonBaseURL}/subtitles/{type}/{id}.json (docs/03-Phase3-Torrent-Streaming.md §4.2.2)
export async function fetchSubtitles(addon: InstalledAddon, type: MediaType, id: string): Promise<RawSubtitleItem[]> {
  const url = `${addonBaseUrl(addon)}/subtitles/${type}/${encodeURIComponent(id)}.json`;
  const data = await getJson<{ subtitles?: RawSubtitleItem[] }>(url);
  return data.subtitles ?? [];
}
