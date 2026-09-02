// mobile/app/(tabs)/more/index.tsx
import { useRouter } from 'expo-router';
import {
  Bell,
  Building2,
  Check,
  ChevronRight,
  FileText,
  LogOut,
  Mail,
  Moon,
  Settings,
  Share2,
  ShieldCheck,
  Sun,
  User as UserIcon,
  UserPlus,
  Users,
  X,
} from 'lucide-react-native';
import React, { useState } from 'react';
import {
  Alert,
  Image,
  Modal,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Header } from '@/components/ui/Header';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useCongregationGroups } from '@/hooks/useCongregationGroups';
import { useCongregation } from '@/hooks/useCongregations';
import { useCreateInvitation } from '@/hooks/useInvitations';
import { canSendSystemAdminInvite, isSystemAdmin, isUserInGroup } from '@/lib/permissions';
import { triggerHaptic } from '@/lib/sound';
import type { Invitation } from '@/types/api';

export default function MoreMenuScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, activeCongregationId, logout } = useAuth();
  const { congregation } = useCongregation(activeCongregationId);
  const { groups = [] } = useCongregationGroups(activeCongregationId);
  const { colors, typography, spacing, radius, isDark, toggleTheme } = useTheme();

  const { createSystemAdminInvitation, isCreating: isCreatingAdminInvite } = useCreateInvitation();

  const isSuperAdmin = user?.role === 'SUPER_ADMIN' || canSendSystemAdminInvite(user?.role);

  // Admin Invite Modal
  const [adminModalVisible, setAdminModalVisible] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');
  const [adminRole, setAdminRole] = useState<'ADMIN' | 'SUPER_ADMIN'>('ADMIN');
  const [createdAdminInvite, setCreatedAdminInvite] = useState<Invitation | null>(null);

  const myGroup = React.useMemo(() => {
    return groups.find((g) => isUserInGroup(user, g) || g.id === user?.groupId);
  }, [groups, user]);

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out of Kanataran?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await triggerHaptic('medium');
          await logout();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  const handleOpenAdminModal = () => {
    setAdminEmail('');
    setAdminRole('ADMIN');
    setCreatedAdminInvite(null);
    setAdminModalVisible(true);
  };

  const handleCreateAdminInvite = async () => {
    if (!user?.id) return;
    try {
      const inv = await createSystemAdminInvitation({
        email: adminEmail.trim() || null,
        systemRole: adminRole,
        invitedBy: user.id,
        invitedByName: user.name || user.email || 'Super Admin',
        invitedByRole: user.role || 'SUPER_ADMIN',
        expiresInDays: 14,
      });
      await triggerHaptic('success');
      setCreatedAdminInvite(inv);
    } catch (e: any) {
      triggerHaptic('error');
      Alert.alert('Error', e.message || 'Failed to create system admin invite.');
    }
  };

  const handleShareAdminInvite = async (inv: Invitation) => {
    const inviteLink = `https://kanataran.app/invite?code=${inv.id}`;
    const msg = `You have been invited by ${inv.invitedByName} to become a ${inv.systemRole} for Kanataran app.\n\nUse Invite Code: ${inv.id}\nOr tap link: ${inviteLink}`;

    try {
      await Share.share({
        message: msg,
        title: 'Kanataran App Admin Invitation',
        url: inviteLink,
      });
      await triggerHaptic('light');
    } catch {}
  };

  const renderMenuItem = ({
    icon,
    title,
    subtitle,
    onPress,
    badge,
    destructive,
  }: {
    icon: React.ReactNode;
    title: string;
    subtitle?: string;
    onPress: () => void;
    badge?: React.ReactNode;
    destructive?: boolean;
  }) => (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => {
        triggerHaptic('light');
        onPress();
      }}
      style={[styles.menuItem, { borderBottomColor: colors.border }]}
    >
      <View style={[styles.menuIconBox, { backgroundColor: `${colors.muted}50` }]}>{icon}</View>
      <View style={{ flex: 1, marginLeft: spacing.sm }}>
        <Text
          style={[
            styles.menuTitle,
            {
              color: destructive ? colors.destructive : colors.foreground,
              fontSize: typography.base,
            },
          ]}
        >
          {title}
        </Text>
        {subtitle && (
          <Text
            style={[
              styles.menuSubtitle,
              { color: colors.mutedForeground, fontSize: typography.xs },
            ]}
          >
            {subtitle}
          </Text>
        )}
      </View>
      {badge}
      <ChevronRight size={16} color={colors.mutedForeground} style={{ marginLeft: 6 }} />
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header title="More" subtitle="Congregation settings & reports" />

      <ScrollView
        contentContainerStyle={{
          padding: spacing.md,
          paddingBottom: insets.bottom + spacing.xxl,
        }}
      >
        {/* User Card */}
        <Card style={[styles.userCard, { marginBottom: spacing.lg }]}>
          <View style={styles.userRow}>
            <View style={[styles.userAvatar, { backgroundColor: colors.primary }]}>
              {user?.avatarUrl ? (
                <Image
                  source={{ uri: user.avatarUrl }}
                  style={styles.avatarImage}
                  resizeMode="cover"
                />
              ) : (
                <Text style={[styles.userInitial, { color: '#ffffff' }]}>
                  {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                </Text>
              )}
            </View>

            <View style={{ flex: 1, marginLeft: spacing.md }}>
              <Text
                style={[styles.userName, { color: colors.foreground, fontSize: typography.lg }]}
              >
                {user?.name || 'Publisher'}
              </Text>
              <Text
                style={[
                  styles.userEmail,
                  { color: colors.mutedForeground, fontSize: typography.xs },
                ]}
              >
                {user?.email}
              </Text>
              <View style={{ flexDirection: 'row', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                <Badge label={user?.role || 'PUBLISHER'} variant="primary" size="sm" />
                {user?.congregationRole && (
                  <Badge label={user.congregationRole} variant="secondary" size="sm" />
                )}
                {myGroup && <Badge label={myGroup.name} variant="outline" size="sm" />}
              </View>
            </View>
          </View>
        </Card>

        {/* Section 1: Congregation & Ministry */}
        <Text
          style={[styles.sectionHeader, { color: colors.mutedForeground, fontSize: typography.xs }]}
        >
          CONGREGATION & MINISTRY
        </Text>
        <Card style={[styles.menuGroupCard, { marginBottom: spacing.lg }]}>
          {renderMenuItem({
            icon: <FileText size={18} color={colors.primary} />,
            title: 'Reports & S-13 Record',
            subtitle: 'Territory coverage, monthly reports & S-13 PDF',
            onPress: () => router.push('/(tabs)/more/reports'),
          })}

          {renderMenuItem({
            icon: <Users size={18} color={colors.secondaryForeground} />,
            title: 'Service Groups',
            subtitle: 'Group assignments and publishers',
            onPress: () => router.push('/(tabs)/more/groups'),
          })}

          {renderMenuItem({
            icon: <UserIcon size={18} color={colors.accentForeground} />,
            title: 'Members Directory',
            subtitle: 'Publishers, requests & invitations',
            onPress: () => router.push('/(tabs)/more/members'),
          })}

          {renderMenuItem({
            icon: <Building2 size={18} color={colors.primary} />,
            title: 'Switch Congregation',
            subtitle: congregation ? `Current: ${congregation.name}` : 'Select workspace',
            onPress: () => router.push('/select-congregation'),
          })}
        </Card>

        {/* Section 2: App Admin (Super Admin only) */}
        {isSuperAdmin && (
          <>
            <Text
              style={[
                styles.sectionHeader,
                { color: colors.mutedForeground, fontSize: typography.xs },
              ]}
            >
              SYSTEM & APP ADMINISTRATION
            </Text>
            <Card style={[styles.menuGroupCard, { marginBottom: spacing.lg }]}>
              {renderMenuItem({
                icon: <ShieldCheck size={18} color="#8b5cf6" />,
                title: 'Invite App Admin',
                subtitle: 'Invite additional Super Admin or System Admin',
                onPress: handleOpenAdminModal,
                badge: <Badge label="Super Admin" variant="primary" size="sm" />,
              })}
            </Card>
          </>
        )}

        {/* Section 3: App & Preferences */}
        <Text
          style={[styles.sectionHeader, { color: colors.mutedForeground, fontSize: typography.xs }]}
        >
          PREFERENCES & TOOLS
        </Text>
        <Card style={[styles.menuGroupCard, { marginBottom: spacing.lg }]}>
          {renderMenuItem({
            icon: <Bell size={18} color={colors.warning} />,
            title: 'Notifications & Sounds',
            subtitle: 'Notification alerts & audio chimes',
            onPress: () => router.push('/(tabs)/more/notifications'),
          })}

          {renderMenuItem({
            icon: isDark ? (
              <Sun size={18} color={colors.warning} />
            ) : (
              <Moon size={18} color={colors.primary} />
            ),
            title: 'Appearance',
            subtitle: isDark ? 'Pastel Dark Theme' : 'Pastel Light Theme',
            onPress: toggleTheme,
            badge: <Badge label={isDark ? 'Dark' : 'Light'} variant="outline" size="sm" />,
          })}

          {renderMenuItem({
            icon: <Settings size={18} color={colors.foreground} />,
            title: 'App Settings',
            subtitle: 'Audio options and account privacy',
            onPress: () => router.push('/(tabs)/more/settings'),
          })}

          {renderMenuItem({
            icon: <UserIcon size={18} color={colors.foreground} />,
            title: 'My Profile',
            subtitle: 'View and update profile information',
            onPress: () => router.push('/(tabs)/more/profile'),
          })}
        </Card>

        {/* Section 4: Sign Out */}
        <Card style={styles.menuGroupCard}>
          {renderMenuItem({
            icon: <LogOut size={18} color={colors.destructive} />,
            title: 'Sign Out',
            subtitle: 'Sign out of this device',
            onPress: handleLogout,
            destructive: true,
          })}
        </Card>
      </ScrollView>

      {/* Super Admin Invite Modal */}
      <Modal visible={adminModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <Card style={[styles.modalCard, { width: '90%' }]}>
            {createdAdminInvite ? (
              <View style={{ alignItems: 'center', paddingVertical: 10 }}>
                <View
                  style={[
                    styles.avatarBox,
                    {
                      width: 56,
                      height: 56,
                      borderRadius: 28,
                      backgroundColor: '#8b5cf620',
                      marginBottom: spacing.md,
                    },
                  ]}
                >
                  <ShieldCheck size={32} color="#8b5cf6" />
                </View>

                <Text
                  style={{
                    fontWeight: '800',
                    color: colors.foreground,
                    fontSize: typography.title,
                    textAlign: 'center',
                  }}
                >
                  Admin Invite Created!
                </Text>
                <Text
                  style={{
                    color: colors.mutedForeground,
                    fontSize: typography.sm,
                    textAlign: 'center',
                    marginTop: 4,
                    marginBottom: spacing.lg,
                  }}
                >
                  Share this invite code to grant system administrator access.
                </Text>

                <View
                  style={[
                    styles.codeBox,
                    {
                      backgroundColor: '#8b5cf612',
                      borderColor: '#8b5cf640',
                    },
                  ]}
                >
                  <Text
                    style={{
                      fontSize: 10,
                      fontWeight: '700',
                      color: colors.mutedForeground,
                      letterSpacing: 1,
                    }}
                  >
                    SYSTEM INVITE CODE
                  </Text>
                  <Text
                    style={{
                      fontSize: 28,
                      fontWeight: '900',
                      color: '#8b5cf6',
                      letterSpacing: 4,
                      marginVertical: 4,
                    }}
                  >
                    {createdAdminInvite.id}
                  </Text>
                  <Text style={{ fontSize: 11, color: colors.mutedForeground }}>
                    Role:{' '}
                    <Text style={{ fontWeight: '700', color: colors.foreground }}>
                      {createdAdminInvite.systemRole}
                    </Text>
                  </Text>
                </View>

                <View style={{ width: '100%', gap: 10, marginTop: spacing.lg }}>
                  <Button
                    title="Share Invite"
                    variant="primary"
                    size="lg"
                    icon={<Share2 size={18} color="#ffffff" />}
                    onPress={() => handleShareAdminInvite(createdAdminInvite)}
                  />
                  <Button
                    title="Done"
                    variant="outline"
                    size="md"
                    onPress={() => setAdminModalVisible(false)}
                  />
                </View>
              </View>
            ) : (
              <View>
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: spacing.sm,
                  }}
                >
                  <Text
                    style={{
                      fontWeight: '800',
                      color: colors.foreground,
                      fontSize: typography.lg,
                    }}
                  >
                    Invite App Admin
                  </Text>
                  <TouchableOpacity onPress={() => setAdminModalVisible(false)}>
                    <X size={20} color={colors.mutedForeground} />
                  </TouchableOpacity>
                </View>

                <Text
                  style={{
                    color: colors.mutedForeground,
                    fontSize: typography.xs,
                    marginBottom: spacing.md,
                  }}
                >
                  Invite a user to have system administrative access across the Kanataran platform.
                </Text>

                <Input
                  label="Recipient Email (Optional)"
                  placeholder="admin@example.com"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  value={adminEmail}
                  onChangeText={setAdminEmail}
                  icon={<Mail size={16} color={colors.mutedForeground} />}
                />

                <Text
                  style={{
                    fontWeight: '700',
                    color: colors.foreground,
                    fontSize: typography.xs,
                    marginBottom: 6,
                    marginTop: 4,
                  }}
                >
                  SYSTEM ROLE *
                </Text>
                <View style={{ flexDirection: 'row', gap: 10, marginBottom: spacing.lg }}>
                  {(['ADMIN', 'SUPER_ADMIN'] as const).map((r) => {
                    const isSelected = adminRole === r;
                    return (
                      <TouchableOpacity
                        key={r}
                        onPress={() => {
                          triggerHaptic('light');
                          setAdminRole(r);
                        }}
                        style={[
                          styles.rolePill,
                          {
                            flex: 1,
                            alignItems: 'center',
                            borderColor: isSelected ? '#8b5cf6' : colors.border,
                            backgroundColor: isSelected ? '#8b5cf618' : colors.card,
                          },
                        ]}
                      >
                        <Text
                          style={{
                            color: isSelected ? '#8b5cf6' : colors.foreground,
                            fontWeight: isSelected ? '700' : '500',
                            fontSize: 12,
                          }}
                        >
                          {r === 'SUPER_ADMIN' ? 'Super Admin' : 'App Admin'}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <Button
                    title="Cancel"
                    variant="ghost"
                    onPress={() => setAdminModalVisible(false)}
                    style={{ flex: 1 }}
                  />
                  <Button
                    title="Generate Invite"
                    variant="primary"
                    onPress={handleCreateAdminInvite}
                    loading={isCreatingAdminInvite}
                    style={{ flex: 1 }}
                  />
                </View>
              </View>
            )}
          </Card>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  userCard: {
    padding: 16,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  userInitial: {
    fontSize: 20,
    fontWeight: '800',
  },
  userName: {
    fontWeight: '800',
  },
  userEmail: {
    marginTop: 2,
  },
  sectionHeader: {
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 6,
    marginLeft: 4,
  },
  menuGroupCard: {
    padding: 0,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  menuIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuTitle: {
    fontWeight: '600',
  },
  menuSubtitle: {
    marginTop: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCard: {
    padding: 20,
    borderRadius: 16,
  },
  avatarBox: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  codeBox: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    width: '100%',
  },
  rolePill: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
});

