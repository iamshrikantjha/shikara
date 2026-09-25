import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSeries } from '../hooks/useSeries';
import { RemoteImage } from '../../../components/RemoteImage';
import { Chip } from '../../../components/Chip';
import { Rating } from '../../../components/Rating';
import { Button } from '../../../components/Button';
import { SeasonSelector } from '../../../components/SeasonSelector';
import { EpisodeRow } from '../../../components/EpisodeRow';
import { LoadingSkeleton } from '../../../components/LoadingSkeleton';
import { ErrorState } from '../../../components/ErrorState';
import { useLibrary } from '../../../context/LibraryContext';
import type { RootStackParamList } from '../../../navigation/routes';
import { spacing, themeTokens } from '../../../styles/tokens';
import { useTheme } from '../../../context/ThemeContext';

type Props = NativeStackScreenProps<RootStackParamList, 'SeriesDetails'>;

export function SeriesDetailsScreen({ route, navigation }: Props) {
  const { id, season: initialSeason } = route.params;
  const { data: series, isLoading, isError, refetch } = useSeries(id);
  const { isInLibrary, addToLibrary, removeFromLibrary } = useLibrary();
  const { resolvedTheme } = useTheme();
  const t = themeTokens[resolvedTheme];

  const [selectedSeason, setSelectedSeason] = useState(initialSeason ?? 1);

  const currentSeason = useMemo(
    () => series?.seasons.find(s => s.seasonNumber === selectedSeason),
    [series, selectedSeason],
  );

  if (isLoading) {
    return <LoadingSkeleton count={3} height={200} />;
  }

  if (isError || !series) {
    return <ErrorState message="This series could not be found." onRetry={() => refetch()} />;
  }

  const inLibrary = isInLibrary(series.id);

  return (
    <ScrollView>
      <RemoteImage uri={series.backdropUrl} style={[styles.backdrop, { borderColor: t.border }]} priority="high" />
      <View style={styles.body}>
        <RemoteImage uri={series.posterUrl} style={[styles.poster, { borderColor: t.border }]} priority="high" />

        <Text style={styles.title}>{series.title}</Text>
        <View style={styles.metaRow}>
          <Text>{series.status === 'ongoing' ? 'Ongoing' : 'Ended'}</Text>
          <Text>{'  '}</Text>
          <Rating value={series.rating} />
          <Text>{`  •  ${series.seasonCount} Seasons  •  ${series.episodeCount} Episodes`}</Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.genreRow}>
          {series.genres.map(g => (
            <Chip key={g} label={g} />
          ))}
        </ScrollView>

        <View style={styles.actionRow}>
          <Button
            label={inLibrary ? 'Remove from Library' : 'Add to Library'}
            onPress={() => (inLibrary ? removeFromLibrary(series.id) : addToLibrary(series.id, 'series'))}
          />
          <Button label="Find Streams" disabled variant="secondary" />
        </View>

        <Text style={styles.overview}>{series.overview}</Text>

        {series.cast.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Cast</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {series.cast.map(member => (
                <View key={member.name} style={styles.castMember}>
                  <View style={[styles.castAvatar, { backgroundColor: t.skeleton, borderColor: t.border }]} />
                  <Text numberOfLines={1}>{member.name}</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        )}
      </View>

      <SeasonSelector
        seasonNumbers={series.seasons.map(s => s.seasonNumber)}
        selected={selectedSeason}
        onSelect={setSelectedSeason}
      />

      <View style={styles.episodeList}>
        {currentSeason?.episodes.length ? (
          currentSeason.episodes.map(episode => (
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
        ) : (
          <Text style={styles.emptyEpisodes}>No episodes available</Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    height: 200,
    borderBottomWidth: 1,
  },
  body: {
    padding: spacing.md,
  },
  poster: {
    width: 120,
    aspectRatio: 2 / 3,
    borderWidth: 1,
    borderRadius: 4,
    marginTop: -60,
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  genreRow: {
    marginBottom: spacing.sm,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  overview: {
    marginBottom: spacing.md,
  },
  section: {
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  castMember: {
    width: 80,
    marginRight: spacing.sm,
  },
  castAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1,
    marginBottom: spacing.xs,
  },
  episodeList: {
    marginTop: spacing.md,
  },
  emptyEpisodes: {
    padding: spacing.md,
    textAlign: 'center',
  },
});
