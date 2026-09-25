// Structural tokens only — spacing + the minimal light/dark values needed for
// basic layout to read correctly. This is NOT a design system; per the Phase 1
// doc's styling constraint, visual design/theming is deferred until the atomic
// design system pass. Do not add brand colors, typography scales, or shadows here.

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const radii = {
  sm: 4,
  md: 8,
};

export interface ThemeTokens {
  border: string;
  skeleton: string;
  muted: string;
  overlay: string;
}

export const themeTokens: Record<'light' | 'dark', ThemeTokens> = {
  light: {
    border: '#d0d0d0',
    skeleton: '#e5e5e5',
    muted: '#666666',
    overlay: 'rgba(0,0,0,0.5)',
  },
  dark: {
    border: '#3a3a3a',
    skeleton: '#2a2a2a',
    muted: '#aaaaaa',
    overlay: 'rgba(0,0,0,0.6)',
  },
};

export const breakpoints = {
  tablet: 600,
  desktop: 1024,
};

export function columnsForWidth(width: number, isTV: boolean): number {
  if (isTV) {
    return 6;
  }
  if (width >= breakpoints.desktop) {
    return 6;
  }
  if (width >= breakpoints.tablet) {
    return 4;
  }
  return 2;
}
