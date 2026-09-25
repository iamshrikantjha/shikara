import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { setSimulateError } from '../lib/mock-data/mockApi';

// Phase 1 only — removed entirely once Phase 2 wires real addon failure modes
// (01-Phase1-UI-Navigation.md §3.11 "Developer" section).
interface DevToggleContextValue {
  simulateError: boolean;
  setSimulateErrorEnabled: (value: boolean) => void;
}

const DevToggleContext = createContext<DevToggleContextValue | undefined>(undefined);

export function DevToggleProvider({ children }: { children: React.ReactNode }) {
  const [simulateError, setSimulateErrorState] = useState(false);
  const queryClient = useQueryClient();

  const setSimulateErrorEnabled = useCallback(
    (value: boolean) => {
      setSimulateError(value);
      setSimulateErrorState(value);
      queryClient.invalidateQueries();
    },
    [queryClient],
  );

  const value = useMemo(
    () => ({ simulateError, setSimulateErrorEnabled }),
    [simulateError, setSimulateErrorEnabled],
  );

  return <DevToggleContext.Provider value={value}>{children}</DevToggleContext.Provider>;
}

export function useDevToggle() {
  const ctx = useContext(DevToggleContext);
  if (!ctx) {
    throw new Error('useDevToggle must be used within a DevToggleProvider');
  }
  return ctx;
}
