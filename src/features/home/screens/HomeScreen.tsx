import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { useHomeRows } from '../hooks/useHomeRows';
import { MediaRow } from '../../../components/MediaRow';
import { LoadingSkeleton } from '../../../components/LoadingSkeleton';
import { ErrorState } from '../../../components/ErrorState';
import { EmptyState } from '../../../components/EmptyState';
import { useAddons } from '../../../context/AddonsContext';
import { usePrefetchMeta } from '../../../lib/addons/usePrefetchMeta';
import type { Media } from '../../../lib/types';
import type { MainTabParamList, RootStackParamList } from '../../../navigation/routes';
import { spacing } from '../../../styles/tokens';
import { useLibrary } from '../../../context/LibraryContext';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'HomeTab'>,
  NativeStackScreenProps<RootStackParamList>
>;

export function HomeScreen({ navigation }: Props) {
  const { data, isLoading, isError, refetch } = useHomeRows();
  const { history, addToLibrary, removeFromLibrary, isInLibrary } = useLibrary();
  const { supports } = useAddons();
  const prefetchMeta = usePrefetchMeta();

  function openMedia(media: Media) {
    if (media.type === 'movie') {
      navigation.navigate('MovieDetails', { id: media.id });
    } else {
      navigation.navigate('SeriesDetails', { id: media.id });
    }
  }

  function toggleLibrary(media: Media) {
    if (isInLibrary(media.id)) {
      removeFromLibrary(media.id);
    } else {
      addToLibrary(media.id, media.type);
    }
  }

  if (supports('catalog').length === 0) {
    return (
      <EmptyState
        message="No catalog addons installed"
        actionLabel="Open Addon Manager"
        onAction={() => navigation.navigate('SettingsAddons')}
      />
    );
  }

  if (isLoading) {
    return <LoadingSkeleton count={5} height={160} />;
  }

  if (isError || !data) {
    return <ErrorState onRetry={() => refetch()} />;
  }

  return (
    <ScrollView>
      <View style={styles.banner}>
        <Text style={styles.bannerTitle}>{data.trending[0]?.title ?? data.popularMovies[0]?.title ?? 'Featured'}</Text>
      </View>

      {data.failedAddonNames.length > 0 && (
        <Text style={styles.partialFailure}>
          Some sources are unavailable: {data.failedAddonNames.join(', ')}
        </Text>
      )}

      {history.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Continue Watching</Text>
          {history.map(item => (
            <Text key={item.mediaId}>
              {item.title} {item.episodeLabel ?? ''} —{' '}
              {Math.round((item.progressSeconds / item.durationSeconds) * 100)}%
            </Text>
          ))}
        </View>
      )}

      <MediaRow
        title="Popular Movies"
        items={data.popularMovies}
        onPressItem={openMedia}
        onLongPressItem={toggleLibrary}
        onFocusItem={prefetchMeta}
      />
      <MediaRow
        title="Popular Series"
        items={data.popularSeries}
        onPressItem={openMedia}
        onLongPressItem={toggleLibrary}
        onFocusItem={prefetchMeta}
      />
      <MediaRow
        title="Trending"
        items={data.trending}
        onPressItem={openMedia}
        onLongPressItem={toggleLibrary}
        onFocusItem={prefetchMeta}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  banner: {
    padding: spacing.lg,
  },
  bannerTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  section: {
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  partialFailure: {
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
    fontSize: 12,
  },
});
