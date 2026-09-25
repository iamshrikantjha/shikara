import { useEffect, useRef, useState } from 'react';
import { AppState, Alert } from 'react-native';
import { TorrentModule, TorrentPriority, type TorrentState } from '../../../lib/native/TorrentModule';
import { PlayerModule, type PlayerStateInfo } from '../../../lib/native/PlayerModule';
import { useLibrary } from '../../../context/LibraryContext';
import type { DownloadMode } from '../../../context/SettingsContext';
import { isOnCellular, subscribeToCellularHandover } from '../../../lib/network';
import { notePausedTorrent, notePlayingTorrent, noteResumedTorrent } from '../pausedTorrentRegistry';
import type { MediaType, Stream } from '../../../lib/types';

const STATUS_POLL_MS = 1000;
const PLAYER_POLL_MS = 500;
const HISTORY_WRITE_MS = 5000;
// Cold DHT bootstrap (no prior routing table — the very first magnet this
// session has ever resolved) can genuinely take 60-90s even on a healthy
// network; 30s was cutting this off before it had a real chance to work.
const METADATA_TIMEOUT_MS = 90_000;
const NO_PEERS_TIMEOUT_MS = 60_000;

export type PlayerErrorKind = 'metadata' | 'noPeers' | 'playback' | 'declined';

export interface TorrentStatusInfo {
  downloadSpeed: number;
  peers: number;
  progress: number;
  state: TorrentState;
}

