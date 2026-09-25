import React from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { StreamsListView } from '../components/StreamsListView';
import { useSeries } from '../../series-details/hooks/useSeries';
import type { RootStackParamList } from '../../../navigation/routes';

type Props = NativeStackScreenProps<RootStackParamList, 'EpisodeStreams'>;

// Composite `{imdbId}:{season}:{episode}` id — matches the addon stream
// protocol's episode id convention (docs/03 §4.1.2) and Episode.id's existing
// shape (src/lib/addons/normalize.ts's groupSeasons), so it doubles as the
// Player's mediaId/WatchHistory key without a second id scheme.
export function EpisodeStreamsScreen({ route, navigation }: Props) {
  const { id, season, episode } = route.params;
  const streamId = `${id}:${season}:${episode}`;
  const { data: series } = useSeries(id);
  const episodeLabel = `S${String(season).padStart(2, '0')}E${String(episode).padStart(2, '0')}`;

  return (
    <StreamsListView
      type="series"
      streamId={streamId}
      title={series?.title ?? 'Streams'}
      episodeLabel={episodeLabel}
      onSelectStream={stream =>
        navigation.navigate('Player', { mediaId: streamId, type: 'series', streamId: stream.id })
      }
      onOpenAddonManager={() => navigation.navigate('SettingsAddons')}
    />
  );
}
