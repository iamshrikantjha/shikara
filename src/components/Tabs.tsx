import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { spacing, themeTokens } from '../styles/tokens';

interface TabsProps {
  options: string[];
  selected: string;
  onSelect: (value: string) => void;
}

export function Tabs({ options, selected, onSelect }: TabsProps) {
  const { resolvedTheme } = useTheme();
  const t = themeTokens[resolvedTheme];
  return (
    <View style={styles.row}>
      {options.map(option => (
        <Pressable
          key={option}
          onPress={() => onSelect(option)}
          style={({ pressed }) => [
            styles.tab,
            {
              borderBottomWidth: option === selected ? 2 : 0,
              borderColor: t.border,
              opacity: pressed ? 0.6 : 1,
            },
          ]}
        >
          <Text>{option}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
  },
  tab: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
});
