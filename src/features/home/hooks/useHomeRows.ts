import { useQuery } from '@tanstack/react-query';
import { useAddons } from '../../../context/AddonsContext';
import { fetchMergedCatalog } from '../../../lib/addons/queries';
import { staleTimeFor } from '../../../lib/query-client';
import type { Media } from '../../../lib/types';

export interface HomeRows {
  popularMovies: Media[];
  popularSeries: Media[];
  trending: Media[];
  failedAddonNames: string[];
}

// Real addon-backed Home rows — same shape/consumers as Phase 1's mock hook,
// only the fetch implementation changed (docs/02-Phase2-API-Integration.md §6).
export function useHomeRows() {
  const { supports } = useAddons();
  const catalogAddons = supports('catalog');
  const addonIds = catalogAddons.map(a => a.manifest.id).sort().join(',');

  return useQuery({
    queryKey: ['home', addonIds],
    queryFn: async (): Promise<HomeRows> => {
      const [movies, series] = await Promise.all([
        fetchMergedCatalog(catalogAddons, 'movie'),
        fetchMergedCatalog(catalogAddons, 'series'),
      ]);
      const failedAddonNames = Array.from(
        new Set([...movies.failedAddons, ...series.failedAddons].map(a => a.manifest.name)),
      );
      return {
        popularMovies: movies.items.slice(0, 10),
        popularSeries: series.items.slice(0, 8),
        trending: [...movies.items.slice(10, 14), ...series.items.slice(0, 4)],
        failedAddonNames,
      };
    },
    enabled: catalogAddons.length > 0,
    staleTime: staleTimeFor.catalog,
  });
}

// Exposed for screens that just need to know whether any addon can even serve
// a Home board (e.g. to route to the Addon Manager if the user removed everything).
export function useHasCatalogAddons() {
  const { supports } = useAddons();
  return supports('catalog').length > 0;
}
