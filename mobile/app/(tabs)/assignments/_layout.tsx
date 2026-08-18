// mobile/app/(tabs)/assignments/_layout.tsx
import { Stack } from 'expo-router';
import React from 'react';
import { useTheme } from '@/context/ThemeContext';

export default function AssignmentsLayout() {
  const { colors } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="[assignmentId]" />
    </Stack>
  );
}
