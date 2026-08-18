// mobile/app/(tabs)/territories/_layout.tsx
import { Stack } from 'expo-router';
import React from 'react';
import { useTheme } from '@/context/ThemeContext';

export default function TerritoriesLayout() {
  const { colors } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="[territoryId]" />
      <Stack.Screen name="create" options={{ presentation: 'modal' }} />
    </Stack>
  );
}
