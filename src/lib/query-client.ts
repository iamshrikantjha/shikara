import { QueryClient } from '@tanstack/react-query';

// Phase 1: staleTime/retry are set now so screen behavior doesn't change when
// Phase 2 swaps the mock fetchers for real addon calls (02-Phase2-API-Integration.md §7).
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 24 * 60 * 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export const queryKeys = {
  home: ['home'] as const,
  discover: (type: string, genres: string[] | undefined, sort: string | undefined, skip: number) =>
    ['discover', type, genres ?? [], sort ?? 'popularity', skip] as const,
  search: (query: string) => ['search', query] as const,
  movie: (id: string) => ['movie', id] as const,
  series: (id: string) => ['series', id] as const,
  season: (seriesId: string, season: number) => ['season', seriesId, season] as const,
};
