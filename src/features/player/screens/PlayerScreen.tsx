import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../../navigation/routes';
import { spacing } from '../../../styles/tokens';

type Props = NativeStackScreenProps<RootStackParamList, 'Player'>;

// Stub only — reserves the route/back-behavior. Real playback lands in
// 03-Phase3-Torrent-Streaming.md §3.2, replacing this file's contents.
export function PlayerScreen({ navigation }: Props) {
  return (
    <View style={styles.container}>
      <Pressable style={styles.back} onPress={() => navigation.goBack()} hitSlop={8}>
        <Text>← Back</Text>
      </Pressable>

      <View style={styles.center}>
        <Text style={styles.message}>Playback will be available in a future phase</Text>
      </View>

      <View style={styles.controls}>
        <Text>▶</Text>
        <View style={styles.scrubBar} />
        <Text>00:00 / 00:00</Text>
        <Text>⛶</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
  },
  back: {
    padding: spacing.md,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  message: {
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
  },
  scrubBar: {
    flex: 1,
    height: 2,
    backgroundColor: '#888',
  },
});
