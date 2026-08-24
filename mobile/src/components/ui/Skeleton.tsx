// mobile/src/components/ui/Skeleton.tsx
import React, { useEffect, useRef } from 'react';
import {
  Animated,
  type DimensionValue,
  StyleSheet,
  type ViewProps,
  type ViewStyle,
} from 'react-native';
import { useTheme } from '@/context/ThemeContext';

export interface SkeletonProps extends ViewProps {
  width?: DimensionValue;
  height?: DimensionValue;
  borderRadius?: number;
  variant?: 'rect' | 'circle' | 'rounded' | 'text';
  style?: ViewStyle | ViewStyle[];
}

export function Skeleton({
  width,
  height,
  borderRadius,
  variant = 'rounded',
  style,
  ...rest
}: SkeletonProps) {
  const { colors, radius } = useTheme();
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.9,
          duration: 750,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.35,
          duration: 750,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [opacity]);

  const getBorderRadius = () => {
    if (borderRadius !== undefined) return borderRadius;
    switch (variant) {
      case 'circle':
        return radius.round;
      case 'rounded':
        return radius.md;
      case 'text':
        return radius.xs;
      case 'rect':
      default:
        return 0;
    }
  };

  const computedWidth = variant === 'circle' && height && !width ? height : width;
  const computedHeight = variant === 'circle' && width && !height ? width : height;

  return (
    <Animated.View
      style={[
        styles.skeletonBase,
        {
          backgroundColor: colors.muted,
          width: computedWidth,
          height: computedHeight,
          borderRadius: getBorderRadius(),
          opacity,
        },
        style,
      ]}
      {...rest}
    />
  );
}

export interface SkeletonTextProps {
  lines?: number;
  lineHeight?: number;
  spacing?: number;
  widths?: DimensionValue[];
  style?: ViewStyle;
}

export function SkeletonText({
  lines = 2,
  lineHeight = 14,
  spacing = 8,
  widths = ['100%', '70%'],
  style,
}: SkeletonTextProps) {
  return (
    <Animated.View style={style}>
      {Array.from({ length: lines }).map((_, index) => {
        const width = widths[index % widths.length] || '100%';
        const isLast = index === lines - 1;
        return (
          <Skeleton
            // biome-ignore lint/suspicious/noArrayIndexKey: Skeleton placeholder list
            key={index}
            variant="text"
            height={lineHeight}
            width={width}
            style={!isLast ? { marginBottom: spacing } : undefined}
          />
        );
      })}
    </Animated.View>
  );
}

export interface SkeletonCircleProps {
  size?: number;
  style?: ViewStyle;
}

export function SkeletonCircle({ size = 40, style }: SkeletonCircleProps) {
  return (
    <Skeleton variant="circle" width={size} height={size} borderRadius={size / 2} style={style} />
  );
}

export interface SkeletonCardProps extends ViewProps {
  style?: ViewStyle | ViewStyle[];
  children?: React.ReactNode;
}

export function SkeletonCard({ children, style, ...rest }: SkeletonCardProps) {
  const { colors, radius, spacing } = useTheme();

  return (
    <Animated.View
      style={[
        styles.cardBase,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          borderRadius: radius.lg,
          padding: spacing.md,
        },
        style,
      ]}
      {...rest}
    >
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  skeletonBase: {
    overflow: 'hidden',
  },
  cardBase: {
    borderWidth: 1,
    overflow: 'hidden',
  },
});
