import type { InstalledAddon, Media, Stream, SubtitleTrack } from '../types';

export interface SettledAddonResults<T> {
  results: { addon: InstalledAddon; value: T }[];
  failedAddons: InstalledAddon[];
}

// One dead/slow addon must never block the others
// (docs/02-Phase2-API-Integration.md §7.3 / §9) — every addon is queried
// independently and failures are isolated per-addon.
export async function settleAcrossAddons<T>(
  addons: InstalledAddon[],
  fn: (addon: InstalledAddon) => Promise<T>,
): Promise<SettledAddonResults<T>> {
  const settled = await Promise.allSettled(addons.map(addon => fn(addon).then(value => ({ addon, value }))));

  const results: { addon: InstalledAddon; value: T }[] = [];
  const failedAddons: InstalledAddon[] = [];

  settled.forEach((outcome, index) => {
    if (outcome.status === 'fulfilled') {
      results.push(outcome.value);
    } else {
      failedAddons.push(addons[index]);
    }
  });

  return { results, failedAddons };
}

// Merge catalog/meta results from multiple addons: de-duplicate by canonical
// id, higher-priority addon (earlier in the Addon Manager's ordered list, so
// earlier in `resultsInPriorityOrder`) wins on conflict (docs §9).
export function mergeMediaLists(resultsInPriorityOrder: Media[][]): Media[] {
  const seen = new Map<string, Media>();
  for (const list of resultsInPriorityOrder) {
    for (const item of list) {
      if (!seen.has(item.id)) {
        seen.set(item.id, item);
      }
    }
  }
  return Array.from(seen.values());
}

// Streams are NOT merged like catalog/meta: multiple sources returning the
// same title is the entire point of the Streams screen, so results are only
// concatenated, never collapsed by id (docs/03-Phase3-Torrent-Streaming.md
// §4.1.3 — deliberately not reusing mergeMediaLists above).
export function combineStreamResults(resultsInPriorityOrder: Stream[][]): Stream[] {
  return resultsInPriorityOrder.flat();
}

// Subtitle tracks dedupe only on exact duplicates (same addon + language +
// url) — distinct releases/syncs in the same language must both stay
// selectable (docs/03 §3.2), unlike stream results this still has one
// collapsing pass since a genuine duplicate provides no extra choice.
export function mergeSubtitleTracks(tracksInPriorityOrder: SubtitleTrack[][]): SubtitleTrack[] {
  const seen = new Set<string>();
  const result: SubtitleTrack[] = [];
  for (const list of tracksInPriorityOrder) {
    for (const track of list) {
      const key = `${track.source}:${track.lang}:${track.url}`;
      if (!seen.has(key)) {
        seen.add(key);
        result.push(track);
      }
    }
  }
  return result;
}

export function unionGenres(genreLists: (string[] | undefined)[]): string[] {
  const set = new Set<string>();
  for (const list of genreLists) {
    for (const g of list ?? []) {
      set.add(g);
    }
  }
  return Array.from(set).sort();
}
