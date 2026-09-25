export type MediaType = 'movie' | 'series';

export interface CastMember {
  name: string;
  character?: string;
  photoUrl?: string;
}

export interface CrewInfo {
  director?: string;
  studio?: string;
}

export interface BaseMedia {
  id: string;
  type: MediaType;
  title: string;
  originalTitle?: string;
  year?: number;
  overview?: string;
  posterUrl?: string;
  backdropUrl?: string;
  genres: string[];
  rating?: number;
  voteCount?: number;
}

export interface Movie extends BaseMedia {
  type: 'movie';
  runtimeMinutes?: number;
  cast: CastMember[];
  crew?: CrewInfo;
}

export interface Episode {
  id: string;
  seriesId: string;
  seasonNumber: number;
  episodeNumber: number;
  title: string;
  overview?: string;
  airDate?: string;
  runtimeMinutes?: number;
  thumbnailUrl?: string;
  rating?: number;
}

export interface Season {
  seasonNumber: number;
  title?: string;
  posterUrl?: string;
  episodeCount: number;
  episodes: Episode[];
}

export interface Series extends BaseMedia {
  type: 'series';
  status: 'ongoing' | 'ended';
  seasonCount: number;
  episodeCount: number;
  cast: CastMember[];
  seasons: Season[];
}

export type Media = Movie | Series;

export interface LibraryItem {
  mediaId: string;
  type: MediaType;
  addedAt: string;
}

export interface WatchHistoryItem {
  mediaId: string;
  type: MediaType;
  episodeId?: string;
  title: string;
  posterUrl?: string;
  episodeLabel?: string;
  progressSeconds: number;
  durationSeconds: number;
  updatedAt: string;
}

export type AddonCapability = 'catalog' | 'meta' | 'stream' | 'subtitles';

export interface AddonCatalogEntry {
  type: MediaType;
  id: string;
  name: string;
  extraSupported: string[];
  genreOptions?: string[];
}

// Parsed shape of an addon's manifest.json (docs/02-Phase2-API-Integration.md §2.1).
export interface AddonManifest {
  id: string;
  name: string;
  version: string;
  description?: string;
  logo?: string;
  resources: AddonCapability[];
  types: MediaType[];
  catalogs: AddonCatalogEntry[];
  idPrefixes?: string[];
}

export interface InstalledAddon {
  manifestUrl: string;
  manifest: AddonManifest;
  enabled: boolean;
}

// First-class shape for the `subtitles` capability (docs/02 §5) — defined now,
// consumed starting in Phase 3.
export interface SubtitleTrack {
  id: string;
  lang: string;
  url: string;
  source: string;
}

export type SortOption = 'popularity' | 'newest' | 'rating' | 'az';

// Route by manifest, never by addon identity — docs/02-Phase2-API-Integration.md §2.3.
export function supportsCapability(
  addon: InstalledAddon,
  capability: AddonCapability,
): boolean {
  return addon.enabled && addon.manifest.resources.includes(capability);
}
