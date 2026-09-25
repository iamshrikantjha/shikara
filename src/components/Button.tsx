import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { spacing } from '../styles/tokens';
import { useTheme } from '../context/ThemeContext';
import { themeTokens } from '../styles/tokens';

interface ButtonProps {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary';
}

export function Button({ label, onPress, disabled, variant = 'primary' }: ButtonProps) {
  const { resolvedTheme } = useTheme();
  const t = themeTokens[resolvedTheme];
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        { borderColor: t.border, opacity: disabled ? 0.4 : pressed ? 0.6 : 1 },
        variant === 'secondary' && styles.secondary,
      ]}
    >
      <Text>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondary: {
    borderStyle: 'dashed',
  },
});
