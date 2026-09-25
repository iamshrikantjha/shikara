import { NativeModules, Platform } from 'react-native';

// Stable JS-facing interface for the native player
// (docs/03-Phase3-Torrent-Streaming.md §5.3/§6) — no ExoPlayer internals leak
// into TypeScript. Android-only for Phase 3 (docs §7), same Android-only
// guard pattern as TorrentModule.ts.

export type PlaybackState = 'idle' | 'buffering' | 'ready' | 'ended';

export interface PlayerStateInfo {
  currentTime: number; // seconds
  duration: number; // seconds
  bufferedPosition: number; // seconds
  isPlaying: boolean;
  playbackState: PlaybackState;
  audioLanguages: string[]; // real embedded tracks in the file currently playing
  error: string | null; // ExoPlayer's PlaybackException.errorCodeName, e.g. "ERROR_CODE_DECODING_FAILED"
}

interface PlayerModuleNative {
  load(torrentId: string, fileIndex: number, subtitleUrl: string | null, subtitleLang: string | null): void;
  // Stream.type === "direct" (docs §4.1.3) — no torrent engine involved.
  loadDirect(url: string, subtitleUrl: string | null, subtitleLang: string | null): void;
  play(): void;
  pause(): void;
  stop(): void;
  seek(positionMs: number): void;
  // No adaptive-bitrate renditions exist for a single torrent file — kept as
  // a documented no-op; "Switch Source" is how this app changes quality.
  setQuality(): void;
  setAudioTrack(languageCode: string): void;
  setSubtitle(subtitleUrl: string | null, subtitleLang: string | null): void;
  getState(): Promise<PlayerStateInfo>;
}

function unsupported(name: keyof PlayerModuleNative): never {
  throw new Error(
    `PlayerModule.${name}() is Android-only (docs/03-Phase3-Torrent-Streaming.md §7) — called on ${Platform.OS}.`,
  );
}

const nativeModule: PlayerModuleNative | undefined =
  Platform.OS === 'android' ? (NativeModules.PlayerModule as PlayerModuleNative) : undefined;

export const PlayerModule: PlayerModuleNative =
  nativeModule ??
  ({
    load: () => unsupported('load'),
    loadDirect: () => unsupported('loadDirect'),
    play: () => unsupported('play'),
    pause: () => unsupported('pause'),
    stop: () => unsupported('stop'),
    seek: () => unsupported('seek'),
    setQuality: () => unsupported('setQuality'),
    setAudioTrack: () => unsupported('setAudioTrack'),
    setSubtitle: () => unsupported('setSubtitle'),
    getState: () => unsupported('getState'),
  } satisfies PlayerModuleNative);
