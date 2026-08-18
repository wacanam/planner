// mobile/app/(tabs)/_layout.tsx
import { Tabs } from 'expo-router';
import { BookOpen, FolderOpen, Map as MapIcon, MoreHorizontal } from 'lucide-react-native';
import React from 'react';
import { Platform, StyleSheet } from 'react-native';
import { useTheme } from '@/context/ThemeContext';

export default function TabsLayout() {
  const { colors, typography } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.tabBarBackground,
          borderTopColor: colors.tabBarBorder,
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 86 : 64,
          paddingBottom: Platform.OS === 'ios' ? 26 : 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: colors.tabBarActive,
        tabBarInactiveTintColor: colors.tabBarInactive,
        tabBarLabelStyle: {
          fontSize: typography.xs,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="assignments"
        options={{
          title: 'Assignments',
          tabBarIcon: ({ color, size }) => <MapIcon size={size || 22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="territories"
        options={{
          title: 'Territories',
          tabBarIcon: ({ color, size }) => <FolderOpen size={size || 22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="records"
        options={{
          title: 'Records',
          tabBarIcon: ({ color, size }) => <BookOpen size={size || 22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'More',
          tabBarIcon: ({ color, size }) => <MoreHorizontal size={size || 22} color={color} />,
        }}
      />
    </Tabs>
  );
}
