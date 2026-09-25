import React from 'react';
import { StyleSheet, View } from 'react-native';
import type { Stream } from '../../../lib/types';

// Health thresholds per docs/03-Phase3-Torrent-Streaming.md §3.1. Seeders is
// the only field with any cross-addon reliability (parsed from free text in
// normalizeStream) — a missing count renders "unknown", never defaults to red.
const COLORS = {
  healthy: '#2e7d32',
  moderate: '#f9a825',
  poor: '#c62828',
  unknown: '#9e9e9e',
} as const;

function healthColor(seeders: number | undefined): string {
  if (seeders === undefined) return COLORS.unknown;
  if (seeders >= 10) return COLORS.healthy;
  if (seeders >= 1) return COLORS.moderate;
  return COLORS.poor;
}

export function HealthDot({ stream }: { stream: Stream }) {
  return <View style={[styles.dot, { backgroundColor: healthColor(stream.behaviorHints.seeders) }]} />;
}

const styles = StyleSheet.create({
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