interface UsePlayerSessionOptions {
  mediaId: string; // composite id used for the stream/history lookup
  libraryMediaId: string; // the LibraryItem id (series id for episodes, same as mediaId for movies)
  type: MediaType;
  title: string;
  episodeLabel?: string;
  subtitleUrl?: string;
  subtitleLang?: string;
  downloadMode: DownloadMode;
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function confirmCellularStart(): Promise<boolean> {
  return new Promise(resolve => {
    Alert.alert(
      'Use mobile data?',
      "You're not on Wi-Fi. Streaming will use mobile data.",
      [
        { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
        { text: 'Continue', onPress: () => resolve(true) },
      ],
      { onDismiss: () => resolve(false) },
    );
  });
}

// Waits for libtorrent to resolve which file to stream (docs §5.2's
// fileIdx-or-largest-file logic runs natively — this just waits for the
// result) rather than duplicating any BitTorrent logic in JavaScript.
async function pollForFileIndex(torrentId: string, isCancelled: () => boolean): Promise<number | null> {
  const deadline = Date.now() + METADATA_TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (isCancelled()) return null;
    const index = await TorrentModule.getSelectedFileIndex(torrentId);
    if (index !== null && index !== undefined) return index;
    await delay(500);
  }
  return null;
}

// Owns the addMagnet → setFilePriority → start → load lifecycle (docs §3.2),
// polls torrent/player state for the buffering overlay and scrub bar, writes
// watch position periodically (docs §8) regardless of how the session ends,
// enforces the Wi-Fi-only setting (docs §7), and pauses on backgrounding
// (docs §3.2) while evicting any previously paused-and-resumable torrent
// (only one is kept at a time, per the same section).
export function usePlayerSession(stream: Stream | undefined, options: UsePlayerSessionOptions) {
  const { history, upsertHistory, setLastStream } = useLibrary();
  const [torrentId, setTorrentId] = useState<string | null>(null);
  const [torrentStatus, setTorrentStatus] = useState<TorrentStatusInfo | null>(null);
  const [playerState, setPlayerState] = useState<PlayerStateInfo | null>(null);
  const [error, setError] = useState<PlayerErrorKind | null>(null);
  const seekedToHistoryRef = useRef(false);
  const startedForStreamId = useRef<string | null>(null);

  const savedPosition = history.find(h => h.mediaId === options.mediaId)?.progressSeconds ?? 0;

  // Start playback exactly once per selected stream — switching source
  // (a new `stream.id`) re-runs this from scratch.
  useEffect(() => {
    if (!stream || startedForStreamId.current === stream.id) return;
    startedForStreamId.current = stream.id;
    seekedToHistoryRef.current = false;
    setError(null);
    setTorrentId(null);
    setTorrentStatus(null);

    let cancelled = false;

    async function start() {
      try {
        if (stream!.type !== 'direct' && options.downloadMode === 'wifiOnly' && (await isOnCellular())) {
          const proceed = await confirmCellularStart();
          if (cancelled) return;
          if (!proceed) {
            setError('declined');
            return;
          }
        }

        if (stream!.type === 'direct') {
          PlayerModule.loadDirect(stream!.url, options.subtitleUrl ?? null, options.subtitleLang ?? null);
        } else {
          const id = await TorrentModule.addMagnet(stream!.url);
          if (cancelled) return;
          setTorrentId(id);
          notePlayingTorrent(id);

          const fileIdx = stream!.behaviorHints.fileIdx;
          if (fileIdx !== undefined) {
            TorrentModule.setFilePriority(id, fileIdx, TorrentPriority.Top);
          }
          TorrentModule.start(id);

          const resolvedFileIndex = await pollForFileIndex(id, () => cancelled);
          if (cancelled) return;
          if (resolvedFileIndex === null) {
            setError('metadata');
            return;
          }
          PlayerModule.load(id, resolvedFileIndex, options.subtitleUrl ?? null, options.subtitleLang ?? null);
        }
        setLastStream(options.libraryMediaId, stream!.source, stream!.quality ?? 'sd');
      } catch {
        setError('metadata');
      }
    }

    start();

    return () => {
      cancelled = true;
    };
  }, [stream, options.libraryMediaId, options.subtitleUrl, options.subtitleLang, options.downloadMode, setLastStream]);

  const torrentStatusRef = useRef(torrentStatus);
  torrentStatusRef.current = torrentStatus;
  const playerStateRef = useRef(playerState);
  playerStateRef.current = playerState;

  // Buffering overlay data (docs §3.2) — download speed/peers/percent/state.
  useEffect(() => {
    if (!torrentId) return;
    const interval = setInterval(() => {
      TorrentModule.getStatus(torrentId)
        .then(status =>
          setTorrentStatus({
            downloadSpeed: status.downloadSpeed,
            peers: status.peers,
            progress: status.progress,
            state: status.state,
          }),
        )
        .catch(() => undefined);
    }, STATUS_POLL_MS);
    return () => clearInterval(interval);
  }, [torrentId]);

  // Playback position/duration/buffered-range/state (docs §3.2's scrub bar)
  // — also resumes from the saved WatchHistory position exactly once, which
  // is what makes "Switch Source" resume where the previous source left off
  // (docs §3.2) since this runs identically on every fresh load.
  useEffect(() => {
    if (!stream) return;
    const interval = setInterval(() => {
      PlayerModule.getState()
        .then(state => {
          setPlayerState(state);
          if (!seekedToHistoryRef.current && state.playbackState === 'ready' && savedPosition > 0) {
            seekedToHistoryRef.current = true;
            PlayerModule.seek(savedPosition * 1000);
          }
        })
        .catch(() => undefined);
    }, PLAYER_POLL_MS);
    return () => clearInterval(interval);
  }, [stream, savedPosition]);

  // Periodic watch-position write (docs §8).
  useEffect(() => {
    if (!playerState) return;
    const interval = setInterval(() => {
      upsertHistory({
        mediaId: options.mediaId,
        type: options.type,
        title: options.title,
        episodeLabel: options.episodeLabel,
        progressSeconds: playerState.currentTime,
        durationSeconds: playerState.duration,
        updatedAt: new Date().toISOString(),
      });
    }, HISTORY_WRITE_MS);
    return () => clearInterval(interval);
  }, [playerState, options.mediaId, options.type, options.title, options.episodeLabel, upsertHistory]);

  // "No peers found after timeout" (docs §7) — only relevant for torrent
  // streams that never start downloading anything. Uses refs so periodic polling
  // doesn't reset the timer on every tick.
  useEffect(() => {
    if (!torrentId) return;
    const timeout = setTimeout(() => {
      const status = torrentStatusRef.current;
      const player = playerStateRef.current;
      if ((status?.progress ?? 0) === 0 && (status?.peers ?? 0) === 0 && !player?.isPlaying) {
        setError('noPeers');
      }
    }, NO_PEERS_TIMEOUT_MS);
    return () => clearTimeout(timeout);
  }, [torrentId]);

  // ExoPlayer-reported playback failure (bad source, unsupported codec, etc.)
  // surfaces as the Error overlay too (docs §7) — driven by the native
  // PlaybackException itself, not a JS-side guess.
  useEffect(() => {
    if (playerState?.error) {
      setError(prev => prev ?? 'playback');
    }
  }, [playerState?.error]);

  // Network hands over Wi-Fi → mobile data mid-download while "Wi-Fi only"
  // is set: pause and re-show the same confirmation dialog, never continue
  // silently (docs §7).
  useEffect(() => {
    if (!torrentId || options.downloadMode !== 'wifiOnly') return;
    const unsubscribe = subscribeToCellularHandover(() => {
      TorrentModule.pause(torrentId);
      notePausedTorrent(torrentId);
      Alert.alert('Continue on mobile data?', 'Your Wi-Fi connection was lost. Continuing will use mobile data.', [
        { text: 'Pause', style: 'cancel' },
        {
          text: 'Continue',
          onPress: () => {
            TorrentModule.resume(torrentId);
            noteResumedTorrent(torrentId);
          },
        },
      ]);
    });
    return unsubscribe;
  }, [torrentId, options.downloadMode]);

  // App backgrounding pauses (not stops/removes) the active torrent, and
  // resumes it on foreground — docs §3.2's background lifecycle decision.
  useEffect(() => {
    if (!torrentId) return;
    const subscription = AppState.addEventListener('change', nextState => {
      if (nextState === 'background' || nextState === 'inactive') {
        TorrentModule.pause(torrentId);
        notePausedTorrent(torrentId);
      } else if (nextState === 'active') {
        TorrentModule.resume(torrentId);
        noteResumedTorrent(torrentId);
      }
    });
    return () => subscription.remove();
  }, [torrentId]);

  // Leaving the Player pauses (not stops/removes) the torrent — docs §3.2's
  // background lifecycle decision, so returning to the same Player resumes
  // instantly rather than re-buffering from scratch.
  useEffect(() => {
    return () => {
      if (torrentId) {
        TorrentModule.pause(torrentId);
        notePausedTorrent(torrentId);
      }
      PlayerModule.stop();
    };
  }, [torrentId]);

  return { torrentId, torrentStatus, playerState, error };
}
