import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Episode } from '../lib/types';
import { Focusable } from './Focusable';
import { RemoteImage } from './RemoteImage';
import { Rating } from './Rating';
import { useTheme } from '../context/ThemeContext';
import { spacing, themeTokens } from '../styles/tokens';

interface EpisodeRowProps {
  episode: Episode;
  onPress: () => void;
  // When provided, the ▶ icon is a dedicated play button that goes straight
  // to streams — tapping anywhere else on the row still calls onPress
  // (episode details). Omit on platforms where streaming isn't available.
  onPlayPress?: () => void;
}

export function EpisodeRow({ episode, onPress, onPlayPress }: EpisodeRowProps) {
  const { resolvedTheme } = useTheme();
  const t = themeTokens[resolvedTheme];
  const label = `S${String(episode.seasonNumber).padStart(2, '0')}E${String(
    episode.episodeNumber,
  ).padStart(2, '0')}`;

  return (
    <Focusable onPress={onPress} style={[styles.row, { borderColor: t.border }]}>
      <RemoteImage uri={episode.thumbnailUrl} style={[styles.thumbnail, { borderColor: t.border }]} />
      <View style={styles.info}>
        <Text style={styles.label}>{label}</Text>
        <Text numberOfLines={1} style={styles.title}>
          {episode.title}
        </Text>
        <Text numberOfLines={2} style={styles.overview}>
          {episode.overview}
        </Text>
        <View style={styles.metaRow}>
          {episode.airDate && <Text>{episode.airDate}</Text>}
          {episode.runtimeMinutes && <Text>{`  ${episode.runtimeMinutes} min`}</Text>}
          <Text> </Text>
          <Rating value={episode.rating} />
        </View>
      </View>
      {onPlayPress ? (
        <Pressable onPress={onPlayPress} style={styles.playButton} hitSlop={12}>
          <Text style={styles.playIcon}>▶</Text>
        </Pressable>
      ) : (
        <Text style={styles.playIcon}>▶</Text>
      )}
    </Focusable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    padding: spacing.sm,
    borderBottomWidth: 1,
    alignItems: 'center',
  },
  thumbnail: {
    width: 100,
    height: 60,
    borderWidth: 1,
    borderRadius: 4,
    marginRight: spacing.sm,
  },
  info: {
    flex: 1,
  },
  label: {
    fontSize: 12,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
  },
  overview: {
    fontSize: 12,
  },
  metaRow: {
    flexDirection: 'row',
    marginTop: spacing.xs,
  },
  playButton: {
    padding: spacing.sm,
  },
  playIcon: {
    paddingHorizontal: spacing.sm,
  },
});
