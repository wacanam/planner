// mobile/app/(auth)/verify-email.tsx
import { useRouter } from 'expo-router';
import { LogOut, Mail } from 'lucide-react-native';
import { useEffect, useState } from 'react';
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
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { triggerHaptic } from '@/lib/sound';

const COOLDOWN_SECONDS = 60;

export default function VerifyEmailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, firebaseUser, reloadUser, sendVerificationEmail, logout } = useAuth();
  const { colors, typography, spacing } = useTheme();

  const [checking, setChecking] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // If already verified, route to index
  useEffect(() => {
    if (firebaseUser?.emailVerified) {
      router.replace('/');
    }
  }, [firebaseUser?.emailVerified, router]);

  // Countdown timer for cooldown
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [cooldown]);

  const handleCheckStatus = async () => {
    setChecking(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const isVerified = await reloadUser();
      if (isVerified) {
        await triggerHaptic('success');
        router.replace('/');
      } else {
        await triggerHaptic('error');
        setErrorMessage(
          'Your email is not verified yet. Please check your inbox and click the verification link.'
        );
      }
    } catch (err: any) {
      await triggerHaptic('error');
      setErrorMessage(err?.message || 'Unable to check verification status. Please try again.');
    } finally {
      setChecking(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || resending) return;
    setResending(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await sendVerificationEmail();
      await triggerHaptic('success');
      setSuccessMessage('A fresh verification link has been sent to your email.');
      setCooldown(COOLDOWN_SECONDS);
    } catch (err: any) {
      await triggerHaptic('error');
      setErrorMessage(
        err?.message || 'Failed to resend verification email. Please try again shortly.'
      );
    } finally {
      setResending(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await logout();
      router.replace('/(auth)/login');
    } catch {
      router.replace('/(auth)/login');
    }
  };

  const displayEmail = user?.email || firebaseUser?.email || 'your email';

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
            Verify Email
          </Text>
          <Text
            style={[
              styles.subtitle,
              { color: colors.mutedForeground, fontSize: typography.base, marginTop: spacing.xs },
            ]}
          >
            Please verify your email address to continue
          </Text>
        </View>

        <Card style={{ marginTop: spacing.xl, alignItems: 'center' }}>
          <View
            style={[
              styles.iconWrapper,
              { backgroundColor: `${colors.primary}18`, marginBottom: spacing.md },
            ]}
          >
            <Mail size={32} color={colors.primary} />
          </View>

          <Text
            style={[
              styles.instructions,
              { color: colors.mutedForeground, fontSize: typography.sm, textAlign: 'center' },
            ]}
          >
            We sent a verification link to:
          </Text>
          <View
            style={[
              styles.emailBox,
              {
                backgroundColor: colors.muted,
                borderColor: colors.border,
                marginVertical: spacing.sm,
              },
            ]}
          >
            <Text
              style={[
                styles.emailText,
                { color: colors.foreground, fontSize: typography.sm, fontWeight: '600' },
              ]}
            >
              {displayEmail}
            </Text>
          </View>

          <Text
            style={[
              styles.subInstructions,
              {
                color: colors.mutedForeground,
                fontSize: typography.xs,
                textAlign: 'center',
                marginBottom: spacing.md,
              },
            ]}
          >
            Click the link in the confirmation email to activate your account.
          </Text>

          {errorMessage && (
            <View
              style={[
                styles.errorBanner,
                { backgroundColor: `${colors.destructive}15`, marginBottom: spacing.md },
              ]}
            >
              <Text
                style={[
                  styles.errorText,
                  { color: colors.destructive, fontSize: typography.sm, textAlign: 'center' },
                ]}
              >
                {errorMessage}
              </Text>
            </View>
          )}

          {successMessage && (
            <View
              style={[
                styles.successBanner,
                { backgroundColor: '#10B98118', marginBottom: spacing.md },
              ]}
            >
              <Text
                style={[
                  styles.successText,
                  { color: '#10B981', fontSize: typography.sm, textAlign: 'center' },
                ]}
              >
                {successMessage}
              </Text>
            </View>
          )}

          <Button
            title="I've Verified My Email"
            onPress={handleCheckStatus}
            loading={checking}
            size="lg"
            style={{ width: '100%', marginTop: spacing.xs }}
          />

          <Button
            title={cooldown > 0 ? `Resend Email (${cooldown}s)` : 'Resend Verification Email'}
            onPress={handleResend}
            loading={resending}
            disabled={cooldown > 0}
            variant="outline"
            size="lg"
            style={{ width: '100%', marginTop: spacing.sm }}
          />
        </Card>

        <View style={styles.footer}>
          <TouchableOpacity onPress={handleSignOut} style={styles.signOutButton}>
            <LogOut size={16} color={colors.mutedForeground} />
            <Text
              style={[
                styles.signOutText,
                { color: colors.mutedForeground, fontSize: typography.sm, marginLeft: spacing.xs },
              ]}
            >
              Sign out & use another account
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
  },
  title: {
    fontWeight: '700',
  },
  subtitle: {
    textAlign: 'center',
  },
  iconWrapper: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  instructions: {
    lineHeight: 20,
  },
  emailBox: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  emailText: {
    textAlign: 'center',
  },
  subInstructions: {
    lineHeight: 18,
  },
  errorBanner: {
    width: '100%',
    padding: 10,
    borderRadius: 8,
  },
  errorText: {
    fontWeight: '500',
  },
  successBanner: {
    width: '100%',
    padding: 10,
    borderRadius: 8,
  },
  successText: {
    fontWeight: '500',
  },
  footer: {
    marginTop: 24,
    alignItems: 'center',
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  signOutText: {
    fontWeight: '500',
  },
});
