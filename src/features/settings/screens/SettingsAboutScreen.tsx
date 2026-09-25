import React from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { spacing } from '../../../styles/tokens';

export function SettingsAboutScreen() {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Shikara</Text>
      <Text>Version 0.0.1 — Phase 1 (UI &amp; Navigation)</Text>
      <Text style={styles.paragraph}>
        A cross-platform media discovery app built on a Stremio-style addon architecture — no
        backend, no account, no sign-in. Catalog and metadata addons arrive in Phase 2; stream and
        subtitle addons in Phase 3.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.md,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  paragraph: {
    marginTop: spacing.md,
  },
});
