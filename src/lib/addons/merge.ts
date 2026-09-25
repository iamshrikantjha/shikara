import type { InstalledAddon, Media } from '../types';

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

export function unionGenres(genreLists: (string[] | undefined)[]): string[] {
  const set = new Set<string>();
  for (const list of genreLists) {
    for (const g of list ?? []) {
      set.add(g);
    }
  }
  return Array.from(set).sort();
}
