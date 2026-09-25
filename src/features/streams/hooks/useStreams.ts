import { useQuery } from '@tanstack/react-query';
import { useAddons } from '../../../context/AddonsContext';
import { fetchMergedStreams } from '../../../lib/addons/queries';
import { staleTimeFor } from '../../../lib/query-client';
import type { MediaType } from '../../../lib/types';

// Streams screen fans out to every stream-capable addon and concatenates
// results (docs/03-Phase3-Torrent-Streaming.md §3.1/§4.1.3) — mirrors
// useDiscover/useHomeRows's merged-query pattern, keyed on the sorted set of
// enabled stream addon ids so the cache invalidates when addons change.
export function useStreams(type: MediaType, streamId: string) {
  const { supports } = useAddons();
  const streamAddons = supports('stream');
  const addonIds = streamAddons.map(a => a.manifest.id).sort().join(',');

  const query = useQuery({
    queryKey: ['streams', addonIds, type, streamId],
    queryFn: () => fetchMergedStreams(streamAddons, type, streamId),
    staleTime: staleTimeFor.stream,
    enabled: streamAddons.length > 0,
  });

  return { ...query, addonCount: streamAddons.length };
}
