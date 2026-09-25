import { useQuery } from '@tanstack/react-query';
import { getMovie } from '../../../lib/mock-data/mockApi';
import { queryKeys } from '../../../lib/query-client';

export function useMovie(id: string) {
  return useQuery({
    queryKey: queryKeys.movie(id),
    queryFn: () => getMovie(id),
    staleTime: 24 * 60 * 60_000,
  });
}
