import { useQuery } from '@tanstack/react-query';
import { useAddons } from '../../../context/AddonsContext';
import { fetchMergedMeta } from '../../../lib/addons/queries';
import { metaQueryKey, staleTimeFor } from '../../../lib/query-client';
import type { Movie } from '../../../lib/types';

export function useMovie(id: string, options?: { enabled?: boolean }) {
  const { addons, supports } = useAddons();
  const metaAddons = supports('meta');

  return useQuery({
    queryKey: metaQueryKey('movie', id),
    queryFn: () => fetchMergedMeta(addons, 'movie', id) as Promise<Movie | null>,
    staleTime: staleTimeFor.meta,
    enabled: metaAddons.length > 0 && (options?.enabled ?? true),
  });
}
