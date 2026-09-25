import { TorrentModule } from '../../lib/native/TorrentModule';

// Only one torrent session is kept paused-and-resumable at a time
// (docs/03-Phase3-Torrent-Streaming.md §3.2) — starting a new stream stops
// and removes whatever was previously paused, rather than accumulating
// paused sessions every time the user backs out of a title.
let pausedTorrentId: string | null = null;

export function notePlayingTorrent(torrentId: string): void {
  if (pausedTorrentId && pausedTorrentId !== torrentId) {
    TorrentModule.stop(pausedTorrentId);
    TorrentModule.remove(pausedTorrentId);
  }
  pausedTorrentId = null;
}

export function notePausedTorrent(torrentId: string): void {
  pausedTorrentId = torrentId;
}

export function noteResumedTorrent(torrentId: string): void {
  if (pausedTorrentId === torrentId) {
    pausedTorrentId = null;
  }
}
