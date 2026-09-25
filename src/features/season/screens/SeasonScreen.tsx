import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSeason } from '../hooks/useSeason';
import { SeasonSelector } from '../../../components/SeasonSelector';
import { EpisodeRow } from '../../../components/EpisodeRow';
import { LoadingSkeleton } from '../../../components/LoadingSkeleton';
import { ErrorState } from '../../../components/ErrorState';
import { EmptyState } from '../../../components/EmptyState';
import type { RootStackParamList } from '../../../navigation/routes';
import { spacing } from '../../../styles/tokens';

type Props = NativeStackScreenProps<RootStackParamList, 'Season'>;

export function SeasonScreen({ route, navigation }: Props) {
  const { id, season: seasonNumber } = route.params;
  const { series, season, isLoading, isError, refetch } = useSeason(id, seasonNumber);

  if (isLoading) {
    return <LoadingSkeleton count={5} height={80} />;
  }

  if (isError || !series) {
    return <ErrorState onRetry={() => refetch()} />;
  }

  return (
    <ScrollView>
      <View style={styles.header}>
        <Text style={styles.title}>{series.title}</Text>
        <Text style={styles.subtitle}>{`Season ${seasonNumber}`}</Text>
      </View>

      <SeasonSelector
        seasonNumbers={series.seasons.map(s => s.seasonNumber)}
        selected={seasonNumber}
        onSelect={next => navigation.setParams({ season: next })}
      />

      <View style={styles.episodeList}>
        {!season || season.episodes.length === 0 ? (
          <EmptyState message="No episodes available" />
        ) : (
          season.episodes.map(episode => (
            <EpisodeRow
              key={episode.id}
              episode={episode}
              onPress={() =>
                navigation.navigate('EpisodeDetails', {
                  id: series.id,
                  season: episode.seasonNumber,
                  episode: episode.episodeNumber,
                })
              }
            />
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: {
    padding: spacing.md,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 14,
  },
  episodeList: {
    marginTop: spacing.sm,
  },
});
