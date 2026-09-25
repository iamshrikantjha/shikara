import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { AddonCapability, InstalledAddon } from '../lib/types';
import { supportsCapability } from '../lib/types';
import { fetchManifest } from '../lib/addons/manifest';
import { CINEMETA_MANIFEST_URL, DEFAULT_SEED_ADDON_URLS, defaultInstalledAddons } from '../lib/addons/defaults';
import { getJSON, setJSON, StorageKeys } from '../lib/storage';

interface AddonsContextValue {
  addons: InstalledAddon[];
  supports: (capability: AddonCapability) => InstalledAddon[];
  installAddon: (manifestUrl: string) => Promise<{ ok: boolean; error?: string }>;
  installing: boolean;
  toggleAddon: (id: string) => void;
  removeAddon: (id: string) => void;
  moveAddon: (id: string, direction: 'up' | 'down') => void;
}

const AddonsContext = createContext<AddonsContextValue | undefined>(undefined);

function addonId(addon: InstalledAddon): string {
  return addon.manifest.id;
}

export function AddonsProvider({ children }: { children: React.ReactNode }) {
  const [addons, setAddons] = useState<InstalledAddon[]>(() =>
    getJSON(StorageKeys.addons, defaultInstalledAddons()),
  );
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    setJSON(StorageKeys.addons, addons);
  }, [addons]);

  // Background-refresh Cinemeta's manifest on startup so the offline fallback
  // (defaults.ts) gets replaced by the real thing as soon as network is available,
  // without blocking the shell (PRD.md §16).
  useEffect(() => {
    fetchManifest(CINEMETA_MANIFEST_URL)
      .then(manifest => {
        setAddons(prev =>
          prev.map(a => (a.manifestUrl === CINEMETA_MANIFEST_URL ? { ...a, manifest } : a)),
        );
      })
      .catch(() => {
        // Offline or Cinemeta unreachable — keep the fallback manifest, no error surfaced.
      });
  }, []);

  // One-time preload of a curated testing addon set (defaults.ts) — gated by
  // a persisted flag so a user who removes one never has it silently
  // reappear on a later launch. Best-effort per addon: an unreachable URL
  // right now simply doesn't get added, same as any failed manual install.
  useEffect(() => {
    if (getJSON(StorageKeys.addonsSeeded, false)) {
      return;
    }
    setJSON(StorageKeys.addonsSeeded, true);

    DEFAULT_SEED_ADDON_URLS.forEach(url => {
      fetchManifest(url)
        .then(manifest => {
          setAddons(prev => {
            if (prev.some(a => a.manifestUrl === url || a.manifest.id === manifest.id)) {
              return prev;
            }
            return [...prev, { manifestUrl: url, manifest, enabled: true }];
          });
        })
        .catch(() => {
          // Unreachable right now — best-effort seeding, no error surfaced.
        });
    });
  }, []);

  const supports = useCallback(
    (capability: AddonCapability) => addons.filter(a => supportsCapability(a, capability)),
    [addons],
  );

  const installAddon = useCallback(
    async (manifestUrl: string) => {
      const trimmed = manifestUrl.trim();
      if (!trimmed) {
        return { ok: false, error: "Enter a manifest URL to install an addon." };
      }
      if (addons.some(a => a.manifestUrl === trimmed)) {
        return { ok: false, error: 'This addon is already installed.' };
      }
      setInstalling(true);
      try {
        const manifest = await fetchManifest(trimmed);
        // The URL check above only catches an exact duplicate string — the
        // same addon reachable via two different URL forms (trailing slash,
        // http/https, a regenerated Comet/MediaFusion config URL) is only
        // detectable once we know its declared id.
        if (addons.some(a => a.manifest.id === manifest.id)) {
          return { ok: false, error: 'This addon is already installed.' };
        }
        setAddons(prev => [...prev, { manifestUrl: trimmed, manifest, enabled: true }]);
        return { ok: true };
      } catch (err) {
        return { ok: false, error: (err as Error).message || 'Could not install this addon.' };
      } finally {
        setInstalling(false);
      }
    },
    [addons],
  );

  const toggleAddon = useCallback((id: string) => {
    setAddons(prev => prev.map(a => (addonId(a) === id ? { ...a, enabled: !a.enabled } : a)));
  }, []);

  const removeAddon = useCallback((id: string) => {
    setAddons(prev => prev.filter(a => addonId(a) !== id));
  }, []);

  const moveAddon = useCallback((id: string, direction: 'up' | 'down') => {
    setAddons(prev => {
      const index = prev.findIndex(a => addonId(a) === id);
      if (index === -1) {
        return prev;
      }
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= prev.length) {
        return prev;
      }
      const next = [...prev];
      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ addons, supports, installAddon, installing, toggleAddon, removeAddon, moveAddon }),
    [addons, supports, installAddon, installing, toggleAddon, removeAddon, moveAddon],
  );

  return <AddonsContext.Provider value={value}>{children}</AddonsContext.Provider>;
}

export function useAddons() {
  const ctx = useContext(AddonsContext);
  if (!ctx) {
    throw new Error('useAddons must be used within an AddonsProvider');
  }
  return ctx;
}
