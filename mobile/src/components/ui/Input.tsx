// mobile/src/components/ui/Input.tsx
import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTheme } from '@/context/ThemeContext';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
  onIconRightPress?: () => void;
}

export function Input({
  label,
  error,
  helperText,
  icon,
  iconRight,
  onIconRightPress,
  style,
  ...rest
}: InputProps) {
  const { colors, radius, spacing, typography } = useTheme();
  const [isFocused, setIsFocused] = useState(false);

  const getBorderColor = () => {
    if (error) return colors.destructive;
    if (isFocused) return colors.primary;
    return colors.border;
  };

  return (
    <View style={styles.container}>
      {label && (
        <Text
          style={[
            styles.label,
            {
              color: colors.foreground,
              fontSize: typography.sm,
            },
          ]}
        >
          {label}
        </Text>
      )}

      <View
        style={[
          styles.inputWrapper,
          {
            backgroundColor: colors.card,
            borderColor: getBorderColor(),
            borderRadius: radius.md,
            paddingHorizontal: spacing.md,
          },
        ]}
      >
        {icon && <View style={{ marginRight: spacing.sm }}>{icon}</View>}

        <TextInput
          placeholderTextColor={colors.mutedForeground}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          style={[
            styles.input,
            {
              color: colors.foreground,
              fontSize: typography.base,
            },
            style,
          ]}
          {...rest}
        />

        {iconRight && (
          <TouchableOpacity
            disabled={!onIconRightPress}
            onPress={onIconRightPress}
            style={{ marginLeft: spacing.sm }}
          >
            {iconRight}
          </TouchableOpacity>
        )}
      </View>

      {error ? (
        <Text
          style={[
            styles.errorText,
            {
              color: colors.destructive,
              fontSize: typography.xs,
            },
          ]}
        >
          {error}
        </Text>
      ) : helperText ? (
        <Text
          style={[
            styles.helperText,
            {
              color: colors.mutedForeground,
              fontSize: typography.xs,
            },
          ]}
        >
          {helperText}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 14,
    width: '100%',
  },
  label: {
    fontWeight: '600',
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.2,
    minHeight: 46,
  },
  input: {
    flex: 1,
    paddingVertical: 10,
  },
  errorText: {
    marginTop: 4,
    fontWeight: '500',
  },
  helperText: {
    marginTop: 4,
  },
});
