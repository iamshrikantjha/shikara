import { QueryClient } from '@tanstack/react-query';
import type { AddonCapability, MediaType } from './types';

// docs/02-Phase2-API-Integration.md §7.2 — per-resource staleTime. Stream/subtitles
// rows are defined now for the convention even though nothing consumes them until Phase 3.
const STALE_TIME = {
  search: 60_000,
  meta: 24 * 60 * 60_000,
  catalog: 6 * 60 * 60_000,
  manifest: 7 * 24 * 60 * 60_000,
  stream: 5 * 60_000,
  subtitles: 24 * 60 * 60_000,
} as const;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: STALE_TIME.catalog,
      gcTime: 7 * 24 * 60 * 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// docs/02-Phase2-API-Integration.md §7.1 — every addon request is keyed
// identically: ['addon', addonId, resource, type, params]. One query per
// enabled addon, fanned out and merged by the caller — never one combined query.
export function addonQueryKey(
  addonId: string,
  resource: AddonCapability,
  type: MediaType,
  params: unknown,
) {
  return ['addon', addonId, resource, type, params] as const;
}

export const staleTimeFor = STALE_TIME;

// Shared key for Movie/Series `meta` lookups so the focus-triggered prefetch
// (docs §7.3) warms the exact cache entry useMovie/useSeries will read.
export function metaQueryKey(type: MediaType, id: string) {
  return ['meta', type, id] as const;
}
