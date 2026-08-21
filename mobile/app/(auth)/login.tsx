// mobile/app/(auth)/login.tsx
import { Link, useRouter } from 'expo-router';
import { Lock, Mail } from 'lucide-react-native';
import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { triggerHaptic } from '@/lib/sound';

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { login } = useAuth();
  const { colors, typography, spacing } = useTheme();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setErrorMessage('Please enter your email and password');
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    try {
      await login(email, password);
      await triggerHaptic('success');
      router.replace('/');
    } catch (err: any) {
      triggerHaptic('error');
      setErrorMessage(err.message || 'Failed to sign in. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + spacing.xl,
            paddingBottom: insets.bottom + spacing.xl,
            paddingHorizontal: spacing.lg,
          },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.primary, fontSize: typography.title }]}>
            Kanataran
          </Text>
          <Text
            style={[
              styles.subtitle,
              { color: colors.mutedForeground, fontSize: typography.base, marginTop: spacing.xs },
            ]}
          >
            Sign in to access your territories & ministry records
          </Text>
        </View>

        <Card style={{ marginTop: spacing.xl }}>
          {errorMessage && (
            <View
              style={[
                styles.errorBanner,
                { backgroundColor: colors.destructive + '15', marginBottom: spacing.md },
              ]}
            >
              <Text
                style={[styles.errorText, { color: colors.destructive, fontSize: typography.sm }]}
              >
                {errorMessage}
              </Text>
            </View>
          )}

          <Input
            label="Email"
            placeholder="publisher@example.com"
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            value={email}
            onChangeText={setEmail}
            icon={<Mail size={18} color={colors.mutedForeground} />}
          />

          <Input
            label="Password"
            placeholder="••••••••"
            secureTextEntry
            autoCapitalize="none"
            value={password}
            onChangeText={setPassword}
            icon={<Lock size={18} color={colors.mutedForeground} />}
          />

          <View style={styles.forgotContainer}>
            <TouchableOpacity onPress={() => router.push('/(auth)/reset-password')}>
              <Text style={[styles.forgotText, { color: colors.primary, fontSize: typography.sm }]}>
                Forgot password?
              </Text>
            </TouchableOpacity>
          </View>

          <Button
            title="Sign In"
            onPress={handleLogin}
            loading={loading}
            size="lg"
            style={{ marginTop: spacing.sm }}
          />
        </Card>

        <View style={styles.footer}>
          <Text
            style={[styles.footerText, { color: colors.mutedForeground, fontSize: typography.sm }]}
          >
            Don't have an account?{' '}
          </Text>
          <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
            <Text style={[styles.footerLink, { color: colors.primary, fontSize: typography.sm }]}>
              Register
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontWeight: '800',
  },
  subtitle: {
    textAlign: 'center',
  },
  forgotContainer: {
    alignItems: 'flex-end',
    marginBottom: 16,
    marginTop: -4,
  },
  forgotText: {
    fontWeight: '600',
  },
  errorBanner: {
    padding: 12,
    borderRadius: 8,
  },
  errorText: {
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
  footerText: {},
  footerLink: {
    fontWeight: '700',
  },
});
