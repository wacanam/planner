// mobile/src/components/ui/Button.tsx
import type React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  type TouchableOpacityProps,
  View,
} from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { triggerHaptic } from '@/lib/sound';

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'accent'
  | 'outline'
  | 'ghost'
  | 'destructive';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends TouchableOpacityProps {
  title?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
  children?: React.ReactNode;
}

export function Button({
  title,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  iconRight,
  children,
  style,
  onPress,
  ...rest
}: ButtonProps) {
  const { colors, radius, spacing, typography } = useTheme();

  const handlePress = (e: any) => {
    if (loading || disabled) return;
    triggerHaptic('light');
    onPress?.(e);
  };

  const getBackgroundColor = () => {
    if (disabled) return colors.muted;
    switch (variant) {
      case 'primary':
        return colors.primary;
      case 'secondary':
        return colors.secondary;
      case 'accent':
        return colors.accent;
      case 'destructive':
        return colors.destructive;
      case 'outline':
      case 'ghost':
        return 'transparent';
      default:
        return colors.primary;
    }
  };

  const getTextColor = () => {
    if (disabled) return colors.mutedForeground;
    switch (variant) {
      case 'primary':
        return colors.primaryForeground;
      case 'secondary':
        return colors.secondaryForeground;
      case 'accent':
        return colors.accentForeground;
      case 'destructive':
        return colors.destructiveForeground;
      case 'outline':
        return colors.foreground;
      case 'ghost':
        return colors.foreground;
      default:
        return colors.primaryForeground;
    }
  };

  const getBorderColor = () => {
    if (variant === 'outline') {
      return disabled ? colors.muted : colors.border;
    }
    return 'transparent';
  };

  const getPadding = () => {
    switch (size) {
      case 'sm':
        return { paddingVertical: 8, paddingHorizontal: 12 };
      case 'lg':
        return { paddingVertical: 14, paddingHorizontal: 20 };
      default:
        return { paddingVertical: 11, paddingHorizontal: 16 };
    }
  };

  const getFontSize = () => {
    switch (size) {
      case 'sm':
        return typography.sm;
      case 'lg':
        return typography.base;
      default:
        return typography.sm + 1;
    }
  };

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      disabled={disabled || loading}
      onPress={handlePress}
      style={[
        styles.base,
        {
          backgroundColor: getBackgroundColor(),
          borderColor: getBorderColor(),
          borderWidth: variant === 'outline' ? 1.2 : 0,
          borderRadius: radius.md,
          ...getPadding(),
        },
        style,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator size="small" color={getTextColor()} />
      ) : (
        <View style={styles.contentRow}>
          {icon && <View style={{ marginRight: 6 }}>{icon}</View>}
          {title ? (
            <Text
              style={[
                styles.text,
                {
                  color: getTextColor(),
                  fontSize: getFontSize(),
                },
              ]}
            >
              {title}
            </Text>
          ) : (
            children
          )}
          {iconRight && <View style={{ marginLeft: 6 }}>{iconRight}</View>}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontWeight: '600',
    textAlign: 'center',
  },
});
