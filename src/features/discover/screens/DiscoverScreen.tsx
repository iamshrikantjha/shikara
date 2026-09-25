import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useDiscover } from '../hooks/useDiscover';
import { getGenres } from '../../../lib/mock-data/mockApi';
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

  const allGenres = useMemo(() => getGenres(), []);
  const { data, isLoading, isError, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useDiscover({ type, genres, sort });

  const items: Media[] = data?.pages.flatMap(page => page.items) ?? [];

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

      {isLoading && <LoadingSkeleton count={6} height={140} />}
      {isError && !isLoading && <ErrorState onRetry={() => refetch()} />}
      {!isLoading && !isError && items.length === 0 && (
        <EmptyState message="No titles match these filters" actionLabel="Clear Filters" onAction={() => setGenres([])} />
      )}
      {!isLoading && !isError && items.length > 0 && (
        <MediaGrid
          items={items}
          onPressItem={openMedia}
          ListFooterComponent={
            hasNextPage ? (
              <View style={styles.footer}>
                <Button label={isFetchingNextPage ? 'Loading…' : 'Load More'} onPress={() => fetchNextPage()} />
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
  footer: {
    padding: spacing.md,
    alignItems: 'center',
  },
});
