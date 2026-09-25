import type { AddonCapability, AddonCatalogEntry, AddonManifest } from '../types';

export class AddonManifestError extends Error {}

interface RawExtra {
  name: string;
  options?: string[];
}

interface RawCatalog {
  type: string;
  id: string;
  name: string;
  extra?: RawExtra[];
  extraRequired?: string[];
  extraSupported?: string[];
}

interface RawManifest {
  id?: unknown;
  name?: unknown;
  version?: unknown;
  description?: unknown;
  logo?: unknown;
  resources?: unknown;
  types?: unknown;
  catalogs?: unknown;
  idPrefixes?: unknown;
}

const KNOWN_CAPABILITIES: AddonCapability[] = ['catalog', 'meta', 'stream', 'subtitles'];

// The Stremio manifest spec allows `resources` entries to be either a plain
// capability string ("stream") or an object declaring per-resource
// types/idPrefixes ({"name": "stream", "types": [...], "idPrefixes": [...]})
// — real addons (Torrentio, Comet, HdHub, MediaFusion, TorrentClaw, at least)
// use the object form. Reading only the string form silently produced an
// empty `resources` list for every one of those addons, making them
// invisible to supportsCapability() with no error anywhere.
function parseResources(raw: unknown): AddonCapability[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw
    .map(entry => (typeof entry === 'string' ? entry : typeof entry === 'object' && entry !== null ? (entry as { name?: unknown }).name : undefined))
    .filter((name): name is AddonCapability => KNOWN_CAPABILITIES.includes(name as AddonCapability));
}

function parseCatalogs(raw: unknown): AddonCatalogEntry[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  return (raw as RawCatalog[])
    .filter(c => c && (c.type === 'movie' || c.type === 'series') && typeof c.id === 'string')
    .map(c => {
      const extraNames = (c.extra ?? []).map(e => e.name);
      const genreExtra = (c.extra ?? []).find(e => e.name === 'genre');
      return {
        type: c.type as 'movie' | 'series',
        id: c.id,
        name: c.name ?? c.id,
        extraSupported: extraNames.length > 0 ? extraNames : c.extraSupported ?? [],
        genreOptions: genreExtra?.options,
      };
    });
}

// GET {manifestUrl} and validate it's a well-formed addon manifest
// (docs/02-Phase2-API-Integration.md §4 step 1-2). Never special-cases a
// specific addon — every manifest is parsed the same way.
export async function fetchManifest(manifestUrl: string): Promise<AddonManifest> {
  let response: Response;
  try {
    response = await fetch(manifestUrl);
  } catch {
    throw new AddonManifestError('Could not reach that URL.');
  }
  if (!response.ok) {
    throw new AddonManifestError(`Server responded with ${response.status}.`);
  }

  let raw: RawManifest;
  try {
    raw = await response.json();
  } catch {
    throw new AddonManifestError('Response was not valid JSON.');
  }

  if (typeof raw.id !== 'string' || typeof raw.name !== 'string' || !Array.isArray(raw.resources)) {
    throw new AddonManifestError('Not a valid addon manifest — missing id, name, or resources.');
  }

  return {
    id: raw.id,
    name: raw.name,
    version: typeof raw.version === 'string' ? raw.version : '0.0.0',
    description: typeof raw.description === 'string' ? raw.description : undefined,
    logo: typeof raw.logo === 'string' ? raw.logo : undefined,
    resources: parseResources(raw.resources),
    types: Array.isArray(raw.types) ? raw.types.filter((t): t is 'movie' | 'series' => t === 'movie' || t === 'series') : [],
    catalogs: parseCatalogs(raw.catalogs),
    idPrefixes: Array.isArray(raw.idPrefixes) ? raw.idPrefixes.filter((p): p is string => typeof p === 'string') : undefined,
  };
}
