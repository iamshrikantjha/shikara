import type { CastMember, Episode, Media, MediaType, Movie, Season, Series, Stream, StreamQuality, SubtitleTrack } from '../types';

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

// Raw Stremio stream/subtitles response shapes (docs/03-Phase3-Torrent-Streaming.md §4.1.3/§4.2.3).
export interface RawSubtitleItem {
  id?: string;
  lang: string;
  url: string;
}

export interface RawStreamBehaviorHints {
  fileIdx?: number;
  filename?: string;
  videoSize?: number;
}

export interface RawStreamItem {
  name?: string; // Stremio convention: short line, often addon name + quality
  title?: string; // Stremio convention: long line, often filename + size/seeders
  description?: string;
  url?: string; // direct link
  infoHash?: string; // torrent infohash — present instead of `url` for torrent streams
  fileIdx?: number;
  sources?: string[];
  behaviorHints?: RawStreamBehaviorHints;
  subtitles?: RawSubtitleItem[];
}

export const DEFAULT_TRACKERS: readonly string[] = [
  'udp://tracker.opentrackr.org:1337/announce',
  'udp://open.stealth.si:80/announce',
  'udp://open.demonii.com:1337/announce',
  'udp://tracker.torrent.eu.org:451/announce',
  'udp://explodie.org:6969/announce',
  'udp://tracker.dler.org:6969/announce',
  'udp://tracker.qu.ax:6969/announce',
  'udp://tracker.nyaa.vc:6969/announce',
  'http://tracker.opentrackr.org:1337/announce',
];

export function buildMagnetUri(infoHash: string, title?: string, sources?: string[]): string {
  const trackers = new Set<string>();
  if (Array.isArray(sources)) {
    for (const src of sources) {
      if (typeof src === 'string' && src.startsWith('tracker:')) {
        trackers.add(src.slice('tracker:'.length).trim());
      } else if (typeof src === 'string' && (src.startsWith('udp://') || src.startsWith('http://') || src.startsWith('https://'))) {
        trackers.add(src.trim());
      }
    }
  }
  for (const fallback of DEFAULT_TRACKERS) {
    trackers.add(fallback);
  }

  const dn = title ? `&dn=${encodeURIComponent(title)}` : '';
  const trList = Array.from(trackers)
    .map(tr => `&tr=${encodeURIComponent(tr)}`)
    .join('');
  return `magnet:?xt=urn:btih:${infoHash.toLowerCase()}${dn}${trList}`;
}

function enrichMagnetUri(url: string, title?: string, sources?: string[]): string {
  if (!url.startsWith('magnet:?')) return url;
  const match = url.match(/urn:btih:([a-zA-Z0-9]+)/i);
  if (!match) return url;
  return buildMagnetUri(match[1], title, sources);
}

const QUALITY_PATTERNS: [RegExp, StreamQuality][] = [
  [/\b(2160p|4k|uhd)\b/i, '2160p'],
  [/\b1080p\b/i, '1080p'],
  [/\b720p\b/i, '720p'],
  [/\b480p\b/i, '480p'],
];

function parseQuality(text: string): StreamQuality | undefined {
  for (const [pattern, quality] of QUALITY_PATTERNS) {
    if (pattern.test(text)) return quality;
  }
  return /\bsd\b/i.test(text) ? 'sd' : undefined;
}

function parseCodec(text: string): string | undefined {
  if (/\b(x265|h\.?265|hevc)\b/i.test(text)) return 'H.265';
  if (/\b(x264|h\.?264|avc)\b/i.test(text)) return 'H.264';
  if (/\bav1\b/i.test(text)) return 'AV1';
  return undefined;
}

function parseResolution(text: string): string | undefined {
  return text.match(/\b\d{3,4}x\d{3,4}\b/)?.[0];
}

// Torrentio-family addons (Torrentio, Comet, MediaFusion) encode size/seeders/peers
// as emoji-prefixed tokens inside the free-text `title`/`name` — the Stremio stream
// protocol has no structured field for any of the three, so this is the only signal
// available generically, without special-casing any one addon's exact format.
function parseSizeBytes(text: string): number | undefined {
  const match = text.match(/([\d.]+)\s?(GB|MB)\b/i);
  if (!match) return undefined;
  const value = parseFloat(match[1]);
  return match[2].toUpperCase() === 'GB' ? value * 1024 * 1024 * 1024 : value * 1024 * 1024;
}

function parseSeeders(text: string): number | undefined {
  const match = text.match(/👤\s?(\d+)/) ?? text.match(/seeders?[:\s]+(\d+)/i);
  return match ? Number(match[1]) : undefined;
}

function parsePeers(text: string): number | undefined {
  const match = text.match(/🌐\s?(\d+)/) ?? text.match(/peers?[:\s]+(\d+)/i);
  return match ? Number(match[1]) : undefined;
}

function parseAudioTracks(text: string): string[] {
  return ['Atmos', '7.1', '5.1', '2.0'].filter(token => text.includes(token));
}

// Normalizes one raw addon stream entry into the app-wide `Stream` shape
// (docs/03 §4.1.3). `addonName` comes from the installed addon, not the raw
// item — the raw protocol has no per-stream addon identity field.
export function normalizeStream(raw: RawStreamItem, addonName: string): Stream {
  const text = `${raw.name ?? ''} ${raw.title ?? ''} ${raw.description ?? ''}`;
  const fileIdx = raw.fileIdx ?? raw.behaviorHints?.fileIdx;
  const identity = raw.infoHash ?? raw.url ?? raw.title ?? raw.name ?? 'unknown';

  let url = raw.url ?? '';
  if (raw.infoHash) {
    url = buildMagnetUri(raw.infoHash, raw.title ?? raw.name, raw.sources);
  } else if (url.startsWith('magnet:?')) {
    url = enrichMagnetUri(url, raw.title ?? raw.name, raw.sources);
  }

  const isTorrent = Boolean(raw.infoHash || url.startsWith('magnet:?'));

  return {
    id: [addonName, identity, fileIdx].filter(v => v !== undefined).join(':'),
    title: raw.title ?? raw.name ?? addonName,
    url,
    type: isTorrent ? 'torrent' : 'direct',
    quality: parseQuality(text),
    resolution: parseResolution(text),
    codec: parseCodec(text),
    audioTracks: parseAudioTracks(text),
    subtitles: (raw.subtitles ?? []).map(s => normalizeSubtitle(s, addonName)),
    size: parseSizeBytes(text) ?? raw.behaviorHints?.videoSize,
    source: addonName,
    behaviorHints: {
      seeders: parseSeeders(text),
      peers: parsePeers(text),
      fileIdx,
    },
  };
}

export function normalizeSubtitle(raw: RawSubtitleItem, addonName: string): SubtitleTrack {
  return {
    id: raw.id ?? `${addonName}:${raw.lang}:${raw.url}`,
    lang: raw.lang,
    url: raw.url,
    source: addonName,
  };
}
