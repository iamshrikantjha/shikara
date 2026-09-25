import { useQuery } from '@tanstack/react-query';
import { useAddons } from '../../../context/AddonsContext';
import { fetchMergedMeta } from '../../../lib/addons/queries';
import { metaQueryKey, staleTimeFor } from '../../../lib/query-client';
import type { Series } from '../../../lib/types';

export function useSeries(id: string, options?: { enabled?: boolean }) {
  const { addons, supports } = useAddons();
  const metaAddons = supports('meta');

  return useQuery({
    queryKey: metaQueryKey('series', id),
    queryFn: () => fetchMergedMeta(addons, 'series', id) as Promise<Series | null>,
    staleTime: staleTimeFor.meta,
    enabled: metaAddons.length > 0 && (options?.enabled ?? true),
  });
}
