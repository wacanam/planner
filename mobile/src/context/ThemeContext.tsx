// mobile/src/context/ThemeContext.tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';
import {
  type ThemeColors,
  pastelDarkColors,
  pastelLightColors,
  radius,
  spacing,
  typography,
} from '@/lib/theme';

type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextType {
  mode: ThemeMode;
  isDark: boolean;
  colors: ThemeColors;
  radius: typeof radius;
  spacing: typeof spacing;
  typography: typeof typography;
  setMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
}

const THEME_STORAGE_KEY = 'planner_theme_mode';

const ThemeContext = createContext<ThemeContextType>({
  mode: 'system',
  isDark: false,
  colors: pastelLightColors,
  radius,
  spacing,
  typography,
  setMode: () => {},
  toggleTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemColorScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('system');

  useEffect(() => {
    AsyncStorage.getItem(THEME_STORAGE_KEY).then((stored) => {
      if (stored === 'light' || stored === 'dark' || stored === 'system') {
        setModeState(stored);
      }
    });
  }, []);

  const setMode = (newMode: ThemeMode) => {
    setModeState(newMode);
    AsyncStorage.setItem(THEME_STORAGE_KEY, newMode);
  };

  const isDark = mode === 'dark' || (mode === 'system' && systemColorScheme === 'dark');
  const colors = isDark ? pastelDarkColors : pastelLightColors;

  const toggleTheme = () => {
    setMode(isDark ? 'light' : 'dark');
  };

  return (
    <ThemeContext.Provider
      value={{
        mode,
        isDark,
        colors,
        radius,
        spacing,
        typography,
        setMode,
        toggleTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
