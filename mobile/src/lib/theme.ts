// mobile/src/lib/theme.ts
// Pastel Design System tokens for Kanataran Mobile

export interface ThemeColors {
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  accent: string;
  accentForeground: string;
  muted: string;
  mutedForeground: string;
  border: string;
  input: string;
  destructive: string;
  destructiveForeground: string;
  success: string;
  successForeground: string;
  warning: string;
  warningForeground: string;
  tabBarBackground: string;
  tabBarBorder: string;
  tabBarActive: string;
  tabBarInactive: string;
}

export const pastelLightColors: ThemeColors = {
  background: '#F5F3F0',
  foreground: '#2D2D2D',
  card: '#FFFFFF',
  cardForeground: '#2D2D2D',
  primary: '#6B9ECC',
  primaryForeground: '#FFFFFF',
  secondary: '#E8B4D4',
  secondaryForeground: '#2D2D2D',
  accent: '#A8D9BA',
  accentForeground: '#2D2D2D',
  muted: '#E8E6E3',
  mutedForeground: '#9B9B9B',
  border: '#E0DDD9',
  input: '#E0DDD9',
  destructive: '#DC2626',
  destructiveForeground: '#FFFFFF',
  success: '#16A34A',
  successForeground: '#FFFFFF',
  warning: '#D97706',
  warningForeground: '#FFFFFF',
  tabBarBackground: '#FFFFFF',
  tabBarBorder: '#E0DDD9',
  tabBarActive: '#6B9ECC',
  tabBarInactive: '#9B9B9B',
};

export const pastelDarkColors: ThemeColors = {
  background: '#1A1A1A',
  foreground: '#F0F0F0',
  card: '#242424',
  cardForeground: '#F0F0F0',
  primary: '#4A7BA7',
  primaryForeground: '#F0F0F0',
  secondary: '#C7889F',
  secondaryForeground: '#F0F0F0',
  accent: '#7FB39F',
  accentForeground: '#F0F0F0',
  muted: '#2A2A2A',
  mutedForeground: '#707070',
  border: '#333333',
  input: '#333333',
  destructive: '#EF4444',
  destructiveForeground: '#FFFFFF',
  success: '#22C55E',
  successForeground: '#FFFFFF',
  warning: '#F59E0B',
  warningForeground: '#FFFFFF',
  tabBarBackground: '#242424',
  tabBarBorder: '#333333',
  tabBarActive: '#4A7BA7',
  tabBarInactive: '#707070',
};

export const radius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  round: 9999,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const typography = {
  xs: 11,
  sm: 13,
  base: 15,
  md: 16,
  lg: 18,
  xl: 20,
  xxl: 24,
  title: 28,
};
