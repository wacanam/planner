// mobile/app/(tabs)/more/_layout.tsx
import { Stack } from 'expo-router';
import React from 'react';
import { useTheme } from '@/context/ThemeContext';

export default function MoreLayout() {
  const { colors } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="reports" />
      <Stack.Screen name="groups" />
      <Stack.Screen name="members" />
      <Stack.Screen name="notifications" />
      <Stack.Screen name="settings" />
      <Stack.Screen name="profile" />
    </Stack>
  );
}
