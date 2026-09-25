import React from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { spacing, themeTokens } from '../styles/tokens';

interface SearchInputProps {
  value: string;
  onChangeText: (value: string) => void;
  onClear: () => void;
  autoFocus?: boolean;
  placeholder?: string;
}

export function SearchInput({ value, onChangeText, onClear, autoFocus, placeholder }: SearchInputProps) {
  const { resolvedTheme } = useTheme();
  const t = themeTokens[resolvedTheme];
  return (
    <View style={[styles.container, { borderColor: t.border }]}>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        autoFocus={autoFocus}
        placeholder={placeholder ?? 'Search movies and series'}
        style={styles.input}
      />
      {value.length > 0 && (
        <Pressable onPress={onClear} hitSlop={8}>
          <Text>✕</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: spacing.sm,
    margin: spacing.md,
  },
  input: {
    flex: 1,
    paddingVertical: spacing.sm,
  },
});
