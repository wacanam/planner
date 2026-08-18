// mobile/src/components/ui/Header.tsx
import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import React from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { triggerHaptic } from '@/lib/sound';

interface HeaderProps {
  title?: string;
  subtitle?: string;
  showBack?: boolean;
  onBackPress?: () => void;
  rightAction?: React.ReactNode;
}

export function Header({
  title,
  subtitle,
  showBack = false,
  onBackPress,
  rightAction,
}: HeaderProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, spacing, typography } = useTheme();

  const handleBack = () => {
    triggerHaptic('light');
    if (onBackPress) {
      onBackPress();
    } else {
      router.back();
    }
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.card,
          borderBottomColor: colors.border,
          paddingTop: Math.max(insets.top, spacing.sm),
          paddingHorizontal: spacing.md,
          paddingBottom: spacing.sm,
        },
      ]}
    >
      <View style={styles.contentRow}>
        <View style={styles.leftSection}>
          {showBack && (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleBack}
              style={[
                styles.backButton,
                {
                  backgroundColor: colors.muted,
                  marginRight: spacing.sm,
                },
              ]}
            >
              <ChevronLeft size={22} color={colors.foreground} />
            </TouchableOpacity>
          )}

          <View style={styles.titleContainer}>
            {title && (
              <Text
                numberOfLines={1}
                style={[
                  styles.title,
                  {
                    color: colors.foreground,
                    fontSize: typography.lg,
                  },
                ]}
              >
                {title}
              </Text>
            )}
            {subtitle && (
              <Text
                numberOfLines={1}
                style={[
                  styles.subtitle,
                  {
                    color: colors.mutedForeground,
                    fontSize: typography.xs,
                  },
                ]}
              >
                {subtitle}
              </Text>
            )}
          </View>
        </View>

        {rightAction && <View style={styles.rightSection}>{rightAction}</View>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontWeight: '700',
  },
  subtitle: {
    marginTop: 1,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
