// mobile/app/index.tsx
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';

export default function IndexScreen() {
  const router = useRouter();
  const { isAuthenticated, firebaseUser, activeCongregationId, loading } = useAuth();
  const { colors, typography, spacing } = useTheme();

  useEffect(() => {
    if (loading) return;

    if (!isAuthenticated) {
      router.replace('/(auth)/login');
    } else if (firebaseUser && !firebaseUser.emailVerified) {
      router.replace('/(auth)/verify-email');
    } else if (!activeCongregationId) {
      router.replace('/select-congregation');
    } else {
      router.replace('/(tabs)/assignments');
    }
  }, [loading, isAuthenticated, firebaseUser?.emailVerified, activeCongregationId, router]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.centerBox}>
        <Text style={[styles.logoText, { color: colors.primary, fontSize: typography.title }]}>
          Kanataran
        </Text>
        <Text
          style={[
            styles.subText,
            { color: colors.mutedForeground, fontSize: typography.sm, marginTop: spacing.xs },
          ]}
        >
          Ministry & Territory Planner
        </Text>
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: spacing.xl }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerBox: {
    alignItems: 'center',
  },
  logoText: {
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  subText: {
    fontWeight: '500',
  },
});
