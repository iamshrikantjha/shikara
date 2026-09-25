import { useQuery } from '@tanstack/react-query';
import { getSeries } from '../../../lib/mock-data/mockApi';
import { queryKeys } from '../../../lib/query-client';

export function useSeries(id: string) {
  return useQuery({
    queryKey: queryKeys.series(id),
    queryFn: () => getSeries(id),
    staleTime: 24 * 60 * 60_000,
  });
}
