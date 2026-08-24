import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/context/ThemeContext';

export type BadgeVariant =
  | 'primary'
  | 'secondary'
  | 'accent'
  | 'success'
  | 'warning'
  | 'destructive'
  | 'outline'
  | 'muted';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
}

export function Badge({ label, variant = 'primary', size = 'md' }: BadgeProps) {
  const { colors, radius, typography } = useTheme();

  const getBackgroundColor = () => {
    switch (variant) {
      case 'primary':
        return `${colors.primary}22`;
      case 'secondary':
        return `${colors.secondary}33`;
      case 'accent':
        return `${colors.accent}33`;
      case 'success':
        return `${colors.success}22`;
      case 'warning':
        return `${colors.warning}22`;
      case 'destructive':
        return `${colors.destructive}22`;
      case 'muted':
        return colors.muted;
      default:
        return 'transparent';
    }
  };

  const getTextColor = () => {
    switch (variant) {
      case 'primary':
        return colors.primary;
      case 'secondary':
        return colors.secondaryForeground;
      case 'accent':
        return colors.accentForeground;
      case 'success':
        return colors.success;
      case 'warning':
        return colors.warning;
      case 'destructive':
        return colors.destructive;
      case 'muted':
        return colors.mutedForeground;
      default:
        return colors.foreground;
    }
  };

  const getBorderColor = () => {
    if (variant === 'outline') return colors.border;
    return 'transparent';
  };

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: getBackgroundColor(),
          borderColor: getBorderColor(),
          borderWidth: variant === 'outline' ? 1 : 0,
          borderRadius: radius.round,
          paddingVertical: size === 'sm' ? 2 : 4,
          paddingHorizontal: size === 'sm' ? 6 : 10,
        },
      ]}
    >
      <Text
        style={[
          styles.text,
          {
            color: getTextColor(),
            fontSize: size === 'sm' ? typography.xs - 1 : typography.xs,
          },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontWeight: '600',
    textTransform: 'uppercase',
  },
});
