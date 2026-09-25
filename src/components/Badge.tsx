import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { spacing, themeTokens } from '../styles/tokens';

export function Badge({ label }: { label: string }) {
  const { resolvedTheme } = useTheme();
  const t = themeTokens[resolvedTheme];
  return (
    <View style={[styles.base, { borderColor: t.border }]}>
      <Text style={styles.text}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 12,
  },
});
