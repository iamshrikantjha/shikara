import React, { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Tabs } from '../../../components/Tabs';
import { MediaGrid } from '../../../components/MediaGrid';
import { EmptyState } from '../../../components/EmptyState';
import { useLibrary } from '../../../context/LibraryContext';
import { findMovie, findSeries } from '../../../lib/mock-data/fixtures';
import type { Media } from '../../../lib/types';
import type { MainTabParamList, RootStackParamList } from '../../../navigation/routes';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'LibraryTab'>,
  NativeStackScreenProps<RootStackParamList>
>;

const TAB_OPTIONS = ['Movies', 'Series', 'Watchlist'];

export function LibraryScreen({ navigation }: Props) {
  const { items, removeFromLibrary } = useLibrary();
  const [tab, setTab] = useState<'Movies' | 'Series' | 'Watchlist'>('Movies');

  const media: Media[] = useMemo(() => {
    const typeFilter = tab === 'Movies' ? 'movie' : tab === 'Series' ? 'series' : undefined;
    return items
      .filter(item => !typeFilter || item.type === typeFilter)
      .map(item => (item.type === 'movie' ? findMovie(item.mediaId) : findSeries(item.mediaId)))
      .filter((m): m is Media => Boolean(m));
  }, [items, tab]);

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
      {media.length === 0 ? (
        <EmptyState
          message="Nothing here yet"
          actionLabel="Browse Discover"
          onAction={() => navigation.navigate('DiscoverTab')}
        />
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
