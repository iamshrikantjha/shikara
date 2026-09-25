import React from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import type { Media } from '../lib/types';
import { MediaCard } from './MediaCard';
import { spacing } from '../styles/tokens';

interface MediaRowProps {
  title: string;
  items: Media[];
  onPressItem: (media: Media) => void;
  onLongPressItem?: (media: Media) => void;
  onFocusItem?: (media: Media) => void;
}

export function MediaRow({ title, items, onPressItem, onLongPressItem, onFocusItem }: MediaRowProps) {
  if (items.length === 0) {
    return null;
  }
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <FlatList
        horizontal
        data={items}
        keyExtractor={item => item.id}
        showsHorizontalScrollIndicator={false}
        renderItem={({ item }) => (
          <View style={styles.cardWrapper}>
            <MediaCard
              media={item}
              onPress={() => onPressItem(item)}
              onLongPress={onLongPressItem ? () => onLongPressItem(item) : undefined}
              onFocus={onFocusItem ? () => onFocusItem(item) : undefined}
            />
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  cardWrapper: {
    marginLeft: spacing.md,
  },
});
