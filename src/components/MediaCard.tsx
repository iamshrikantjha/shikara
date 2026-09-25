import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { Media } from '../lib/types';
import { Focusable } from './Focusable';
import { useTheme } from '../context/ThemeContext';
import { spacing, themeTokens } from '../styles/tokens';

interface MediaCardProps {
  media: Media;
  onPress: () => void;
  onLongPress?: () => void;
  width?: number;
}

export function MediaCard({ media, onPress, onLongPress, width = 120 }: MediaCardProps) {
  const { resolvedTheme } = useTheme();
  const t = themeTokens[resolvedTheme];

  return (
    <Focusable onPress={onPress} onLongPress={onLongPress} style={{ width }}>
      <View style={[styles.poster, { borderColor: t.border, backgroundColor: t.skeleton }]}>
        <Text style={styles.typeBadge}>{media.type === 'movie' ? 'Movie' : 'Series'}</Text>
      </View>
      <Text numberOfLines={2} style={styles.title}>
        {media.title}
      </Text>
      <View style={styles.metaRow}>
        {media.year !== undefined && <Text>{media.year}</Text>}
        {media.rating !== undefined && <Text>{`  ★ ${media.rating.toFixed(1)}`}</Text>}
      </View>
    </Focusable>
  );
}

const styles = StyleSheet.create({
  poster: {
    aspectRatio: 2 / 3,
    borderWidth: 1,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  typeBadge: {
    fontSize: 12,
  },
  title: {
    fontSize: 13,
  },
  metaRow: {
    flexDirection: 'row',
  },
});
