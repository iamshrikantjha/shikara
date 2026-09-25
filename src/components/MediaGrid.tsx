import React from 'react';
import { FlatList, Platform, StyleSheet, useWindowDimensions, View } from 'react-native';
import type { Media } from '../lib/types';
import { MediaCard } from './MediaCard';
import { columnsForWidth, spacing } from '../styles/tokens';

interface MediaGridProps {
  items: Media[];
  onPressItem: (media: Media) => void;
  onLongPressItem?: (media: Media) => void;
  onFocusItem?: (media: Media) => void;
  onEndReached?: () => void;
  ListEmptyComponent?: React.ReactElement;
  ListFooterComponent?: React.ReactElement;
}

export function MediaGrid({
  items,
  onPressItem,
  onLongPressItem,
  onFocusItem,
  onEndReached,
  ListEmptyComponent,
  ListFooterComponent,
}: MediaGridProps) {
  const { width } = useWindowDimensions();
  const numColumns = columnsForWidth(width, Platform.isTV);

  return (
    <FlatList
      data={items}
      keyExtractor={item => item.id}
      numColumns={numColumns}
      key={numColumns}
      columnWrapperStyle={numColumns > 1 ? styles.row : undefined}
      contentContainerStyle={styles.content}
      renderItem={({ item }) => (
        <View style={styles.cell}>
          <MediaCard
            media={item}
            width={width / numColumns - spacing.md * 1.5}
            onPress={() => onPressItem(item)}
            onLongPress={onLongPressItem ? () => onLongPressItem(item) : undefined}
            onFocus={onFocusItem ? () => onFocusItem(item) : undefined}
          />
        </View>
      )}
      // Fetch the next page before the user physically reaches the bottom
      // (docs/02-Phase2-API-Integration.md §7.3 "prefetching the next Discover page").
      onEndReached={onEndReached}
      onEndReachedThreshold={0.5}
      ListEmptyComponent={ListEmptyComponent}
      ListFooterComponent={ListFooterComponent}
    />
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.md,
  },
  row: {
    justifyContent: 'flex-start',
    gap: spacing.md,
  },
  cell: {
    marginBottom: spacing.md,
  },
});
