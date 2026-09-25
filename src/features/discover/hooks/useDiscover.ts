import { useInfiniteQuery } from '@tanstack/react-query';
import { getDiscover } from '../../../lib/mock-data/mockApi';
import type { SortOption } from '../../../lib/types';

interface UseDiscoverParams {
  type: 'movie' | 'series';
  genres: string[];
  sort: SortOption;
}

const PAGE_SIZE = 12;

// Phase 1: mock-backed, paged via useInfiniteQuery so "Load More" already
// exercises the same aggressive-caching shape Phase 2 requires
// (02-Phase2-API-Integration.md §7 — keepPreviousData/paging conventions).
export function useDiscover({ type, genres, sort }: UseDiscoverParams) {
  return useInfiniteQuery({
    queryKey: ['discover', type, genres, sort],
    queryFn: ({ pageParam }) => getDiscover({ type, genres, sort, skip: pageParam }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) =>
      lastPage.hasMore ? allPages.length * PAGE_SIZE : undefined,
  });
}
