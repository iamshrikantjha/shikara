import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { search } from '../../../lib/mock-data/mockApi';
import { queryKeys } from '../../../lib/query-client';

const DEBOUNCE_MS = 300;

// Phase 1: mock-backed, but the debounce/cache-first behavior matches
// PRD.md §5.1 exactly so Phase 2 only swaps search() for a real addon call.
export function useSearch(rawQuery: string) {
  const [debounced, setDebounced] = useState(rawQuery);

  useEffect(() => {
    const handle = setTimeout(() => setDebounced(rawQuery), DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [rawQuery]);

  const query = useQuery({
    queryKey: queryKeys.search(debounced),
    queryFn: () => search(debounced),
    enabled: debounced.trim().length > 0,
  });

  return { ...query, debounced };
}
