// mobile/src/components/ui/OfflineBanner.tsx
import { CloudOff } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/context/ThemeContext';

export function OfflineBanner() {
  const { colors, typography, spacing } = useTheme();
  const [isOffline, setIsOffline] = useState(false);

  // In React Native with Firestore persistentLocalCache, we can monitor connectivity
  // or show offline notification if disconnected

  if (!isOffline) return null;

  return (
    <View
      style={[
        styles.banner,
        {
          backgroundColor: colors.warning + '22',
          borderBottomColor: colors.warning + '55',
          paddingVertical: spacing.xs,
          paddingHorizontal: spacing.md,
        },
      ]}
    >
      <CloudOff size={14} color={colors.warning} style={{ marginRight: 6 }} />
      <Text
        style={[
          styles.text,
          {
            color: colors.warning,
            fontSize: typography.xs,
          },
        ]}
      >
        Offline Mode — Changes are saved locally and will sync when reconnected.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 1,
  },
  text: {
    fontWeight: '600',
  },
});
