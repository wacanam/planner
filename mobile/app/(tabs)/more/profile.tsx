// mobile/app/(tabs)/more/profile.tsx
import { useRouter } from 'expo-router';
import { doc, updateDoc } from 'firebase/firestore';
import {
  AlertTriangle,
  Building2,
  Check,
  ChevronRight,
  Crown,
  LogOut,
  Mail,
  Shield,
  User as UserIcon,
  Users,
} from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
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
import { useCongregationMembers } from '@/hooks/useCongregationMembers';
import { useCongregation } from '@/hooks/useCongregations';
import { FIRESTORE_COLLECTIONS, getPlannerFirestore, nowIso } from '@/lib/firebase';
import { isUserInGroup } from '@/lib/permissions';
import { triggerHaptic } from '@/lib/sound';

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, activeCongregationId, logout } = useAuth();
  const { congregation } = useCongregation(activeCongregationId);
  const { groups = [] } = useCongregationGroups(activeCongregationId);
  const { members = [] } = useCongregationMembers(activeCongregationId);
  const { colors, typography, spacing, radius } = useTheme();

  const [name, setName] = useState(user?.name || '');
  const [isUpdating, setIsUpdating] = useState(false);
  const [successMsg, setSuccessMsg] = useState(false);

  // User's group in the congregation
  const myGroup = useMemo(() => {
    return groups.find((g) => isUserInGroup(user, g) || g.id === user?.groupId);
  }, [groups, user]);

  // Groupmates list with robust resolution from group.members + congregationMembers
  const groupmates = useMemo(() => {
    if (!myGroup) return [];

    const map = new Map<
      string,
      {
        id: string;
        userId: string;
        name: string;
        email: string;
        role?: string;
        congregationRole?: string | null;
      }
    >();

    for (const gm of myGroup.members || []) {
      const uid = gm.userId || gm.id;
      if (!uid) continue;
      const memberDoc = members.find((m) => (m.userId || m.id) === uid);
      map.set(uid, {
        id: uid,
        userId: uid,
        name: gm.user?.name || memberDoc?.user?.name || (gm as any).name || memberDoc?.user?.email || 'Publisher',
        email: gm.user?.email || memberDoc?.user?.email || '',
        role:
          gm.role ||
          (uid === myGroup.overseerId
            ? 'group_overseer'
            : uid === myGroup.assistantOverseerId
              ? 'assistant_overseer'
              : 'member'),
        congregationRole: memberDoc?.congregationRole || null,
      });
    }

    for (const m of members) {
      if (m.groupId === myGroup.id && (m.status === 'active' || !m.status)) {
        const uid = m.userId || m.id;
        if (!uid || map.has(uid)) continue;
        map.set(uid, {
          id: uid,
          userId: uid,
          name: m.user?.name || m.user?.email || 'Publisher',
          email: m.user?.email || '',
          role:
            uid === myGroup.overseerId
              ? 'group_overseer'
              : uid === myGroup.assistantOverseerId
                ? 'assistant_overseer'
                : 'member',
          congregationRole: m.congregationRole || null,
        });
      }
    }

    if (myGroup.overseerId && !map.has(myGroup.overseerId)) {
      const memberDoc = members.find((m) => (m.userId || m.id) === myGroup.overseerId);
      map.set(myGroup.overseerId, {
        id: myGroup.overseerId,
        userId: myGroup.overseerId,
        name: myGroup.overseerName || memberDoc?.user?.name || 'Group Overseer',
        email: memberDoc?.user?.email || '',
        role: 'group_overseer',
        congregationRole: memberDoc?.congregationRole || null,
      });
    }

    if (myGroup.assistantOverseerId && !map.has(myGroup.assistantOverseerId)) {
      const memberDoc = members.find((m) => (m.userId || m.id) === myGroup.assistantOverseerId);
      map.set(myGroup.assistantOverseerId, {
        id: myGroup.assistantOverseerId,
        userId: myGroup.assistantOverseerId,
        name: myGroup.assistantOverseerName || memberDoc?.user?.name || 'Assistant Overseer',
        email: memberDoc?.user?.email || '',
        role: 'assistant_overseer',
        congregationRole: memberDoc?.congregationRole || null,
      });
    }

    return Array.from(map.values());
  }, [members, myGroup]);

  // User's specific role in the group
  const userGroupRole = useMemo(() => {
    if (!myGroup || !user?.id) return null;
    if (myGroup.overseerId === user.id) return { label: 'Group Overseer', icon: '👑' };
    if (myGroup.assistantOverseerId === user.id) return { label: 'Assistant Overseer', icon: '🛡️' };
    return { label: 'Member', icon: '👤' };
  }, [myGroup, user?.id]);

  const handleUpdateName = async () => {
    if (!name.trim() || !user?.id) return;
    setIsUpdating(true);
    try {
      const firestore = getPlannerFirestore();
      await updateDoc(doc(firestore, FIRESTORE_COLLECTIONS.users, user.id), {
        name: name.trim(),
        updatedAt: nowIso(),
      });
      await triggerHaptic('success');
      setSuccessMsg(true);
      setTimeout(() => setSuccessMsg(false), 2000);
    } catch {
      triggerHaptic('error');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
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

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <Header showBack title="My Profile" subtitle="Account details & role" />

      <ScrollView
        contentContainerStyle={{
          padding: spacing.md,
          paddingBottom: insets.bottom + spacing.xxl,
        }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Profile Avatar Card */}
        <Card style={styles.card}>
          <View style={styles.avatarSection}>
            <View style={[styles.avatarCircle, { backgroundColor: colors.primary }]}>
              <Text style={styles.avatarLetter}>
                {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </Text>
            </View>
            <Text style={[styles.profileName, { color: colors.foreground, fontSize: typography.lg }]}>
              {user?.name || 'Publisher'}
            </Text>
            <Text style={{ color: colors.mutedForeground, fontSize: typography.xs, marginTop: 2 }}>
              {user?.email}
            </Text>
            <View style={{ flexDirection: 'row', gap: 6, marginTop: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
              <Badge label={user?.role || 'PUBLISHER'} variant="primary" />
              {user?.congregationRole && <Badge label={user.congregationRole} variant="secondary" />}
              {congregation && <Badge label={congregation.name} variant="outline" />}
            </View>
          </View>

          {successMsg && (
            <View style={[styles.successBox, { backgroundColor: colors.success + '15' }]}>
              <Check size={16} color={colors.success} />
              <Text style={{ color: colors.success, fontSize: typography.xs, fontWeight: '600', marginLeft: 6 }}>
                Profile updated successfully!
              </Text>
            </View>
          )}

          <View style={{ marginTop: spacing.lg }}>
            <Input
              label="Full Name"
              value={name}
              onChangeText={setName}
              icon={<UserIcon size={18} color={colors.mutedForeground} />}
            />

            <Input
              label="Email Address"
              value={user?.email || ''}
              editable={false}
              icon={<Mail size={18} color={colors.mutedForeground} />}
              style={{ opacity: 0.65 }}
            />

            <Button
              title="Save Changes"
              onPress={handleUpdateName}
              loading={isUpdating}
              size="md"
              style={{ marginTop: spacing.xs }}
            />
          </View>
        </Card>

        {/* My Service Group Section */}
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground, fontSize: typography.xs, marginTop: spacing.lg }]}>
          MY SERVICE GROUP & LEADERSHIP
        </Text>
        <Card style={styles.card}>
          {myGroup ? (
            <View>
              {/* Group Name Header */}
              <View style={styles.groupHeaderRow}>
                <View style={[styles.groupIconBox, { backgroundColor: colors.primary + '20' }]}>
                  <Users size={20} color={colors.primary} />
                </View>
                <View style={{ flex: 1, marginLeft: spacing.sm }}>
                  <Text style={[styles.groupName, { color: colors.foreground, fontSize: typography.base }]}>
                    {myGroup.name}
                  </Text>
                  <Text style={{ color: colors.mutedForeground, fontSize: typography.xs }}>
                    {groupmates.length} Publishers in group
                  </Text>
                </View>
                {userGroupRole && (
                  <Badge label={`${userGroupRole.icon} ${userGroupRole.label}`} variant="primary" size="sm" />
                )}
              </View>

              {/* Leadership details */}
              <View style={[styles.leadershipBox, { backgroundColor: colors.muted + '35', borderColor: colors.border }]}>
                {/* Overseer */}
                <View style={styles.leaderRow}>
                  <View style={[styles.miniIcon, { backgroundColor: '#f59e0b20' }]}>
                    <Crown size={13} color="#d97706" />
                  </View>
                  <Text style={{ fontSize: typography.xs, color: colors.mutedForeground, width: 90 }}>
                    Overseer:
                  </Text>
                  <Text style={{ fontSize: typography.xs, fontWeight: '700', color: colors.foreground, flex: 1 }}>
                    {myGroup.overseerName || 'Unassigned'}
                  </Text>
                </View>

                {/* Assistant Overseer */}
                <View style={[styles.leaderRow, { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, paddingTop: 8, marginTop: 8 }]}>
                  <View style={[styles.miniIcon, { backgroundColor: '#3b82f620' }]}>
                    <Shield size={13} color="#2563eb" />
                  </View>
                  <Text style={{ fontSize: typography.xs, color: colors.mutedForeground, width: 90 }}>
                    Assistant:
                  </Text>
                  <Text style={{ fontSize: typography.xs, fontWeight: '700', color: colors.foreground, flex: 1 }}>
                    {myGroup.assistantOverseerName || 'Unassigned'}
                  </Text>
                </View>
              </View>

              {/* Groupmates preview */}
              {groupmates.length > 0 && (
                <View style={{ marginTop: spacing.md }}>
                  <Text style={{ fontSize: typography.xs, color: colors.mutedForeground, fontWeight: '600', marginBottom: 6 }}>
                    Groupmates ({groupmates.length}):
                  </Text>
                  <View style={styles.groupmateChips}>
                    {groupmates.slice(0, 6).map((gm) => (
                      <View key={gm.id} style={[styles.chip, { backgroundColor: colors.muted + '50' }]}>
                        <Text style={{ fontSize: 11, color: colors.foreground, fontWeight: '500' }}>
                          {gm.name || gm.email?.split('@')[0] || 'Publisher'}
                        </Text>
                      </View>
                    ))}
                    {groupmates.length > 6 && (
                      <View style={[styles.chip, { backgroundColor: colors.primary + '15' }]}>
                        <Text style={{ fontSize: 11, color: colors.primary, fontWeight: '700' }}>
                          +{groupmates.length - 6} more
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              )}

              {/* Button to view full group */}
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => {
                  triggerHaptic('light');
                  router.push('/(tabs)/more/groups');
                }}
                style={[styles.viewGroupBtn, { borderTopColor: colors.border }]}
              >
                <Text style={{ color: colors.primary, fontSize: typography.xs, fontWeight: '700' }}>
                  View Full Service Group & Territories
                </Text>
                <ChevronRight size={14} color={colors.primary} />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{ paddingVertical: 10 }}>
              <Text style={{ color: colors.mutedForeground, fontSize: typography.xs, fontStyle: 'italic' }}>
                You are not currently assigned to a service group. Contact your service overseer to be assigned.
              </Text>
            </View>
          )}
        </Card>

        {/* Sign Out Card */}
        <Card style={[styles.card, { marginTop: spacing.lg }]}>
          <Button
            title="Sign Out"
            variant="destructive"
            onPress={handleSignOut}
            size="lg"
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
  card: {
    padding: 18,
  },
  sectionLabel: {
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 6,
    marginLeft: 4,
  },
  avatarSection: {
    alignItems: 'center',
  },
  avatarCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '800',
  },
  profileName: {
    fontWeight: '800',
    marginTop: 10,
  },
  successBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    borderRadius: 8,
    marginTop: 14,
  },
  groupHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  groupIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupName: {
    fontWeight: '800',
  },
  leadershipBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  leaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  miniIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  groupmateChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  viewGroupBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
