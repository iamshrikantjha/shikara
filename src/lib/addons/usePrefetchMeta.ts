import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAddons } from '../../context/AddonsContext';
import { fetchMergedMeta } from './queries';
import { metaQueryKey, staleTimeFor } from '../query-client';
import type { Media } from '../types';

// A title's `meta` query is warmed as soon as its MediaCard receives focus, so
// opening Details is instant more often than not (docs/02-Phase2-API-Integration.md §7.3).
export function usePrefetchMeta() {
  const queryClient = useQueryClient();
  const { addons } = useAddons();

  return useCallback(
    (media: Media) => {
      queryClient.prefetchQuery({
        queryKey: metaQueryKey(media.type, media.id),
        queryFn: () => fetchMergedMeta(addons, media.type, media.id),
        staleTime: staleTimeFor.meta,
      });
    },
    [addons, queryClient],
  );
}
