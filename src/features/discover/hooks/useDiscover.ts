import { useInfiniteQuery, keepPreviousData } from '@tanstack/react-query';
import { useAddons } from '../../../context/AddonsContext';
import { fetchMergedCatalog } from '../../../lib/addons/queries';
import { staleTimeFor } from '../../../lib/query-client';
import type { MediaType } from '../../../lib/types';

const PAGE_SIZE = 12;

// Real addon-backed catalog paging. Genre filtering/sorting stay client-side
// (applied by the screen on top of these merged, real results) since the
// Stremio catalog protocol's `genre` extra takes a single value while this
// app's Discover UI is multi-select — see DiscoverScreen.
export function useDiscover(type: MediaType) {
  const { supports } = useAddons();
  const catalogAddons = supports('catalog');
  const addonIds = catalogAddons
    .map(a => a.manifest.id)
    .sort()
    .join(',');

  return useInfiniteQuery({
    queryKey: ['discover', addonIds, type],
    queryFn: ({ pageParam }) => fetchMergedCatalog(catalogAddons, type, { skip: pageParam }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) =>
      lastPage.items.length >= PAGE_SIZE ? allPages.length * PAGE_SIZE : undefined,
    enabled: catalogAddons.length > 0,
    staleTime: staleTimeFor.catalog,
    placeholderData: keepPreviousData,
  });
}
