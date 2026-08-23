// mobile/app/(auth)/register.tsx
import { useRouter } from 'expo-router';
import { Lock, Mail, User as UserIcon } from 'lucide-react-native';
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

export default function RegisterScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { register } = useAuth();
  const { colors, typography, spacing } = useTheme();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleRegister = async () => {
    if (!name.trim()) {
      setErrorMessage('Please enter your full name');
      return;
    }
    if (!email.trim()) {
      setErrorMessage('Please enter your email address');
      return;
    }
    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match');
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    try {
      await register(name, email, password);
      await triggerHaptic('success');
      router.replace('/(auth)/verify-email');
    } catch (err: any) {
      triggerHaptic('error');
      setErrorMessage(err.message || 'Failed to create account. Please try again.');
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
            Create Account
          </Text>
          <Text
            style={[
              styles.subtitle,
              { color: colors.mutedForeground, fontSize: typography.base, marginTop: spacing.xs },
            ]}
          >
            Join your congregation & start territory planning
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
            label="Full Name"
            placeholder="John Doe"
            value={name}
            onChangeText={setName}
            icon={<UserIcon size={18} color={colors.mutedForeground} />}
          />

          <Input
            label="Email"
            placeholder="publisher@example.com"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
            icon={<Mail size={18} color={colors.mutedForeground} />}
          />

          <Input
            label="Password"
            placeholder="At least 6 characters"
            secureTextEntry
            autoCapitalize="none"
            value={password}
            onChangeText={setPassword}
            icon={<Lock size={18} color={colors.mutedForeground} />}
          />

          <Input
            label="Confirm Password"
            placeholder="Re-enter password"
            secureTextEntry
            autoCapitalize="none"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            icon={<Lock size={18} color={colors.mutedForeground} />}
          />

          <Button
            title="Create Account"
            onPress={handleRegister}
            loading={loading}
            size="lg"
            style={{ marginTop: spacing.sm }}
          />
        </Card>

        <View style={styles.footer}>
          <Text
            style={[styles.footerText, { color: colors.mutedForeground, fontSize: typography.sm }]}
          >
            Already have an account?{' '}
          </Text>
          <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
            <Text style={[styles.footerLink, { color: colors.primary, fontSize: typography.sm }]}>
              Sign In
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
