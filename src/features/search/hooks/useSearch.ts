import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAddons } from '../../../context/AddonsContext';
import { fetchMergedCatalog } from '../../../lib/addons/queries';
import { catalogFor, catalogSupportsExtra } from '../../../lib/addons/capability';
import { staleTimeFor } from '../../../lib/query-client';
import type { InstalledAddon, Media, MediaType } from '../../../lib/types';

function searchCapableAddons(addons: InstalledAddon[], type: MediaType): InstalledAddon[] {
  return addons.filter(a => {
    const catalog = catalogFor(a, type);
    return catalog && catalogSupportsExtra(catalog, 'search');
  });
}

const DEBOUNCE_MS = 300;

// Debounce matches PRD.md §5.1 exactly. Searches every catalog-capable addon
// whose declared catalog supports the `search` extra
// (docs/02-Phase2-API-Integration.md §6) and merges the results.
export function useSearch(rawQuery: string) {
  const [debounced, setDebounced] = useState(rawQuery);
  const { supports } = useAddons();
  const catalogAddons = supports('catalog');

  useEffect(() => {
    const handle = setTimeout(() => setDebounced(rawQuery), DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [rawQuery]);

  const query = useQuery({
    queryKey: ['search', debounced, catalogAddons.map(a => a.manifest.id).sort().join(',')],
    queryFn: async () => {
      const [movies, series] = await Promise.all([
        fetchMergedCatalog(searchCapableAddons(catalogAddons, 'movie'), 'movie', { search: debounced }),
        fetchMergedCatalog(searchCapableAddons(catalogAddons, 'series'), 'series', { search: debounced }),
      ]);
      const items: Media[] = [...movies.items, ...series.items];
      const failedAddonNames = Array.from(
        new Set([...movies.failedAddons, ...series.failedAddons].map(a => a.manifest.name)),
      );
      return { items, failedAddonNames };
    },
    enabled: debounced.trim().length > 0 && catalogAddons.length > 0,
    staleTime: staleTimeFor.search,
  });

  return { ...query, debounced };
}
