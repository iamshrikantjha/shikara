import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { spacing, themeTokens } from '../styles/tokens';

interface LoadingSkeletonProps {
  count?: number;
  height?: number;
}

export function LoadingSkeleton({ count = 4, height = 48 }: LoadingSkeletonProps) {
  const { resolvedTheme } = useTheme();
  const t = themeTokens[resolvedTheme];
  return (
    <View style={styles.container}>
      {Array.from({ length: count }, (_, i) => (
        <View key={i} style={[styles.block, { height, backgroundColor: t.skeleton }]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.md,
  },
  block: {
    borderRadius: 4,
    marginBottom: spacing.sm,
  },
});
