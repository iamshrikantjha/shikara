import { useQuery } from '@tanstack/react-query';
import { useAddons } from '../../../context/AddonsContext';
import { fetchMergedSubtitles } from '../../../lib/addons/queries';
import { staleTimeFor } from '../../../lib/query-client';
import type { MediaType } from '../../../lib/types';

// Player's subtitle picker fans out to every subtitles-capable addon
// (docs/03-Phase3-Torrent-Streaming.md §3.2/§4.2) — merged with the selected
// Stream's own embedded subtitles[] by the caller via mergeSubtitleTracks.
export function useSubtitleAddons(type: MediaType, streamId: string) {
  const { supports } = useAddons();
  const subtitleAddons = supports('subtitles');
  const addonIds = subtitleAddons.map(a => a.manifest.id).sort().join(',');

  return useQuery({
    queryKey: ['subtitles', addonIds, type, streamId],
    queryFn: () => fetchMergedSubtitles(subtitleAddons, type, streamId),
    staleTime: staleTimeFor.subtitles,
    enabled: subtitleAddons.length > 0,
  });
}
