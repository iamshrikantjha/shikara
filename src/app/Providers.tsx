import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '../lib/query-client';
import { MOCK_CONTINUE_WATCHING } from '../lib/mock-data/mockApi';
import { ThemeProvider } from '../context/ThemeContext';
import { LibraryProvider } from '../context/LibraryContext';
import { AddonsProvider } from '../context/AddonsContext';
import { DevToggleProvider } from '../context/DevToggleContext';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <DevToggleProvider>
              <LibraryProvider initialHistory={MOCK_CONTINUE_WATCHING}>
                <AddonsProvider>{children}</AddonsProvider>
              </LibraryProvider>
            </DevToggleProvider>
          </ThemeProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
