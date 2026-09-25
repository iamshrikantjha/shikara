import React, { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSearch } from '../hooks/useSearch';
import { usePrefetchMeta } from '../../../lib/addons/usePrefetchMeta';
import { SearchInput } from '../../../components/SearchInput';
import { MediaGrid } from '../../../components/MediaGrid';
import { LoadingSkeleton } from '../../../components/LoadingSkeleton';
import { ErrorState } from '../../../components/ErrorState';
import { EmptyState } from '../../../components/EmptyState';
import type { Media } from '../../../lib/types';
import type { MainTabParamList, RootStackParamList } from '../../../navigation/routes';
import { spacing } from '../../../styles/tokens';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'SearchTab'>,
  NativeStackScreenProps<RootStackParamList>
>;

const MAX_RECENT = 10;

export function SearchScreen({ navigation }: Props) {
  const [text, setText] = useState('');
  const [recent, setRecent] = useState<string[]>([]);
  const { data, isLoading, isError, refetch, debounced } = useSearch(text);
  const prefetchMeta = usePrefetchMeta();

  function runQuery(value: string) {
    setText(value);
  }

  function commitToRecent(value: string) {
    const trimmed = value.trim();
    if (!trimmed) return;
    setRecent(prev => [trimmed, ...prev.filter(r => r !== trimmed)].slice(0, MAX_RECENT));
  }

  function openMedia(media: Media) {
    commitToRecent(text);
    if (media.type === 'movie') {
      navigation.navigate('MovieDetails', { id: media.id });
    } else {
      navigation.navigate('SeriesDetails', { id: media.id });
    }
  }

  const showRecent = text.trim().length === 0;
  const results = data?.items ?? [];
  const failedAddonNames = data?.failedAddonNames ?? [];

  return (
    <View style={styles.container}>
      <SearchInput value={text} onChangeText={runQuery} onClear={() => setText('')} autoFocus />

      {showRecent && (
        <View style={styles.recentContainer}>
          {recent.length === 0 ? (
            <EmptyState message="Search for a movie or series" />
          ) : (
            <>
              <View style={styles.recentHeader}>
                <Text>Recent Searches</Text>
                <Pressable onPress={() => setRecent([])}>
                  <Text>Clear All</Text>
                </Pressable>
              </View>
              <FlatList
                data={recent}
                keyExtractor={item => item}
                renderItem={({ item }) => (
                  <View style={styles.recentRow}>
                    <Pressable style={styles.recentItem} onPress={() => setText(item)}>
                      <Text>{item}</Text>
                    </Pressable>
                    <Pressable onPress={() => setRecent(prev => prev.filter(r => r !== item))} hitSlop={8}>
                      <Text>✕</Text>
                    </Pressable>
                  </View>
                )}
              />
            </>
          )}
        </View>
      )}

      {!showRecent && failedAddonNames.length > 0 && (
        <Text style={styles.partialFailure}>Some sources are unavailable: {failedAddonNames.join(', ')}</Text>
      )}
      {!showRecent && isLoading && <LoadingSkeleton count={6} height={140} />}
      {!showRecent && isError && <ErrorState onRetry={() => refetch()} />}
      {!showRecent && !isLoading && !isError && results.length === 0 && (
        <EmptyState message={`No results for "${debounced}"`} />
      )}
      {!showRecent && !isLoading && !isError && results.length > 0 && (
        <MediaGrid items={results} onPressItem={openMedia} onFocusItem={prefetchMeta} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  recentContainer: {
    flex: 1,
    paddingHorizontal: spacing.md,
  },
  recentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  recentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  recentItem: {
    flex: 1,
  },
  partialFailure: {
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
    fontSize: 12,
  },
});
