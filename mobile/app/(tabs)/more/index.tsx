// mobile/app/(tabs)/more/index.tsx
import { useRouter } from 'expo-router';
import {
  Bell,
  Building2,
  ChevronRight,
  FileText,
  LogOut,
  Moon,
  Settings,
  Sun,
  User as UserIcon,
  Users,
} from 'lucide-react-native';
import React from 'react';
import { Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Header } from '@/components/ui/Header';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useCongregationGroups } from '@/hooks/useCongregationGroups';
import { useCongregation } from '@/hooks/useCongregations';
import { isUserInGroup } from '@/lib/permissions';
import { triggerHaptic } from '@/lib/sound';

export default function MoreMenuScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, activeCongregationId, logout } = useAuth();
  const { congregation } = useCongregation(activeCongregationId);
  const { groups = [] } = useCongregationGroups(activeCongregationId);
  const { colors, typography, spacing, radius, isDark, toggleTheme } = useTheme();

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
            subtitle: 'Congregation publishers & approvals',
            onPress: () => router.push('/(tabs)/more/members'),
          })}

          {renderMenuItem({
            icon: <Building2 size={18} color={colors.primary} />,
            title: 'Switch Congregation',
            subtitle: congregation ? `Current: ${congregation.name}` : 'Select workspace',
            onPress: () => router.push('/select-congregation'),
          })}
        </Card>

        {/* Section 2: App & Preferences */}
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

        {/* Section 3: Sign Out */}
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
});
