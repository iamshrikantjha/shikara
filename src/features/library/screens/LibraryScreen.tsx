import React, { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useQueries } from '@tanstack/react-query';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Tabs } from '../../../components/Tabs';
import { MediaGrid } from '../../../components/MediaGrid';
import { EmptyState } from '../../../components/EmptyState';
import { LoadingSkeleton } from '../../../components/LoadingSkeleton';
import { useLibrary } from '../../../context/LibraryContext';
import { useAddons } from '../../../context/AddonsContext';
import { fetchMergedMeta } from '../../../lib/addons/queries';
import { metaQueryKey, staleTimeFor } from '../../../lib/query-client';
import type { Media } from '../../../lib/types';
import type { MainTabParamList, RootStackParamList } from '../../../navigation/routes';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'LibraryTab'>,
  NativeStackScreenProps<RootStackParamList>
>;

const TAB_OPTIONS = ['Movies', 'Series', 'Watchlist'];

export function LibraryScreen({ navigation }: Props) {
  const { items, removeFromLibrary } = useLibrary();
  const { addons } = useAddons();
  const [tab, setTab] = useState<'Movies' | 'Series' | 'Watchlist'>('Movies');

  const filteredItems = useMemo(() => {
    const typeFilter = tab === 'Movies' ? 'movie' : tab === 'Series' ? 'series' : undefined;
    return items.filter(item => !typeFilter || item.type === typeFilter);
  }, [items, tab]);

  // Library only stores {mediaId, type} — details are re-fetched (and cached)
  // per item, same meta query key/cache Movie/Series Details reads from.
  const metaQueries = useQueries({
    queries: filteredItems.map(item => ({
      queryKey: metaQueryKey(item.type, item.mediaId),
      queryFn: () => fetchMergedMeta(addons, item.type, item.mediaId),
      staleTime: staleTimeFor.meta,
    })),
  });

  const isLoading = metaQueries.some(q => q.isLoading);
  const media: Media[] = metaQueries.map(q => q.data).filter((m): m is Media => Boolean(m));

  function openMedia(m: Media) {
    if (m.type === 'movie') {
      navigation.navigate('MovieDetails', { id: m.id });
    } else {
      navigation.navigate('SeriesDetails', { id: m.id });
    }
  }

  return (
    <View style={styles.container}>
      <Tabs options={TAB_OPTIONS} selected={tab} onSelect={value => setTab(value as typeof tab)} />
      {filteredItems.length === 0 ? (
        <EmptyState
          message="Nothing here yet"
          actionLabel="Browse Discover"
          onAction={() => navigation.navigate('DiscoverTab')}
        />
      ) : isLoading && media.length === 0 ? (
        <LoadingSkeleton count={4} height={140} />
      ) : (
        <MediaGrid items={media} onPressItem={openMedia} onLongPressItem={m => removeFromLibrary(m.id)} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
