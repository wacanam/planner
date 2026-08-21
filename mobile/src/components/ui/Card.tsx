// mobile/src/components/ui/Card.tsx
import React from 'react';
import { StyleSheet, TouchableOpacity, View, type ViewProps } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { triggerHaptic } from '@/lib/sound';

interface CardProps extends ViewProps {
  onPress?: () => void;
  variant?: 'default' | 'elevated' | 'outline' | 'flat';
}

export function Card({ children, onPress, variant = 'default', style, ...rest }: CardProps) {
  const { colors, radius, spacing, isDark } = useTheme();

  const handlePress = () => {
    if (!onPress) return;
    triggerHaptic('light');
    onPress();
  };

  const cardStyle = [
    styles.base,
    {
      backgroundColor: colors.card,
      borderColor: colors.border,
      borderRadius: radius.lg,
      padding: spacing.md,
    },
    variant === 'outline' && { borderWidth: 1 },
    variant === 'default' && {
      borderWidth: 1,
      shadowColor: isDark ? '#000' : '#888',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: isDark ? 0.3 : 0.06,
      shadowRadius: 4,
      elevation: 2,
    },
    variant === 'elevated' && {
      borderWidth: 0,
      shadowColor: isDark ? '#000' : '#666',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: isDark ? 0.4 : 0.1,
      shadowRadius: 8,
      elevation: 4,
    },
    style,
  ];

  if (onPress) {
    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={handlePress}
        style={cardStyle}
        {...(rest as any)}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return (
    <View style={cardStyle} {...rest}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    overflow: 'hidden',
  },
});
