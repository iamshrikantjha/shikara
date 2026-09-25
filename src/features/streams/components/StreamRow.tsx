import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Badge } from '../../../components/Badge';
import { HealthDot } from './HealthDot';
import type { Stream } from '../../../lib/types';
import { spacing, themeTokens } from '../../../styles/tokens';
import { useTheme } from '../../../context/ThemeContext';

function formatSize(bytes: number | undefined): string | undefined {
  if (!bytes) return undefined;
  const gb = bytes / (1024 * 1024 * 1024);
  return gb >= 1 ? `${gb.toFixed(1)} GB` : `${Math.round(bytes / (1024 * 1024))} MB`;
}

export function StreamRow({ stream, onPress }: { stream: Stream; onPress: () => void }) {
  const { resolvedTheme } = useTheme();
  const t = themeTokens[resolvedTheme];
  const size = formatSize(stream.size);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, { borderColor: t.border, opacity: pressed ? 0.6 : 1 }]}
    >
      <View style={styles.headerLine}>
        <HealthDot stream={stream} />
        <Text style={styles.source}>{stream.source}</Text>
        {stream.quality && <Badge label={stream.quality} />}
        {stream.codec && <Badge label={stream.codec} />}
      </View>
      <Text numberOfLines={2} style={styles.title}>
        {stream.title}
      </Text>
      <View style={styles.metaLine}>
        {size && <Text style={{ color: t.muted }}>{size}</Text>}
        {stream.audioTracks.length > 0 && (
          <Text style={{ color: t.muted }}>{`  •  ${stream.audioTracks.join(', ')}`}</Text>
        )}
        {stream.subtitles.length > 0 && <Text style={{ color: t.muted }}>{'  •  CC'}</Text>}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  source: {
    fontWeight: '600',
    marginRight: spacing.xs,
  },
  title: {
    marginBottom: spacing.xs,
  },
  metaLine: {
    flexDirection: 'row',
  },
});
