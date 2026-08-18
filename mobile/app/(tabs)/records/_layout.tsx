// mobile/app/(tabs)/records/_layout.tsx
import { Stack } from 'expo-router';
import React from 'react';
import { useTheme } from '@/context/ThemeContext';

export default function RecordsLayout() {
  const { colors } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="household/[id]" />
      <Stack.Screen name="log-visit" options={{ presentation: 'modal' }} />
    </Stack>
  );
}
