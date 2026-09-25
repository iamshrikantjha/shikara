import React from 'react';
import { Platform, requireNativeComponent, View, type ViewProps } from 'react-native';

// Renders the video surface only (docs/03-Phase3-Torrent-Streaming.md §3.2) —
// all playback control goes through PlayerModule, not props/commands on this
// component (docs §5.3/§6 — no ExoPlayer internals leak into TypeScript).
const NativeTorrentPlayerView =
  Platform.OS === 'android' ? requireNativeComponent<ViewProps>('TorrentPlayerView') : null;

export function TorrentPlayerView(props: ViewProps) {
  if (!NativeTorrentPlayerView) {
    // iOS/Web never reach the Player screen in Phase 3 (docs §7) — this is a
    // defensive fallback, not an expected runtime path.
    return <View {...props} />;
  }
  return <NativeTorrentPlayerView {...props} />;
}
