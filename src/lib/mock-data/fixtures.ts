import type { Episode, Movie, Season, Series } from '../types';

export const ALL_GENRES = [
  'Action',
  'Comedy',
  'Drama',
  'Sci-Fi',
  'Horror',
  'Animation',
  'Documentary',
  'Thriller',
  'Romance',
  'Family',
];

const CAST_POOL = [
  'Alex Rivera',
  'Jordan Lee',
  'Sam Chen',
  'Priya Kapoor',
  'Morgan Blake',
  'Taylor Reed',
];

function pick<T>(arr: T[], index: number): T {
  return arr[index % arr.length];
}

function genresFor(index: number): string[] {
  return [pick(ALL_GENRES, index), pick(ALL_GENRES, index + 3)];
}

function castFor(index: number) {
  return CAST_POOL.slice(0, 3).map((name, i) => ({
    name,
    character: `Character ${index}-${i + 1}`,
  }));
}

export const MOCK_MOVIES: Movie[] = Array.from({ length: 20 }, (_, i) => {
  const index = i + 1;
  return {
    id: `tt10${String(index).padStart(5, '0')}`,
    type: 'movie',
    title: `Mock Movie ${index}`,
    year: 2000 + (index % 25),
    overview:
      'A team of explorers travel across a fictional galaxy in search of a new home for a mock civilization.',
    posterUrl: undefined,
    backdropUrl: undefined,
    genres: genresFor(index),
    rating: 5 + (index % 5),
    voteCount: 1000 * index,
    runtimeMinutes: 90 + (index % 60),
    cast: castFor(index),
    crew: { director: `Director ${index}`, studio: `Studio ${index % 4}` },
  } satisfies Movie;
});

function buildEpisodes(seriesId: string, seasonNumber: number, count: number): Episode[] {
  return Array.from({ length: count }, (_, i) => {
    const episodeNumber = i + 1;
    return {
      id: `${seriesId}:${seasonNumber}:${episodeNumber}`,
      seriesId,
      seasonNumber,
      episodeNumber,
      title: `Episode ${episodeNumber}`,
      overview:
        'The team faces a new challenge as the mock storyline continues to unfold in unexpected ways.',
      airDate: `${2015 + seasonNumber}-0${(episodeNumber % 9) + 1}-1${episodeNumber % 9}`,
      runtimeMinutes: 40 + (episodeNumber % 10),
      rating: 6 + (episodeNumber % 4),
    } satisfies Episode;
  });
}

function buildSeasons(seriesId: string, seasonCount: number, firstSeasonEpisodeCount: number): Season[] {
  return Array.from({ length: seasonCount }, (_, i) => {
    const seasonNumber = i + 1;
    const episodeCount = seasonNumber === 1 ? firstSeasonEpisodeCount : 8 + (seasonNumber % 5);
    return {
      seasonNumber,
      title: `Season ${seasonNumber}`,
      episodeCount,
      episodes: buildEpisodes(seriesId, seasonNumber, episodeCount),
    } satisfies Season;
  });
}

export const MOCK_SERIES: Series[] = Array.from({ length: 10 }, (_, i) => {
  const index = i + 1;
  const id = `tt20${String(index).padStart(5, '0')}`;
  // First two series get multiple seasons; the very first also gets a 22-episode
  // season 1 specifically to exercise list virtualization (per the Phase 1 doc).
  const seasonCount = index === 1 ? 5 : index === 2 ? 3 : 1;
  const firstSeasonEpisodeCount = index === 1 ? 22 : 8;
  const seasons = buildSeasons(id, seasonCount, firstSeasonEpisodeCount);
  const episodeCount = seasons.reduce((sum, s) => sum + s.episodeCount, 0);

  return {
    id,
    type: 'series',
    title: `Mock Series ${index}`,
    year: 2008 + (index % 10),
    overview:
      'A gripping mock drama following an ensemble cast as they navigate a fictional world full of twists.',
    genres: genresFor(index + 10),
    rating: 6 + (index % 4),
    voteCount: 2000 * index,
    status: index % 3 === 0 ? 'ended' : 'ongoing',
    seasonCount,
    episodeCount,
    cast: castFor(index + 10),
    seasons,
  } satisfies Series;
});

export function findMovie(id: string): Movie | undefined {
  return MOCK_MOVIES.find(m => m.id === id);
}

export function findSeries(id: string): Series | undefined {
  return MOCK_SERIES.find(s => s.id === id);
}

export function relatedFor(id: string, genres: string[]): (Movie | Series)[] {
  const pool = [...MOCK_MOVIES, ...MOCK_SERIES];
  return pool
    .filter(item => item.id !== id && item.genres.some(g => genres.includes(g)))
    .slice(0, 8);
}
