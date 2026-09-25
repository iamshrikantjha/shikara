import { ALL_GENRES, MOCK_MOVIES, MOCK_SERIES, findMovie, findSeries } from './fixtures';
import type { Episode, Media, Movie, Season, Series, SortOption, WatchHistoryItem } from '../types';

// Phase 1 developer toggle (Settings > Developer > "Simulate error state").
// Removed entirely once Phase 2 wires real addon calls with real failure modes.
let simulateError = false;
export function setSimulateError(value: boolean) {
  simulateError = value;
}
export function isSimulatingError() {
  return simulateError;
}

function delay(ms: number) {
  return new Promise<void>(resolve => setTimeout(resolve, ms));
}

function maybeThrow() {
  if (simulateError) {
    throw new Error('Simulated network failure');
  }
}

// Mock "continue watching" seed — mirrors the WatchHistoryItem shape Phase 3 will
// populate for real from actual playback position.
export const MOCK_CONTINUE_WATCHING: WatchHistoryItem[] = [
  {
    mediaId: MOCK_SERIES[0].id,
    type: 'series',
    episodeId: MOCK_SERIES[0].seasons[0].episodes[3]?.id,
    title: MOCK_SERIES[0].title,
    episodeLabel: 'S01E04',
    progressSeconds: 1200,
    durationSeconds: 2700,
    updatedAt: new Date(2026, 8, 20).toISOString(),
  },
  {
    mediaId: MOCK_MOVIES[2].id,
    type: 'movie',
    title: MOCK_MOVIES[2].title,
    progressSeconds: 3400,
    durationSeconds: 6300,
    updatedAt: new Date(2026, 8, 18).toISOString(),
  },
];

export interface HomeRows {
  continueWatching: WatchHistoryItem[];
  popularMovies: Movie[];
  popularSeries: Series[];
  trending: Media[];
}

export async function getHomeRows(): Promise<HomeRows> {
  await delay(500);
  maybeThrow();
  return {
    continueWatching: MOCK_CONTINUE_WATCHING,
    popularMovies: MOCK_MOVIES.slice(0, 10),
    popularSeries: MOCK_SERIES.slice(0, 8),
    trending: [...MOCK_MOVIES.slice(10, 14), ...MOCK_SERIES.slice(8, 10)],
  };
}

export function getGenres(): string[] {
  return ALL_GENRES;
}

export interface DiscoverParams {
  type: 'movie' | 'series';
  genres?: string[];
  sort?: SortOption;
  skip?: number;
}

export interface DiscoverResult {
  items: Media[];
  hasMore: boolean;
}

const DISCOVER_PAGE_SIZE = 12;

function sortItems(items: Media[], sort: SortOption | undefined): Media[] {
  const copy = [...items];
  switch (sort) {
    case 'newest':
      return copy.sort((a, b) => (b.year ?? 0) - (a.year ?? 0));
    case 'rating':
      return copy.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    case 'az':
      return copy.sort((a, b) => a.title.localeCompare(b.title));
    case 'popularity':
    default:
      return copy.sort((a, b) => (b.voteCount ?? 0) - (a.voteCount ?? 0));
  }
}

export async function getDiscover(params: DiscoverParams): Promise<DiscoverResult> {
  await delay(300);
  maybeThrow();
  const pool: Media[] = params.type === 'movie' ? MOCK_MOVIES : MOCK_SERIES;
  const filtered =
    params.genres && params.genres.length > 0
      ? pool.filter(item => item.genres.some(g => params.genres!.includes(g)))
      : pool;
  const sorted = sortItems(filtered, params.sort);
  const skip = params.skip ?? 0;
  const page = sorted.slice(skip, skip + DISCOVER_PAGE_SIZE);
  return { items: page, hasMore: skip + DISCOVER_PAGE_SIZE < sorted.length };
}

export async function search(query: string): Promise<Media[]> {
  await delay(300);
  maybeThrow();
  const q = query.trim().toLowerCase();
  if (!q) {
    return [];
  }
  const all: Media[] = [...MOCK_MOVIES, ...MOCK_SERIES];
  return all.filter(item => item.title.toLowerCase().includes(q));
}

export async function getMovie(id: string): Promise<Movie | null> {
  await delay(400);
  maybeThrow();
  return findMovie(id) ?? null;
}

export async function getSeries(id: string): Promise<Series | null> {
  await delay(400);
  maybeThrow();
  return findSeries(id) ?? null;
}

export async function getSeason(seriesId: string, seasonNumber: number): Promise<Season | null> {
  await delay(300);
  maybeThrow();
  const s = findSeries(seriesId);
  return s?.seasons.find(season => season.seasonNumber === seasonNumber) ?? null;
}

export async function getEpisode(
  seriesId: string,
  seasonNumber: number,
  episodeNumber: number,
): Promise<Episode | null> {
  await delay(200);
  const season = await getSeason(seriesId, seasonNumber);
  return season?.episodes.find(ep => ep.episodeNumber === episodeNumber) ?? null;
}
