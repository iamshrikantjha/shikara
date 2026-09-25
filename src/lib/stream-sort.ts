import type { Stream, StreamQuality, StreamSortOption } from './types';

// Sort is a client-side UI concern applied on top of already-fetched,
// already-combined stream results — mirrors media-sort.ts's role for catalogs.
const QUALITY_RANK: Record<StreamQuality, number> = {
  '2160p': 4,
  '1080p': 3,
  '720p': 2,
  '480p': 1,
  sd: 0,
};

function qualityRank(stream: Stream): number {
  return stream.quality ? QUALITY_RANK[stream.quality] : -1;
}

// Unknown seeder counts sort last, never treated as equal to zero seeders
// (docs/03-Phase3-Torrent-Streaming.md §3.1's health-indicator "unknown" state
// applies to sorting too).
function seeders(stream: Stream): number {
  return stream.behaviorHints.seeders ?? -1;
}

// "Best Match" formula (docs/03 §3.1): preferred-quality match first (if the
// user set one), then quality desc, then seeders desc, then size desc as a
// final tiebreak.
function bestMatchCompare(a: Stream, b: Stream, preferredQuality: StreamQuality | 'Auto' | undefined): number {
  if (preferredQuality && preferredQuality !== 'Auto') {
    const aMatch = a.quality === preferredQuality ? 1 : 0;
    const bMatch = b.quality === preferredQuality ? 1 : 0;
    if (aMatch !== bMatch) return bMatch - aMatch;
  }
  if (qualityRank(b) !== qualityRank(a)) return qualityRank(b) - qualityRank(a);
  if (seeders(b) !== seeders(a)) return seeders(b) - seeders(a);
  return (b.size ?? 0) - (a.size ?? 0);
}

export function sortStreams(
  streams: Stream[],
  sort: StreamSortOption | undefined,
  preferredQuality?: StreamQuality | 'Auto',
): Stream[] {
  const copy = [...streams];
  switch (sort) {
    case 'quality':
      return copy.sort((a, b) => qualityRank(b) - qualityRank(a));
    case 'size':
      return copy.sort((a, b) => (a.size ?? 0) - (b.size ?? 0)); // small -> large, per the doc's sort label
    case 'seeders':
      return copy.sort((a, b) => seeders(b) - seeders(a));
    case 'bestMatch':
    default:
      return copy.sort((a, b) => bestMatchCompare(a, b, preferredQuality));
  }
}
