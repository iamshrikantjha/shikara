import type { CastMember, Episode, Media, MediaType, Movie, Season, Series } from '../types';

// Raw Stremio catalog/meta response shapes — only the fields this app reads.
// Screens never see these; every field crosses through normalize* first
// (docs/02-Phase2-API-Integration.md §5).
export interface RawVideo {
  id?: string;
  season?: number;
  episode?: number;
  title?: string;
  name?: string;
  overview?: string;
  released?: string;
  thumbnail?: string;
}

export interface RawMetaItem {
  id: string;
  type?: string;
  name?: string;
  genres?: string[];
  poster?: string;
  background?: string;
  description?: string;
  releaseInfo?: string;
  imdbRating?: string | number;
  runtime?: string;
  cast?: string[];
  director?: string[];
  writer?: string[];
  videos?: RawVideo[];
}

function parseYear(releaseInfo: string | undefined): number | undefined {
  const match = releaseInfo?.match(/\d{4}/);
  return match ? Number(match[0]) : undefined;
}

function parseRating(raw: string | number | undefined): number | undefined {
  if (raw === undefined) return undefined;
  const num = typeof raw === 'number' ? raw : parseFloat(raw);
  return Number.isFinite(num) ? num : undefined;
}

function parseRuntimeMinutes(runtime: string | undefined): number | undefined {
  const match = runtime?.match(/\d+/);
  return match ? Number(match[0]) : undefined;
}

function castMembers(names: string[] | undefined): CastMember[] {
  return (names ?? []).map(name => ({ name }));
}

function groupSeasons(seriesId: string, videos: RawVideo[] | undefined): Season[] {
  if (!videos || videos.length === 0) {
    return [];
  }
  const bySeason = new Map<number, Episode[]>();
  for (const v of videos) {
    if (v.season === undefined || v.episode === undefined) continue;
    const episode: Episode = {
      id: v.id ?? `${seriesId}:${v.season}:${v.episode}`,
      seriesId,
      seasonNumber: v.season,
      episodeNumber: v.episode,
      title: v.title ?? v.name ?? `Episode ${v.episode}`,
      overview: v.overview,
      airDate: v.released,
      thumbnailUrl: v.thumbnail,
    };
    const list = bySeason.get(v.season) ?? [];
    list.push(episode);
    bySeason.set(v.season, list);
  }
  return Array.from(bySeason.entries())
    .sort(([a], [b]) => a - b)
    .map(([seasonNumber, episodes]) => ({
      seasonNumber,
      title: `Season ${seasonNumber}`,
      episodeCount: episodes.length,
      episodes: episodes.sort((a, b) => a.episodeNumber - b.episodeNumber),
    }));
}

// Lightweight normalization for /catalog results — these previews don't carry
// runtime/cast/seasons, only enough for a MediaCard.
export function normalizeCatalogItem(raw: RawMetaItem, type: MediaType): Media {
  const base = {
    id: raw.id,
    title: raw.name ?? raw.id,
    year: parseYear(raw.releaseInfo),
    posterUrl: raw.poster,
    genres: raw.genres ?? [],
    rating: parseRating(raw.imdbRating),
  };
  if (type === 'movie') {
    return { ...base, type: 'movie', cast: [] } satisfies Movie;
  }
  return { ...base, type: 'series', status: 'ongoing', seasonCount: 0, episodeCount: 0, cast: [], seasons: [] } satisfies Series;
}

// Full normalization for /meta responses.
export function normalizeMeta(raw: RawMetaItem, type: MediaType): Media {
  const base = {
    id: raw.id,
    title: raw.name ?? raw.id,
    year: parseYear(raw.releaseInfo),
    overview: raw.description,
    posterUrl: raw.poster,
    backdropUrl: raw.background,
    genres: raw.genres ?? [],
    rating: parseRating(raw.imdbRating),
  };

  if (type === 'movie') {
    return {
      ...base,
      type: 'movie',
      runtimeMinutes: parseRuntimeMinutes(raw.runtime),
      cast: castMembers(raw.cast),
      crew: raw.director?.[0] ? { director: raw.director[0] } : undefined,
    } satisfies Movie;
  }

  const seasons = groupSeasons(raw.id, raw.videos);
  const now = Date.now();
  const hasFutureEpisode = seasons.some(s => s.episodes.some(e => e.airDate && new Date(e.airDate).getTime() > now));

  return {
    ...base,
    type: 'series',
    status: hasFutureEpisode ? 'ongoing' : 'ended',
    seasonCount: seasons.length,
    episodeCount: seasons.reduce((sum, s) => sum + s.episodeCount, 0),
    cast: castMembers(raw.cast),
    seasons,
  } satisfies Series;
}
