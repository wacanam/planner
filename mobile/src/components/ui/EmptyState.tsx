// mobile/src/components/ui/EmptyState.tsx
import type React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { Button } from './Button';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  actionTitle?: string;
  onActionPress?: () => void;
}

export function EmptyState({
  icon,
  title,
  description,
  actionTitle,
  onActionPress,
}: EmptyStateProps) {
  const { colors, spacing, typography } = useTheme();

  return (
    <View style={[styles.container, { padding: spacing.xxl }]}>
      {icon && <View style={[styles.iconContainer, { marginBottom: spacing.md }]}>{icon}</View>}

      <Text
        style={[
          styles.title,
          {
            color: colors.foreground,
            fontSize: typography.lg,
            marginBottom: spacing.xs,
          },
        ]}
      >
        {title}
      </Text>

      {description && (
        <Text
          style={[
            styles.description,
            {
              color: colors.mutedForeground,
              fontSize: typography.sm,
              marginBottom: actionTitle ? spacing.lg : 0,
            },
          ]}
        >
          {description}
        </Text>
      )}

      {actionTitle && onActionPress && (
        <Button title={actionTitle} onPress={onActionPress} size="md" />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  iconContainer: {
    opacity: 0.8,
  },
  title: {
    fontWeight: '700',
    textAlign: 'center',
  },
  description: {
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
  },
});
