import { useEffect, useRef, useState } from 'react';
import { TorrentModule } from '../../../lib/native/TorrentModule';
import { TorrentPriority } from '../../../lib/native/TorrentModule';
import { PlayerModule, type PlayerStateInfo } from '../../../lib/native/PlayerModule';
import { useLibrary } from '../../../context/LibraryContext';
import type { MediaType, Stream } from '../../../lib/types';

const STATUS_POLL_MS = 1000;
const PLAYER_POLL_MS = 500;
const HISTORY_WRITE_MS = 5000;
const METADATA_TIMEOUT_MS = 30_000;
const NO_PEERS_TIMEOUT_MS = 20_000;

export type PlayerErrorKind = 'metadata' | 'noPeers' | 'playback';

export interface TorrentStatusInfo {
  downloadSpeed: number;
  peers: number;
  progress: number;
}

interface UsePlayerSessionOptions {
  mediaId: string;
  type: MediaType;
  title: string;
  episodeLabel?: string;
  subtitleUrl?: string;
  subtitleLang?: string;
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
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
// polls torrent/player state for the buffering overlay and scrub bar, and
// writes watch position periodically (docs §8) — continuing regardless of
// how the session ends, per docs §3.2's "no separate abandoned-session case".
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
        if (stream!.type === 'direct') {
          PlayerModule.loadDirect(stream!.url, options.subtitleUrl ?? null, options.subtitleLang ?? null);
        } else {
          const id = await TorrentModule.addMagnet(stream!.url);
          if (cancelled) return;
          setTorrentId(id);

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
        setLastStream(options.mediaId, stream!.source, stream!.quality ?? 'sd');
      } catch {
        setError('metadata');
      }
    }

    start();

    return () => {
      cancelled = true;
    };
  }, [stream, options.mediaId, options.subtitleUrl, options.subtitleLang, setLastStream]);

  // Buffering overlay data (docs §3.2) — download speed/peers/percent.
  useEffect(() => {
    if (!torrentId) return;
    const interval = setInterval(() => {
      TorrentModule.getStatus(torrentId)
        .then(status => setTorrentStatus({ downloadSpeed: status.downloadSpeed, peers: status.peers, progress: status.progress }))
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
  // streams that never start downloading anything.
  useEffect(() => {
    if (!torrentId) return;
    const timeout = setTimeout(() => {
      if ((torrentStatus?.progress ?? 0) === 0 && (torrentStatus?.peers ?? 0) === 0 && !playerState?.isPlaying) {
        setError('noPeers');
      }
    }, NO_PEERS_TIMEOUT_MS);
    return () => clearTimeout(timeout);
  }, [torrentId, torrentStatus, playerState]);

  // ExoPlayer-reported playback failure (bad source, unsupported codec, etc.)
  // surfaces as the Error overlay too (docs §7) — driven by the native
  // PlaybackException itself, not a JS-side guess.
  useEffect(() => {
    if (playerState?.error) {
      setError(prev => prev ?? 'playback');
    }
  }, [playerState?.error]);

  // Leaving the Player pauses (not stops/removes) the torrent — docs §3.2's
  // background lifecycle decision. App-background detection is item 6's job;
  // this covers navigating away, which is the common case today.
  useEffect(() => {
    return () => {
      if (torrentId) TorrentModule.pause(torrentId);
      PlayerModule.stop();
    };
  }, [torrentId]);

  return { torrentId, torrentStatus, playerState, error };
}
