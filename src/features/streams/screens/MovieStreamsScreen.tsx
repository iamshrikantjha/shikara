import React from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { StreamsListView } from '../components/StreamsListView';
import { useMovie } from '../../movie-details/hooks/useMovie';
import type { RootStackParamList } from '../../../navigation/routes';

type Props = NativeStackScreenProps<RootStackParamList, 'MovieStreams'>;

export function MovieStreamsScreen({ route, navigation }: Props) {
  const { id } = route.params;
  const { data: movie } = useMovie(id);

  return (
    <StreamsListView
      type="movie"
      streamId={id}
      title={movie?.title ?? 'Streams'}
      onSelectStream={stream => navigation.navigate('Player', { mediaId: id, type: 'movie', streamId: stream.id })}
      onOpenAddonManager={() => navigation.navigate('SettingsAddons')}
    />
  );
}
