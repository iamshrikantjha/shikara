import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { StreamQuality } from '../lib/types';
import { getJSON, setJSON, StorageKeys } from '../lib/storage';

export type SubtitleLanguage = 'off' | 'en' | 'hi' | 'es' | 'fr';
export type AudioLanguage = 'auto' | 'en' | 'hi' | 'es' | 'fr';
export type PreferredQuality = StreamQuality | 'Auto';
export type DownloadMode = 'wifiOnly' | 'wifiAndMobile';

export interface PlaybackSettings {
  subtitleLanguage: SubtitleLanguage;
  audioLanguage: AudioLanguage;
  autoplayNextEpisode: boolean;
  preferredQuality: PreferredQuality;
}

export interface TorrentSettings {
  maxPeers: number;
  downloadMode: DownloadMode;
  maxCacheSizeGB: number;
}

interface StoredSettings {
  playback: PlaybackSettings;
  torrent: TorrentSettings;
}

const DEFAULT_SETTINGS: StoredSettings = {
  playback: {
    subtitleLanguage: 'off',
    audioLanguage: 'auto',
    autoplayNextEpisode: false,
    preferredQuality: 'Auto',
  },
  torrent: {
    maxPeers: 50,
    downloadMode: 'wifiOnly',
    maxCacheSizeGB: 5,
  },
};

interface SettingsContextValue {
  playback: PlaybackSettings;
  torrent: TorrentSettings;
  setSubtitleLanguage: (lang: SubtitleLanguage) => void;
  setAudioLanguage: (lang: AudioLanguage) => void;
  setAutoplayNextEpisode: (value: boolean) => void;
  setPreferredQuality: (quality: PreferredQuality) => void;
  setMaxPeers: (value: number) => void;
  setDownloadMode: (mode: DownloadMode) => void;
  setMaxCacheSizeGB: (value: number) => void;
  clearingCache: boolean;
  clearStreamingCache: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextValue | undefined>(undefined);

// Playback + Torrent preferences (docs/03-Phase3-Torrent-Streaming.md §3.3) —
// device-only persisted state, same MMKV pattern as Library/Addons, no
// account/sync (project-wide constraint, all phases).
export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<StoredSettings>(() => getJSON(StorageKeys.settings, DEFAULT_SETTINGS));
  const [clearingCache, setClearingCache] = useState(false);

  useEffect(() => {
    setJSON(StorageKeys.settings, settings);
  }, [settings]);

  const setSubtitleLanguage = useCallback((subtitleLanguage: SubtitleLanguage) => {
    setSettings(prev => ({ ...prev, playback: { ...prev.playback, subtitleLanguage } }));
  }, []);

  const setAudioLanguage = useCallback((audioLanguage: AudioLanguage) => {
    setSettings(prev => ({ ...prev, playback: { ...prev.playback, audioLanguage } }));
  }, []);

  const setAutoplayNextEpisode = useCallback((autoplayNextEpisode: boolean) => {
    setSettings(prev => ({ ...prev, playback: { ...prev.playback, autoplayNextEpisode } }));
  }, []);

  const setPreferredQuality = useCallback((preferredQuality: PreferredQuality) => {
    setSettings(prev => ({ ...prev, playback: { ...prev.playback, preferredQuality } }));
  }, []);

  const setMaxPeers = useCallback((maxPeers: number) => {
    setSettings(prev => ({ ...prev, torrent: { ...prev.torrent, maxPeers } }));
  }, []);

  const setDownloadMode = useCallback((downloadMode: DownloadMode) => {
    setSettings(prev => ({ ...prev, torrent: { ...prev.torrent, downloadMode } }));
  }, []);

  const setMaxCacheSizeGB = useCallback((maxCacheSizeGB: number) => {
    setSettings(prev => ({ ...prev, torrent: { ...prev.torrent, maxCacheSizeGB } }));
  }, []);

  // No native torrent module exists yet (docs/03 §5) — there is no real
  // streaming buffer on disk to clear. This is a placeholder that will call
  // into TorrentModule's cache-eviction once that lands; kept async so the
  // eventual native call doesn't change this function's shape.
  const clearStreamingCache = useCallback(async () => {
    setClearingCache(true);
    try {
      await Promise.resolve();
    } finally {
      setClearingCache(false);
    }
  }, []);

  const value = useMemo(
    () => ({
      playback: settings.playback,
      torrent: settings.torrent,
      setSubtitleLanguage,
      setAudioLanguage,
      setAutoplayNextEpisode,
      setPreferredQuality,
      setMaxPeers,
      setDownloadMode,
      setMaxCacheSizeGB,
      clearingCache,
      clearStreamingCache,
    }),
    [
      settings,
      setSubtitleLanguage,
      setAudioLanguage,
      setAutoplayNextEpisode,
      setPreferredQuality,
      setMaxPeers,
      setDownloadMode,
      setMaxCacheSizeGB,
      clearingCache,
      clearStreamingCache,
    ],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return ctx;
}
