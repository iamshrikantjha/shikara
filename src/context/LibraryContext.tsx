import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { LibraryItem, MediaType, WatchHistoryItem } from '../lib/types';

interface LibraryContextValue {
  items: LibraryItem[];
  isInLibrary: (mediaId: string) => boolean;
  addToLibrary: (mediaId: string, type: MediaType) => void;
  removeFromLibrary: (mediaId: string) => void;
  history: WatchHistoryItem[];
  removeFromHistory: (mediaId: string) => void;
  resetMockData: () => void;
}

const LibraryContext = createContext<LibraryContextValue | undefined>(undefined);

// Phase 1: in-memory only (resets on app restart, per 01-Phase1-UI-Navigation.md §10).
// Phase 2 swaps this for MMKV/SQLite-backed persistence without changing the API shape.
export function LibraryProvider({
  initialHistory,
  children,
}: {
  initialHistory: WatchHistoryItem[];
  children: React.ReactNode;
}) {
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [history, setHistory] = useState<WatchHistoryItem[]>(initialHistory);

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

  const resetMockData = useCallback(() => {
    setItems([]);
    setHistory(initialHistory);
  }, [initialHistory]);

  const value = useMemo(
    () => ({
      items,
      isInLibrary,
      addToLibrary,
      removeFromLibrary,
      history,
      removeFromHistory,
      resetMockData,
    }),
    [items, isInLibrary, addToLibrary, removeFromLibrary, history, removeFromHistory, resetMockData],
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
