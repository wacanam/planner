// mobile/app/(auth)/reset-password.tsx
import { useRouter } from 'expo-router';
import { ArrowLeft, Mail } from 'lucide-react-native';
import { useState } from 'react';
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

export default function ResetPasswordScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { resetPassword } = useAuth();
  const { colors, typography, spacing } = useTheme();

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleReset = async () => {
    if (!email.trim()) {
      setErrorMessage('Please enter your email address');
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await resetPassword(email);
      await triggerHaptic('success');
      setSuccessMessage('Password reset link has been sent to your email.');
    } catch (err: any) {
      triggerHaptic('error');
      setErrorMessage(err.message || 'Failed to send reset link. Please check your email.');
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
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.backRow, { marginBottom: spacing.lg }]}
        >
          <ArrowLeft size={20} color={colors.foreground} />
          <Text
            style={[
              styles.backText,
              { color: colors.foreground, fontSize: typography.base, marginLeft: spacing.xs },
            ]}
          >
            Back to Sign In
          </Text>
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.primary, fontSize: typography.title }]}>
            Reset Password
          </Text>
          <Text
            style={[
              styles.subtitle,
              { color: colors.mutedForeground, fontSize: typography.base, marginTop: spacing.xs },
            ]}
          >
            Enter your email to receive recovery instructions
          </Text>
        </View>

        <Card style={{ marginTop: spacing.xl }}>
          {errorMessage && (
            <View
              style={[
                styles.errorBanner,
                { backgroundColor: `${colors.destructive}15`, marginBottom: spacing.md },
              ]}
            >
              <Text
                style={[styles.errorText, { color: colors.destructive, fontSize: typography.sm }]}
              >
                {errorMessage}
              </Text>
            </View>
          )}

          {successMessage && (
            <View
              style={[
                styles.successBanner,
                { backgroundColor: `${colors.success}15`, marginBottom: spacing.md },
              ]}
            >
              <Text
                style={[styles.successText, { color: colors.success, fontSize: typography.sm }]}
              >
                {successMessage}
              </Text>
            </View>
          )}

          <Input
            label="Email"
            placeholder="publisher@example.com"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
            icon={<Mail size={18} color={colors.mutedForeground} />}
          />

          <Button
            title="Send Reset Link"
            onPress={handleReset}
            loading={loading}
            size="lg"
            style={{ marginTop: spacing.sm }}
          />
        </Card>
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
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backText: {
    fontWeight: '600',
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
  successBanner: {
    padding: 12,
    borderRadius: 8,
  },
  successText: {
    fontWeight: '500',
  },
});
