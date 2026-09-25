import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useDiscover } from '../hooks/useDiscover';
import { useAddons } from '../../../context/AddonsContext';
import { genresFor } from '../../../lib/addons/queries';
import { usePrefetchMeta } from '../../../lib/addons/usePrefetchMeta';
import { filterByGenres, sortMedia } from '../../../lib/media-sort';
import { Tabs } from '../../../components/Tabs';
import { Chip } from '../../../components/Chip';
import { MediaGrid } from '../../../components/MediaGrid';
import { LoadingSkeleton } from '../../../components/LoadingSkeleton';
import { ErrorState } from '../../../components/ErrorState';
import { EmptyState } from '../../../components/EmptyState';
import { Button } from '../../../components/Button';
import type { Media, SortOption } from '../../../lib/types';
import type { MainTabParamList, RootStackParamList } from '../../../navigation/routes';
import { spacing } from '../../../styles/tokens';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'DiscoverTab'>,
  NativeStackScreenProps<RootStackParamList>
>;

const SORT_OPTIONS: { label: string; value: SortOption }[] = [
  { label: 'Popularity', value: 'popularity' },
  { label: 'Newest', value: 'newest' },
  { label: 'Top Rated', value: 'rating' },
  { label: 'A–Z', value: 'az' },
];

export function DiscoverScreen({ route, navigation }: Props) {
  const [type, setType] = useState<'movie' | 'series'>(route.params?.type ?? 'movie');
  const [genres, setGenres] = useState<string[]>([]);
  const [sort, setSort] = useState<SortOption>('popularity');

  const { addons, supports } = useAddons();
  const prefetchMeta = usePrefetchMeta();
  const allGenres = useMemo(() => genresFor(addons, type), [addons, type]);
  const { data, isLoading, isError, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useDiscover(type);

  const rawItems: Media[] = useMemo(() => data?.pages.flatMap(page => page.items) ?? [], [data]);
  const items = useMemo(() => sortMedia(filterByGenres(rawItems, genres), sort), [rawItems, genres, sort]);
  const failedAddonNames = Array.from(
    new Set((data?.pages.at(-1)?.failedAddons ?? []).map(a => a.manifest.name)),
  );

  function toggleGenre(genre: string) {
    setGenres(prev => (prev.includes(genre) ? prev.filter(g => g !== genre) : [...prev, genre]));
  }

  function openMedia(media: Media) {
    if (media.type === 'movie') {
      navigation.navigate('MovieDetails', { id: media.id });
    } else {
      navigation.navigate('SeriesDetails', { id: media.id });
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

  return (
    <View style={styles.container}>
      <Tabs
        options={['Movies', 'Series']}
        selected={type === 'movie' ? 'Movies' : 'Series'}
        onSelect={value => setType(value === 'Movies' ? 'movie' : 'series')}
      />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
        <Chip label="All" selected={genres.length === 0} onPress={() => setGenres([])} />
        {allGenres.map(genre => (
          <Chip key={genre} label={genre} selected={genres.includes(genre)} onPress={() => toggleGenre(genre)} />
        ))}
      </ScrollView>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
        {SORT_OPTIONS.map(opt => (
          <Chip key={opt.value} label={opt.label} selected={sort === opt.value} onPress={() => setSort(opt.value)} />
        ))}
      </ScrollView>

      {failedAddonNames.length > 0 && (
        <Text style={styles.partialFailure}>Some sources are unavailable: {failedAddonNames.join(', ')}</Text>
      )}

      {isLoading && <LoadingSkeleton count={6} height={140} />}
      {isError && !isLoading && <ErrorState onRetry={() => refetch()} />}
      {!isLoading && !isError && items.length === 0 && (
        <EmptyState message="No titles match these filters" actionLabel="Clear Filters" onAction={() => setGenres([])} />
      )}
      {!isLoading && !isError && items.length > 0 && (
        <MediaGrid
          items={items}
          onPressItem={openMedia}
          onFocusItem={prefetchMeta}
          onEndReached={() => {
            if (hasNextPage && !isFetchingNextPage) {
              fetchNextPage();
            }
          }}
          ListFooterComponent={
            isFetchingNextPage ? (
              <LoadingSkeleton count={2} height={80} />
            ) : hasNextPage ? (
              <View style={styles.footer}>
                <Button label="Load More" onPress={() => fetchNextPage()} />
              </View>
            ) : undefined
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  chipRow: {
    paddingLeft: spacing.md,
    marginBottom: spacing.sm,
  },
  partialFailure: {
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
    fontSize: 12,
  },
  footer: {
    padding: spacing.md,
    alignItems: 'center',
  },
});
