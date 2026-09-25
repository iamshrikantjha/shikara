import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { spacing, themeTokens } from '../styles/tokens';

interface StepperProps {
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  unit?: string;
}

export function Stepper({ value, onChange, min, max, step = 1, unit }: StepperProps) {
  const { resolvedTheme } = useTheme();
  const t = themeTokens[resolvedTheme];

  function clamp(next: number): number {
    return Math.min(max, Math.max(min, next));
  }

  return (
    <View style={styles.row}>
      <Pressable
        onPress={() => onChange(clamp(value - step))}
        disabled={value <= min}
        style={[styles.button, { borderColor: t.border, opacity: value <= min ? 0.4 : 1 }]}
        hitSlop={8}
      >
        <Text>−</Text>
      </Pressable>
      <Text style={styles.value}>
        {value}
        {unit}
      </Text>
      <Pressable
        onPress={() => onChange(clamp(value + step))}
        disabled={value >= max}
        style={[styles.button, { borderColor: t.border, opacity: value >= max ? 0.4 : 1 }]}
        hitSlop={8}
      >
        <Text>+</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  button: {
    width: 28,
    height: 28,
    borderWidth: 1,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: {
    minWidth: 56,
    textAlign: 'center',
  },
});
