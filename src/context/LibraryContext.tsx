import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { LibraryItem, MediaType, WatchHistoryItem } from '../lib/types';
import { getJSON, setJSON, StorageKeys } from '../lib/storage';

interface LibraryContextValue {
  items: LibraryItem[];
  isInLibrary: (mediaId: string) => boolean;
  addToLibrary: (mediaId: string, type: MediaType) => void;
  removeFromLibrary: (mediaId: string) => void;
  history: WatchHistoryItem[];
  removeFromHistory: (mediaId: string) => void;
  resetLocalData: () => void;
}

const LibraryContext = createContext<LibraryContextValue | undefined>(undefined);

// Device-only persistence via MMKV — no account, no sync, ever
// (docs/02-Phase2-API-Integration.md §1 "Explicitly not part of this project").
export function LibraryProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<LibraryItem[]>(() => getJSON(StorageKeys.library, []));
  const [history, setHistory] = useState<WatchHistoryItem[]>(() => getJSON(StorageKeys.history, []));

  useEffect(() => {
    setJSON(StorageKeys.library, items);
  }, [items]);

  useEffect(() => {
    setJSON(StorageKeys.history, history);
  }, [history]);

  const isInLibrary = useCallback(
    (mediaId: string) => items.some(item => item.mediaId === mediaId),
    [items],
  );

  const addToLibrary = useCallback((mediaId: string, type: MediaType) => {
    setItems(prev =>
      prev.some(item => item.mediaId === mediaId)
        ? prev
        : [...prev, { mediaId, type, addedAt: new Date().toISOString() }],
    );
  }, []);

  const removeFromLibrary = useCallback((mediaId: string) => {
    setItems(prev => prev.filter(item => item.mediaId !== mediaId));
  }, []);

  const removeFromHistory = useCallback((mediaId: string) => {
    setHistory(prev => prev.filter(item => item.mediaId !== mediaId));
  }, []);

  const resetLocalData = useCallback(() => {
    setItems([]);
    setHistory([]);
  }, []);

  const value = useMemo(
    () => ({
      items,
      isInLibrary,
      addToLibrary,
      removeFromLibrary,
      history,
      removeFromHistory,
      resetLocalData,
    }),
    [items, isInLibrary, addToLibrary, removeFromLibrary, history, removeFromHistory, resetLocalData],
  );

  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>;
}

export function useLibrary() {
  const ctx = useContext(LibraryContext);
  if (!ctx) {
    throw new Error('useLibrary must be used within a LibraryProvider');
  }
  return ctx;
}
