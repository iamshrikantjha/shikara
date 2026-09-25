import type { AddonCapability, AddonCatalogEntry, InstalledAddon, MediaType } from '../types';
import { supportsCapability } from '../types';

// The one place every hook asks "which installed addons can answer this?" —
// never by addon name/id, only by declared capability
// (docs/02-Phase2-API-Integration.md §2.3).
//
// The optional `mediaType` parameter further filters to addons that declare the
// given type in manifest.types — prevents movie-only addons from being queried
// for series streams and vice versa, cutting unnecessary network requests.
export function addonsSupporting(
  addons: InstalledAddon[],
  capability: AddonCapability,
  mediaType?: MediaType,
): InstalledAddon[] {
  return addons.filter(a => {
    if (!supportsCapability(a, capability)) return false;
    if (mediaType && a.manifest.types.length > 0 && !a.manifest.types.includes(mediaType)) return false;
    return true;
  });
}

// An addon's own declared catalog for a given type — never assume every addon
// calls it "top". Picks the first declared catalog matching the type.
export function catalogFor(addon: InstalledAddon, type: MediaType): AddonCatalogEntry | undefined {
  return addon.manifest.catalogs.find(c => c.type === type);
}

export function catalogSupportsExtra(catalog: AddonCatalogEntry, extraName: string): boolean {
  return catalog.extraSupported.includes(extraName);
}
