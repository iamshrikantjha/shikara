import React from 'react';
import { Platform, Pressable, StyleProp, ViewStyle } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { themeTokens } from '../styles/tokens';

interface FocusableProps {
  onPress?: () => void;
  onLongPress?: () => void;
  onFocus?: () => void;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  hasTVPreferredFocus?: boolean;
}

// Basic cross-platform focus wrapper: real per-platform focus-ring/D-pad tuning
// (01-Phase1-UI-Navigation.md §7 / §11.3's Component.tv.tsx guidance) is a
// follow-up pass — this gives every interactive element one consistent place
// to add that behavior later without touching call sites. `onFocus` is also
// how cards trigger the on-focus meta prefetch from 02-Phase2-API-Integration.md §7.3.
export function Focusable({ onPress, onLongPress, onFocus, children, style, hasTVPreferredFocus }: FocusableProps) {
  const { resolvedTheme } = useTheme();
  const t = themeTokens[resolvedTheme];
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      onFocus={onFocus}
      hasTVPreferredFocus={Platform.isTV ? hasTVPreferredFocus : undefined}
      style={({ pressed, focused }: any) => [
        style,
        (pressed || focused) && { borderWidth: 2, borderColor: t.border },
      ]}
    >
      {children}
    </Pressable>
  );
}
