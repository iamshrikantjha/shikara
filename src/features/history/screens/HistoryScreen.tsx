import React from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button } from '../../../components/Button';
import { EmptyState } from '../../../components/EmptyState';
import { RemoteImage } from '../../../components/RemoteImage';
import { useLibrary } from '../../../context/LibraryContext';
import type { RootStackParamList } from '../../../navigation/routes';
import { spacing, themeTokens } from '../../../styles/tokens';
import { useTheme } from '../../../context/ThemeContext';

type Props = NativeStackScreenProps<RootStackParamList, 'History'>;

export function HistoryScreen({ navigation }: Props) {
  const { history, removeFromHistory } = useLibrary();
  const { resolvedTheme } = useTheme();
  const t = themeTokens[resolvedTheme];

  if (history.length === 0) {
    return <EmptyState message="You haven't watched anything yet" />;
  }

  return (
    <FlatList
      data={history}
      keyExtractor={item => item.mediaId}
      contentContainerStyle={styles.list}
      renderItem={({ item }) => {
        const percent = Math.round((item.progressSeconds / item.durationSeconds) * 100);
        return (
          <View style={[styles.row, { borderColor: t.border }]}>
            <RemoteImage uri={item.posterUrl} style={[styles.thumbnail, { borderColor: t.border }]} />
            <View style={styles.info}>
              <Text style={styles.title}>{item.title}</Text>
              {item.episodeLabel && <Text>{item.episodeLabel}</Text>}
              <View style={[styles.progressTrack, { borderColor: t.border }]}>
                <View style={[styles.progressFill, { width: `${percent}%`, backgroundColor: t.border }]} />
              </View>
            </View>
            <View style={styles.actions}>
              <Button
                label="Resume"
                disabled
                variant="secondary"
                onPress={() => navigation.navigate('Player', { mediaId: item.mediaId, type: item.type })}
              />
              <Button label="Remove" onPress={() => removeFromHistory(item.mediaId)} />
            </View>
          </View>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    padding: spacing.md,
  },
  row: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    paddingBottom: spacing.md,
    marginBottom: spacing.md,
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
  title: {
    fontWeight: '600',
  },
  progressTrack: {
    height: 4,
    borderWidth: 1,
    borderRadius: 2,
    marginTop: spacing.xs,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
  },
  actions: {
    justifyContent: 'space-between',
  },
});
