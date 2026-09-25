import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSeason } from '../../season/hooks/useSeason';
import { Rating } from '../../../components/Rating';
import { Button } from '../../../components/Button';
import { LoadingSkeleton } from '../../../components/LoadingSkeleton';
import { ErrorState } from '../../../components/ErrorState';
import type { RootStackParamList } from '../../../navigation/routes';
import { spacing, themeTokens } from '../../../styles/tokens';
import { useTheme } from '../../../context/ThemeContext';

type Props = NativeStackScreenProps<RootStackParamList, 'EpisodeDetails'>;

export function EpisodeDetailsScreen({ route, navigation }: Props) {
  const { id, season: seasonNumber, episode: episodeNumber } = route.params;
  const { season, isLoading, isError, refetch } = useSeason(id, seasonNumber);
  const { resolvedTheme } = useTheme();
  const t = themeTokens[resolvedTheme];
  const [watched, setWatched] = useState(false);

  const episode = season?.episodes.find(ep => ep.episodeNumber === episodeNumber);
  const label = `S${String(seasonNumber).padStart(2, '0')}E${String(episodeNumber).padStart(2, '0')}`;

  return (
    <ScrollView>
      <View style={styles.closeRow}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
          <Text style={styles.close}>✕</Text>
        </Pressable>
      </View>

      {isLoading && <LoadingSkeleton count={2} height={160} />}
      {(isError || (!isLoading && !episode)) && <ErrorState onRetry={() => refetch()} />}

      {episode && (
        <View style={styles.body}>
          <View style={[styles.thumbnail, { backgroundColor: t.skeleton, borderColor: t.border }]} />
          <Text style={styles.label}>{label}</Text>
          <Text style={styles.title}>{episode.title}</Text>
          <View style={styles.metaRow}>
            {episode.airDate && <Text>{episode.airDate}</Text>}
            {episode.runtimeMinutes && <Text>{`  •  ${episode.runtimeMinutes} min`}</Text>}
            <Text>{'  '}</Text>
            <Rating value={episode.rating} />
          </View>
          <Text style={styles.overview}>{episode.overview}</Text>
          <View style={styles.actionRow}>
            <Button label="Play" disabled variant="secondary" />
            <Button label={watched ? 'Watched ✓' : 'Mark as Watched'} onPress={() => setWatched(w => !w)} />
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  closeRow: {
    alignItems: 'flex-end',
    padding: spacing.sm,
  },
  close: {
    fontSize: 18,
    padding: spacing.sm,
  },
  body: {
    padding: spacing.md,
  },
  thumbnail: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderWidth: 1,
    borderRadius: 4,
    marginBottom: spacing.sm,
  },
  label: {
    fontSize: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  metaRow: {
    flexDirection: 'row',
    marginVertical: spacing.xs,
  },
  overview: {
    marginVertical: spacing.md,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
});
