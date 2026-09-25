import { useQuery } from '@tanstack/react-query';
import { getHomeRows } from '../../../lib/mock-data/mockApi';
import { queryKeys } from '../../../lib/query-client';

// Phase 1: backed by mock data. Phase 2 swaps getHomeRows() for addon-backed
// catalog calls (02-Phase2-API-Integration.md §6) — this hook's signature and
// the HomeScreen that consumes it do not change.
export function useHomeRows() {
  return useQuery({
    queryKey: queryKeys.home,
    queryFn: getHomeRows,
  });
}
