import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { AddonCapability, InstalledAddon } from '../lib/types';
import { supportsCapability } from '../lib/types';

// Phase 1 seed data — mirrors the real default (Cinemeta) and reference stream
// addon (Torrentio) named in 02/03-Phase*.md, but nothing here makes a real
// network request yet: "Install" only validates the URL isn't empty.
const SEED_ADDONS: InstalledAddon[] = [
  {
    id: 'com.linvo.cinemeta',
    name: 'Cinemeta',
    version: '1.4.0',
    manifestUrl: 'https://v3-cinemeta.strem.io/manifest.json',
    capabilities: ['catalog', 'meta'],
    enabled: true,
  },
  {
    id: 'torrentio',
    name: 'Torrentio',
    version: '0.0.14',
    manifestUrl: 'https://torrentio.strem.io/manifest.json',
    capabilities: ['stream'],
    enabled: true,
  },
];

interface AddonsContextValue {
  addons: InstalledAddon[];
  supports: (capability: AddonCapability) => InstalledAddon[];
  installAddon: (manifestUrl: string) => { ok: boolean; error?: string };
  toggleAddon: (id: string) => void;
  removeAddon: (id: string) => void;
  moveAddon: (id: string, direction: 'up' | 'down') => void;
}

const AddonsContext = createContext<AddonsContextValue | undefined>(undefined);

export function AddonsProvider({ children }: { children: React.ReactNode }) {
  const [addons, setAddons] = useState<InstalledAddon[]>(SEED_ADDONS);

  const supports = useCallback(
    (capability: AddonCapability) => addons.filter(a => supportsCapability(a, capability)),
    [addons],
  );

  const installAddon = useCallback((manifestUrl: string) => {
    const trimmed = manifestUrl.trim();
    if (!trimmed) {
      return { ok: false, error: 'Enter a manifest URL to install an addon.' };
    }
    // Phase 1: mock install — no real GET/manifest validation yet (see
    // 02-Phase2-API-Integration.md §4 for the real install flow).
    const mockEntry: InstalledAddon = {
      id: `mock-${Date.now()}`,
      name: trimmed.split('/').filter(Boolean).slice(-2, -1)[0] || 'New Addon',
      version: '0.0.0',
      manifestUrl: trimmed,
      capabilities: ['catalog'],
      enabled: true,
    };
    setAddons(prev => [...prev, mockEntry]);
    return { ok: true };
  }, []);

  const toggleAddon = useCallback((id: string) => {
    setAddons(prev => prev.map(a => (a.id === id ? { ...a, enabled: !a.enabled } : a)));
  }, []);

  const removeAddon = useCallback((id: string) => {
    setAddons(prev => prev.filter(a => a.id !== id));
  }, []);

  const moveAddon = useCallback((id: string, direction: 'up' | 'down') => {
    setAddons(prev => {
      const index = prev.findIndex(a => a.id === id);
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
    () => ({ addons, supports, installAddon, toggleAddon, removeAddon, moveAddon }),
    [addons, supports, installAddon, toggleAddon, removeAddon, moveAddon],
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
