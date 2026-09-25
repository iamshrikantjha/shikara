import React from 'react';
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMovie } from '../hooks/useMovie';
import { fetchRelated } from '../../../lib/addons/queries';
import { usePrefetchMeta } from '../../../lib/addons/usePrefetchMeta';
import { useAddons } from '../../../context/AddonsContext';
import { staleTimeFor } from '../../../lib/query-client';
import { MediaRow } from '../../../components/MediaRow';
import { RemoteImage } from '../../../components/RemoteImage';
import { Chip } from '../../../components/Chip';
import { Rating } from '../../../components/Rating';
import { Button } from '../../../components/Button';
import { LoadingSkeleton } from '../../../components/LoadingSkeleton';
import { ErrorState } from '../../../components/ErrorState';
import { useLibrary } from '../../../context/LibraryContext';
import type { Media } from '../../../lib/types';
import type { RootStackParamList } from '../../../navigation/routes';
import { spacing, themeTokens } from '../../../styles/tokens';
import { useTheme } from '../../../context/ThemeContext';

type Props = NativeStackScreenProps<RootStackParamList, 'MovieDetails'>;

export function MovieDetailsScreen({ route, navigation }: Props) {
  const { id } = route.params;
  const { data: movie, isLoading, isError, refetch } = useMovie(id);
  const { isInLibrary, addToLibrary, removeFromLibrary } = useLibrary();
  const { supports } = useAddons();
  const prefetchMeta = usePrefetchMeta();
  const { resolvedTheme } = useTheme();
  const t = themeTokens[resolvedTheme];

  const { data: related = [] } = useQuery({
    queryKey: ['related', 'movie', id],
    queryFn: () => fetchRelated(supports('catalog'), 'movie', id, movie?.genres ?? []),
    enabled: Boolean(movie),
    staleTime: staleTimeFor.catalog,
  });

  function openMedia(media: Media) {
    if (media.type === 'movie') {
      navigation.push('MovieDetails', { id: media.id });
    } else {
      navigation.push('SeriesDetails', { id: media.id });
    }
  }

  if (isLoading) {
    return <LoadingSkeleton count={3} height={200} />;
  }

  if (isError || !movie) {
    return <ErrorState message="This movie could not be found." onRetry={() => refetch()} />;
  }

  const inLibrary = isInLibrary(movie.id);

  return (
    <ScrollView>
      <RemoteImage uri={movie.backdropUrl} style={[styles.backdrop, { borderColor: t.border }]} priority="high" />
      <View style={styles.body}>
        <RemoteImage uri={movie.posterUrl} style={[styles.poster, { borderColor: t.border }]} priority="high" />

        <Text style={styles.title}>{movie.title}</Text>
        <View style={styles.metaRow}>
          {movie.year && <Text>{movie.year}</Text>}
          {movie.runtimeMinutes && <Text>{`  •  ${movie.runtimeMinutes} min`}</Text>}
          <Text>{'  '}</Text>
          <Rating value={movie.rating} />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.genreRow}>
          {movie.genres.map(g => (
            <Chip key={g} label={g} />
          ))}
        </ScrollView>

        <View style={styles.actionRow}>
          <Button
            label={inLibrary ? 'Remove from Library' : 'Add to Library'}
            onPress={() => (inLibrary ? removeFromLibrary(movie.id) : addToLibrary(movie.id, 'movie'))}
          />
          <Button
            label="Find Streams"
            variant="secondary"
            // Android-only in Phase 3 — no native torrent/player path exists
            // on iOS/Web yet (docs/03-Phase3-Torrent-Streaming.md §7).
            disabled={Platform.OS !== 'android'}
            onPress={() => navigation.navigate('MovieStreams', { id: movie.id })}
          />
        </View>

        <Text style={styles.overview}>{movie.overview}</Text>

        {movie.cast.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Cast</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {movie.cast.map(member => (
                <View key={member.name} style={styles.castMember}>
                  <View style={[styles.castAvatar, { backgroundColor: t.skeleton, borderColor: t.border }]} />
                  <Text numberOfLines={1}>{member.name}</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {movie.crew && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Production</Text>
            {movie.crew.director && <Text>Director: {movie.crew.director}</Text>}
            {movie.crew.studio && <Text>Studio: {movie.crew.studio}</Text>}
          </View>
        )}
      </View>

      <MediaRow title="More Like This" items={related} onPressItem={openMedia} onFocusItem={prefetchMeta} />
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
});
