// mobile/app/invite.tsx
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AlertCircle, Building2, Check, KeyRound, ShieldCheck, UserCheck } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Header } from '@/components/ui/Header';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { fetchInvitationByCode, useAcceptInvitation } from '@/hooks/useInvitations';
import { triggerHaptic } from '@/lib/sound';
import type { Invitation } from '@/types/api';

const ROLE_DISPLAY_NAMES: Record<string, string> = {
  publisher: 'Publisher',
  visiting_publisher: 'Visiting Publisher',
  territory_servant: 'Territory Servant',
  secretary: 'Secretary',
  service_overseer: 'Service Overseer',
  circuit_overseer: 'Circuit Overseer',
};

export default function InviteLandingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { code: rawCode } = useLocalSearchParams<{ code?: string }>();
  const { user, isAuthenticated, setActiveCongregationId } = useAuth();
  const { colors, typography, spacing } = useTheme();

  const [inputCode, setInputCode] = useState(rawCode ? String(rawCode).trim().toUpperCase() : '');
  const [loading, setLoading] = useState(Boolean(rawCode));
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const { accept, isAccepting } = useAcceptInvitation();

  const loadInvite = async (codeToFetch: string) => {
    if (!codeToFetch) return;
    setLoading(true);
    setError(null);
    try {
      const inv = await fetchInvitationByCode(codeToFetch);
      if (!inv) {
        setError('Invitation not found or code is invalid.');
        setInvitation(null);
      } else if (inv.status !== 'pending') {
        setError(`This invitation has already been ${inv.status}.`);
        setInvitation(null);
      } else if (new Date(inv.expiresAt).getTime() < Date.now()) {
        setError('This invitation has expired.');
        setInvitation(null);
      } else {
        setInvitation(inv);
        await triggerHaptic('medium');
      }
    } catch (e: any) {
      setError(e.message || 'Failed to fetch invitation details.');
      setInvitation(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (rawCode) {
      loadInvite(String(rawCode).trim().toUpperCase());
    }
  }, [rawCode]);

  const handleAccept = async () => {
    if (!invitation || !user?.id) return;
    try {
      await accept(invitation, {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      });
      await triggerHaptic('success');
      setSuccess(true);

      setTimeout(async () => {
        if (invitation.congregationId) {
          await setActiveCongregationId(invitation.congregationId);
          router.replace('/(tabs)/assignments');
        } else {
          router.replace('/(tabs)/more');
        }
      }, 1500);
    } catch (e: any) {
      triggerHaptic('error');
      setError(e.message || 'Failed to accept invitation.');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header showBack title="Invitation" subtitle="Join congregation workspace" />

      <View
        style={[
          styles.content,
          {
            padding: spacing.lg,
            paddingBottom: insets.bottom + spacing.xxl,
          },
        ]}
      >
        {success ? (
          <Card style={[styles.card, { alignItems: 'center', padding: spacing.xl }]}>
            <View
              style={[
                styles.iconCircle,
                { backgroundColor: `${colors.success}20`, marginBottom: spacing.md },
              ]}
            >
              <Check size={36} color={colors.success} />
            </View>
            <Text
              style={{
                fontSize: typography.title,
                fontWeight: '800',
                color: colors.foreground,
                textAlign: 'center',
              }}
            >
              Welcome to the Congregation!
            </Text>
            <Text
              style={{
                color: colors.mutedForeground,
                fontSize: typography.sm,
                textAlign: 'center',
                marginTop: 6,
              }}
            >
              Your invitation has been accepted. Opening your workspace...
            </Text>
          </Card>
        ) : loading ? (
          <Card style={[styles.card, { alignItems: 'center', padding: spacing.xl }]}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text
              style={{
                color: colors.mutedForeground,
                fontSize: typography.sm,
                marginTop: spacing.md,
              }}
            >
              Verifying invitation code...
            </Text>
          </Card>
        ) : invitation ? (
          <Card style={[styles.card, { padding: spacing.lg }]}>
            <View style={{ alignItems: 'center', marginBottom: spacing.md }}>
              <View
                style={[
                  styles.iconCircle,
                  {
                    backgroundColor:
                      invitation.type === 'system_admin'
                        ? '#8b5cf620'
                        : `${colors.primary}20`,
                    marginBottom: spacing.sm,
                  },
                ]}
              >
                {invitation.type === 'system_admin' ? (
                  <ShieldCheck size={32} color="#8b5cf6" />
                ) : (
                  <Building2 size={32} color={colors.primary} />
                )}
              </View>

              <Text
                style={{
                  fontSize: typography.xl,
                  fontWeight: '800',
                  color: colors.foreground,
                  textAlign: 'center',
                }}
              >
                {invitation.congregationName || 'System Admin Invitation'}
              </Text>
              <Text
                style={{
                  color: colors.mutedForeground,
                  fontSize: typography.xs,
                  textAlign: 'center',
                  marginTop: 2,
                }}
              >
                Invited by {invitation.invitedByName} ({invitation.invitedByRole})
              </Text>
            </View>

            <View
              style={[
                styles.detailsBox,
                { backgroundColor: `${colors.muted}40`, borderColor: colors.border },
              ]}
            >
              <View style={styles.detailRow}>
                <Text style={{ fontSize: typography.xs, color: colors.mutedForeground }}>
                  ASSIGNED ROLE
                </Text>
                <Badge
                  label={
                    ROLE_DISPLAY_NAMES[invitation.congregationRole || ''] ||
                    invitation.systemRole ||
                    invitation.congregationRole ||
                    'Publisher'
                  }
                  variant="primary"
                  size="sm"
                />
              </View>

              {invitation.groupName && (
                <View style={[styles.detailRow, { marginTop: 8 }]}>
                  <Text style={{ fontSize: typography.xs, color: colors.mutedForeground }}>
                    SERVICE GROUP
                  </Text>
                  <Text style={{ fontSize: typography.sm, fontWeight: '700', color: colors.foreground }}>
                    {invitation.groupName}
                  </Text>
                </View>
              )}

              <View style={[styles.detailRow, { marginTop: 8 }]}>
                <Text style={{ fontSize: typography.xs, color: colors.mutedForeground }}>
                  EXPIRES ON
                </Text>
                <Text style={{ fontSize: typography.xs, color: colors.foreground }}>
                  {new Date(invitation.expiresAt).toLocaleDateString()}
                </Text>
              </View>
            </View>

            {error && (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: `${colors.destructive}15`,
                  padding: 10,
                  borderRadius: 8,
                  marginTop: spacing.md,
                }}
              >
                <AlertCircle size={16} color={colors.destructive} />
                <Text
                  style={{
                    color: colors.destructive,
                    fontSize: typography.xs,
                    marginLeft: 6,
                    flex: 1,
                  }}
                >
                  {error}
                </Text>
              </View>
            )}

            {!isAuthenticated ? (
              <View style={{ marginTop: spacing.lg, gap: 10 }}>
                <Text
                  style={{
                    textAlign: 'center',
                    fontSize: typography.xs,
                    color: colors.mutedForeground,
                  }}
                >
                  Sign in or create an account to accept this invitation.
                </Text>
                <Button
                  title="Sign In to Accept"
                  variant="primary"
                  size="lg"
                  onPress={() => router.push('/(auth)/login')}
                />
                <Button
                  title="Create New Account"
                  variant="outline"
                  size="md"
                  onPress={() => router.push('/(auth)/register')}
                />
              </View>
            ) : (
              <View style={{ marginTop: spacing.lg, gap: 10 }}>
                <Button
                  title="Accept Invitation"
                  variant="primary"
                  size="lg"
                  icon={<UserCheck size={18} color="#ffffff" />}
                  onPress={handleAccept}
                  loading={isAccepting}
                />
                <Button
                  title="Cancel"
                  variant="ghost"
                  size="md"
                  onPress={() => router.replace('/select-congregation')}
                />
              </View>
            )}
          </Card>
        ) : (
          <Card style={[styles.card, { padding: spacing.lg }]}>
            <Text
              style={{
                fontSize: typography.lg,
                fontWeight: '800',
                color: colors.foreground,
                marginBottom: spacing.xs,
              }}
            >
              Enter Invitation Code
            </Text>
            <Text
              style={{
                fontSize: typography.xs,
                color: colors.mutedForeground,
                marginBottom: spacing.md,
              }}
            >
              Enter the invite code you received to join your congregation.
            </Text>

            <Input
              placeholder="e.g. 7X9K2P"
              autoCapitalize="characters"
              maxLength={10}
              value={inputCode}
              onChangeText={(v) => {
                setInputCode(v.toUpperCase());
                setError(null);
              }}
              icon={<KeyRound size={16} color={colors.mutedForeground} />}
            />

            {error && (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: `${colors.destructive}15`,
                  padding: 10,
                  borderRadius: 8,
                  marginBottom: spacing.md,
                }}
              >
                <AlertCircle size={16} color={colors.destructive} />
                <Text
                  style={{
                    color: colors.destructive,
                    fontSize: typography.xs,
                    marginLeft: 6,
                    flex: 1,
                  }}
                >
                  {error}
                </Text>
              </View>
            )}

            <Button
              title="Lookup Invitation"
              variant="primary"
              size="lg"
              onPress={() => loadInvite(inputCode)}
              loading={loading}
              style={{ marginTop: spacing.xs }}
            />
          </Card>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  card: {
    borderRadius: 16,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailsBox: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});
