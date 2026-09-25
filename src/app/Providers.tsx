import React from 'react';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { queryClient } from '../lib/query-client';
import { queryPersister } from '../lib/query-persister';
import { ThemeProvider } from '../context/ThemeContext';
import { LibraryProvider } from '../context/LibraryContext';
import { AddonsProvider } from '../context/AddonsContext';

const persistOptions = {
  persister: queryPersister,
  maxAge: 7 * 24 * 60 * 60_000,
};

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <GestureHandlerRootView style={styles.fill}>
      <SafeAreaProvider>
        <PersistQueryClientProvider client={queryClient} persistOptions={persistOptions}>
          <ThemeProvider>
            <LibraryProvider>
              <AddonsProvider>{children}</AddonsProvider>
            </LibraryProvider>
          </ThemeProvider>
        </PersistQueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
