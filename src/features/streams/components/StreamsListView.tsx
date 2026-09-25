import React, { useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { Tabs } from '../../../components/Tabs';
import { Button } from '../../../components/Button';
import { EmptyState } from '../../../components/EmptyState';
import { ErrorState } from '../../../components/ErrorState';
import { LoadingSkeleton } from '../../../components/LoadingSkeleton';
import { StreamRow } from './StreamRow';
import { useStreams } from '../hooks/useStreams';
import { sortStreams } from '../../../lib/stream-sort';
import type { MediaType, Stream } from '../../../lib/types';
import { spacing, themeTokens } from '../../../styles/tokens';
import { useTheme } from '../../../context/ThemeContext';

// Sort control options (docs/03-Phase3-Torrent-Streaming.md §3.1). `as const`
// keeps the object keys as a literal union for the Tabs selection state.
const SORT_OPTIONS = {
  'Best Match': 'bestMatch',
  Quality: 'quality',
  Size: 'size',
  Seeders: 'seeders',
} as const;

type SortLabel = keyof typeof SORT_OPTIONS;

interface Props {
  type: MediaType;
  streamId: string;
  title: string;
  episodeLabel?: string;
  onSelectStream: (stream: Stream) => void;
  onOpenAddonManager: () => void;
}

export function StreamsListView({ type, streamId, title, episodeLabel, onSelectStream, onOpenAddonManager }: Props) {
  const { data, isLoading, refetch, addonCount } = useStreams(type, streamId);
  const [sort, setSort] = useState<SortLabel>('Best Match');
  const { resolvedTheme } = useTheme();
  const t = themeTokens[resolvedTheme];

  if (isLoading) {
    return <LoadingSkeleton count={6} height={72} />;
  }

  // No stream addon installed at all — distinct from "queried, found nothing"
  // (docs §3.1's full-failure state).
  if (addonCount === 0) {
    return (
      <EmptyState
        message="No stream addons installed."
        actionLabel="Open Addon Manager"
        onAction={onOpenAddonManager}
      />
    );
  }

  const items = data?.items ?? [];
  const failedAddons = data?.failedAddons ?? [];
  const allFailed = failedAddons.length > 0 && failedAddons.length === addonCount;

  // Every installed stream addon errored — full failure per docs §3.1, distinct
  // from a partial failure (some succeeded) or a clean empty result.
  if (allFailed) {
    return (
      <View style={styles.centerBlock}>
        <ErrorState message="All stream sources failed to respond." onRetry={() => refetch()} />
        <Button label="Open Addon Manager" variant="secondary" onPress={onOpenAddonManager} />
      </View>
    );
  }

  if (items.length === 0) {
    return (
      <EmptyState
        message="No streams found for this title."
        actionLabel="Open Addon Manager"
        onAction={onOpenAddonManager}
      />
    );
  }

  const sorted = sortStreams(items, SORT_OPTIONS[sort]);
  const failedAddonNames = Array.from(new Set(failedAddons.map(a => a.manifest.name)));

  return (
    <View style={styles.container}>
      <Text style={styles.header}>{episodeLabel ? `${title} — ${episodeLabel}` : title}</Text>
      <Tabs options={Object.keys(SORT_OPTIONS)} selected={sort} onSelect={value => setSort(value as SortLabel)} />
      {failedAddonNames.length > 0 && (
        <Text style={[styles.banner, { color: t.muted }]}>
          Some sources are unavailable ({failedAddonNames.join(', ')})
        </Text>
      )}
      <FlatList data={sorted} keyExtractor={s => s.id} renderItem={({ item }) => <StreamRow stream={item} onPress={() => onSelectStream(item)} />} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    fontSize: 16,
    fontWeight: '700',
    padding: spacing.md,
  },
  banner: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    fontSize: 12,
  },
  centerBlock: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
});
