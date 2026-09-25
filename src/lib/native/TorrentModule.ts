import { NativeModules, Platform } from 'react-native';

// Stable JS-facing interface for the native torrent engine
// (docs/03-Phase3-Torrent-Streaming.md §5.1/§6) — nothing above this file
// knows libtorrent4j exists. Android-only for Phase 3 (docs §7): the UI never
// enables "Find Streams"/"Play" on iOS/Web, so these calls are unreachable
// there in practice, but the fallback below fails loudly instead of silently
// no-op-ing if that assumption is ever wrong.

export type TorrentState =
  | 'downloadingMetadata'
  | 'downloading'
  | 'finished'
  | 'seeding'
  | 'checkingFiles'
  | 'checkingResumeData'
  | 'unknown';

export interface TorrentStatusInfo {
  progress: number; // 0..1
  downloadSpeed: number; // bytes/sec
  peers: number;
  state: TorrentState;
}

export interface TorrentFileInfo {
  index: number;
  path: string;
  size: number; // bytes
  progress: number; // 0..1
}

export interface TorrentPeerInfo {
  ip: string;
  client: string;
  downloadSpeed: number; // bytes/sec
  uploadSpeed: number; // bytes/sec
  progress: number; // 0..1, this peer's own completion
}

// Matches Priority's swig values in libtorrent4j exactly (Priority.java) —
// exposed so callers never hardcode magic numbers for setFilePriority().
export const TorrentPriority = {
  Ignore: 0,
  Low: 1,
  Default: 4,
  Top: 7,
} as const;

interface TorrentModuleNative {
  addMagnet(uri: string): Promise<string>;
  addTorrent(torrentFilePath: string): Promise<string>;
  start(torrentId: string): void;
  pause(torrentId: string): void;
  resume(torrentId: string): void;
  stop(torrentId: string): void;
  remove(torrentId: string): void;
  getStatus(torrentId: string): Promise<TorrentStatusInfo>;
  getFiles(torrentId: string): Promise<TorrentFileInfo[]>;
  getPeers(torrentId: string): Promise<TorrentPeerInfo[]>;
  getProgress(torrentId: string): Promise<number>;
  setFilePriority(torrentId: string, fileIndex: number, priority: number): void;
  // Beyond docs §5.1's literal list — lets JS learn which file libtorrent
  // actually selected (§5.2's fileIdx-or-largest-file logic lives natively;
  // this just reports the result) so the Player can hand it to the native
  // player without duplicating any file-selection logic in JavaScript.
  getSelectedFileIndex(torrentId: string): Promise<number | null>;
  // Beyond docs §5.1's literal list — required by §5.2's "seeking into an
  // unbuffered region must trigger re-prioritization" behavior.
  updatePlaybackPosition(torrentId: string, fileByteOffset: number): void;
  // Beyond docs §5.1's literal list — backs the "Clear streaming cache"
  // button (docs §3.3).
  clearCache(): Promise<void>;
}

function unsupported(name: keyof TorrentModuleNative): never {
  throw new Error(
    `TorrentModule.${name}() is Android-only (docs/03-Phase3-Torrent-Streaming.md §7) — called on ${Platform.OS}.`,
  );
}

const nativeModule: TorrentModuleNative | undefined =
  Platform.OS === 'android' ? (NativeModules.TorrentModule as TorrentModuleNative) : undefined;

export const TorrentModule: TorrentModuleNative =
  nativeModule ??
  ({
    addMagnet: () => unsupported('addMagnet'),
    addTorrent: () => unsupported('addTorrent'),
    start: () => unsupported('start'),
    pause: () => unsupported('pause'),
    resume: () => unsupported('resume'),
    stop: () => unsupported('stop'),
    remove: () => unsupported('remove'),
    getStatus: () => unsupported('getStatus'),
    getFiles: () => unsupported('getFiles'),
    getPeers: () => unsupported('getPeers'),
    getProgress: () => unsupported('getProgress'),
    setFilePriority: () => unsupported('setFilePriority'),
    getSelectedFileIndex: () => unsupported('getSelectedFileIndex'),
    updatePlaybackPosition: () => unsupported('updatePlaybackPosition'),
    clearCache: () => unsupported('clearCache'),
  } satisfies TorrentModuleNative);
