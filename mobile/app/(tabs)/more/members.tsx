// mobile/app/(tabs)/more/members.tsx
import { useRouter } from 'expo-router';
import {
  Check,
  Clock,
  Crown,
  Search,
  Shield,
  UserCheck,
  User as UserIcon,
  Users,
  X,
} from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Header } from '@/components/ui/Header';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useCongregationGroups } from '@/hooks/useCongregationGroups';
import {
  useApproveMember,
  useCongregationMembers,
  useUpdateMemberRole,
} from '@/hooks/useCongregationMembers';
import { canApproveMembers, isUserInGroup } from '@/lib/permissions';
import { triggerHaptic } from '@/lib/sound';
import type { Member } from '@/types/api';

type DirectoryTab = 'active' | 'my_group' | 'pending';

export default function CongregationMembersScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, activeCongregationId } = useAuth();
  const { colors, typography, spacing, radius } = useTheme();

  const [activeTab, setActiveTab] = useState<DirectoryTab>('active');
  const [searchQuery, setSearchQuery] = useState('');

  const { members = [], isLoading: membersLoading } = useCongregationMembers(activeCongregationId);
  const { groups = [], isLoading: groupsLoading } = useCongregationGroups(activeCongregationId);
  const { approve: approveMember } = useApproveMember();
  const { updateRole } = useUpdateMemberRole();

  const canApprove = canApproveMembers(user?.role);
  const isLoading = membersLoading || groupsLoading;

  const activeMembers = useMemo(
    () => members.filter((m) => m.status === 'active' || !m.status),
    [members]
  );
  const pendingMembers = useMemo(() => members.filter((m) => m.status === 'pending'), [members]);

  // Current user's group
  const myGroup = useMemo(() => {
    return groups.find((g) => isUserInGroup(user, g) || g.id === user?.groupId);
  }, [groups, user]);

  // Groupmates belonging to current user's group
  const myGroupMembers = useMemo(() => {
    if (!myGroup) return [];
    return activeMembers.filter((m) => m.groupId === myGroup.id);
  }, [activeMembers, myGroup]);

  // Filtered members based on search query
  const filteredActiveMembers = useMemo(() => {
    if (!searchQuery.trim()) return activeMembers;
    const q = searchQuery.toLowerCase();
    return activeMembers.filter(
      (m) => m.user?.name?.toLowerCase().includes(q) || m.user?.email?.toLowerCase().includes(q)
    );
  }, [activeMembers, searchQuery]);

  const filteredGroupMembers = useMemo(() => {
    if (!searchQuery.trim()) return myGroupMembers;
    const q = searchQuery.toLowerCase();
    return myGroupMembers.filter(
      (m) => m.user?.name?.toLowerCase().includes(q) || m.user?.email?.toLowerCase().includes(q)
    );
  }, [myGroupMembers, searchQuery]);

  const handleApprove = async (m: Member) => {
    try {
      await approveMember(m.id, 'active');
      await triggerHaptic('success');
    } catch {
      triggerHaptic('error');
    }
  };

  const handleDecline = async (m: Member) => {
    try {
      await approveMember(m.id, 'rejected');
      await triggerHaptic('warning');
    } catch {
      triggerHaptic('error');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header
        showBack
        title="Members Directory"
        subtitle={`Congregation Publishers (${activeMembers.length})`}
      />

      {/* Tabs Switcher */}
      <View
        style={[
          styles.tabContainer,
          { backgroundColor: colors.card, borderBottomColor: colors.border },
        ]}
      >
        <TouchableOpacity
          onPress={() => {
            triggerHaptic('light');
            setActiveTab('active');
          }}
          style={[
            styles.tabBtn,
            activeTab === 'active' && { borderBottomColor: colors.primary, borderBottomWidth: 2.5 },
          ]}
        >
          <Text
            style={{
              color: activeTab === 'active' ? colors.primary : colors.mutedForeground,
              fontWeight: activeTab === 'active' ? '700' : '500',
              fontSize: typography.xs,
            }}
          >
            All Publishers ({activeMembers.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => {
            triggerHaptic('light');
            setActiveTab('my_group');
          }}
          style={[
            styles.tabBtn,
            activeTab === 'my_group' && {
              borderBottomColor: colors.primary,
              borderBottomWidth: 2.5,
            },
          ]}
        >
          <Text
            style={{
              color: activeTab === 'my_group' ? colors.primary : colors.mutedForeground,
              fontWeight: activeTab === 'my_group' ? '700' : '500',
              fontSize: typography.xs,
            }}
          >
            ★ My Group ({myGroupMembers.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => {
            triggerHaptic('light');
            setActiveTab('pending');
          }}
          style={[
            styles.tabBtn,
            activeTab === 'pending' && {
              borderBottomColor: colors.primary,
              borderBottomWidth: 2.5,
            },
          ]}
        >
          <Text
            style={{
              color: activeTab === 'pending' ? colors.primary : colors.mutedForeground,
              fontWeight: activeTab === 'pending' ? '700' : '500',
              fontSize: typography.xs,
            }}
          >
            Requests ({pendingMembers.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar for member lists */}
      {activeTab !== 'pending' && (
        <View
          style={[
            styles.searchBox,
            { backgroundColor: colors.card, borderBottomColor: colors.border },
          ]}
        >
          <Search size={16} color={colors.mutedForeground} />
          <TextInput
            placeholder={
              activeTab === 'my_group'
                ? 'Search groupmates…'
                : 'Search publishers by name or email…'
            }
            placeholderTextColor={colors.mutedForeground}
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={[styles.searchInput, { color: colors.foreground, fontSize: typography.sm }]}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={{ padding: 4 }}>
              <X size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
          )}
        </View>
      )}

      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : activeTab === 'my_group' ? (
        /* MY GROUP TAB */
        !myGroup ? (
          <EmptyState
            icon={<Users size={44} color={colors.mutedForeground} />}
            title="No Service Group Assigned"
            description="You are not currently assigned to a service group. Contact your service overseer to be assigned."
          />
        ) : (
          <FlatList
            data={filteredGroupMembers}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{
              padding: spacing.md,
              paddingBottom: insets.bottom + spacing.xxl,
            }}
            ListHeaderComponent={
              <View style={{ marginBottom: spacing.md }}>
                {/* Group Banner */}
                <Card
                  style={[
                    styles.myGroupBanner,
                    { backgroundColor: colors.primary + '10', borderColor: colors.primary + '30' },
                  ]}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={[styles.avatarBox, { backgroundColor: colors.primary }]}>
                      <Users size={20} color="#ffffff" />
                    </View>
                    <View style={{ flex: 1, marginLeft: spacing.sm }}>
                      <Text
                        style={{
                          fontWeight: '800',
                          color: colors.foreground,
                          fontSize: typography.base,
                        }}
                      >
                        {myGroup.name}
                      </Text>
                      <Text style={{ color: colors.mutedForeground, fontSize: typography.xs }}>
                        {myGroupMembers.length} groupmates assigned
                      </Text>
                    </View>
                  </View>
                </Card>

                {/* Group Leadership Cards */}
                <Text
                  style={[
                    styles.sectionLabel,
                    {
                      color: colors.mutedForeground,
                      fontSize: typography.xs,
                      marginTop: spacing.md,
                    },
                  ]}
                >
                  GROUP LEADERSHIP
                </Text>

                {/* Overseer Card */}
                <Card
                  style={[
                    styles.leadershipCard,
                    { marginBottom: spacing.xs, borderColor: '#f59e0b40' },
                  ]}
                >
                  <View style={styles.memberRow}>
                    <View style={[styles.avatarBox, { backgroundColor: '#f59e0b20' }]}>
                      <Crown size={18} color="#d97706" />
                    </View>
                    <View style={{ flex: 1, marginLeft: spacing.sm }}>
                      <Text
                        style={{ fontSize: 10, color: colors.mutedForeground, fontWeight: '700' }}
                      >
                        GROUP OVERSEER
                      </Text>
                      <Text
                        style={{
                          fontWeight: '700',
                          color: colors.foreground,
                          fontSize: typography.sm,
                        }}
                      >
                        {myGroup.overseerName || 'Unassigned'}
                      </Text>
                    </View>
                    <Badge label="Overseer" variant="primary" size="sm" />
                  </View>
                </Card>

                {/* Assistant Overseer Card */}
                <Card
                  style={[
                    styles.leadershipCard,
                    { marginBottom: spacing.md, borderColor: '#3b82f640' },
                  ]}
                >
                  <View style={styles.memberRow}>
                    <View style={[styles.avatarBox, { backgroundColor: '#3b82f620' }]}>
                      <Shield size={18} color="#2563eb" />
                    </View>
                    <View style={{ flex: 1, marginLeft: spacing.sm }}>
                      <Text
                        style={{ fontSize: 10, color: colors.mutedForeground, fontWeight: '700' }}
                      >
                        ASSISTANT OVERSEER
                      </Text>
                      <Text
                        style={{
                          fontWeight: '700',
                          color: colors.foreground,
                          fontSize: typography.sm,
                        }}
                      >
                        {myGroup.assistantOverseerName || 'Unassigned'}
                      </Text>
                    </View>
                    <Badge label="Assistant" variant="secondary" size="sm" />
                  </View>
                </Card>

                <Text
                  style={[
                    styles.sectionLabel,
                    { color: colors.mutedForeground, fontSize: typography.xs },
                  ]}
                >
                  GROUPMATES ({filteredGroupMembers.length})
                </Text>
              </View>
            }
            renderItem={({ item }) => {
              const isOverseer = item.userId === myGroup.overseerId;
              const isAssistant = item.userId === myGroup.assistantOverseerId;

              return (
                <Card style={[styles.memberCard, { marginBottom: spacing.sm }]}>
                  <View style={styles.memberRow}>
                    <View style={[styles.avatarBox, { backgroundColor: colors.primary + '20' }]}>
                      {item.user?.avatarUrl ? (
                        <Image
                          source={{ uri: item.user.avatarUrl }}
                          style={styles.avatarImage}
                          resizeMode="cover"
                        />
                      ) : (
                        <Text style={{ fontWeight: '800', color: colors.primary }}>
                          {item.user?.name ? item.user.name.charAt(0).toUpperCase() : 'P'}
                        </Text>
                      )}
                    </View>

                    <View style={{ flex: 1, marginLeft: spacing.sm }}>
                      <Text
                        style={{
                          fontWeight: '700',
                          color: colors.foreground,
                          fontSize: typography.sm,
                        }}
                      >
                        {item.user?.name || 'Publisher'}
                      </Text>
                      <Text style={{ color: colors.mutedForeground, fontSize: typography.xs }}>
                        {item.user?.email || 'No email provided'}
                      </Text>
                    </View>

                    {isOverseer ? (
                      <Badge label="Overseer" variant="primary" size="sm" />
                    ) : isAssistant ? (
                      <Badge label="Assistant" variant="secondary" size="sm" />
                    ) : (
                      <Badge
                        label={item.congregationRole || 'Publisher'}
                        variant="outline"
                        size="sm"
                      />
                    )}
                  </View>
                </Card>
              );
            }}
          />
        )
      ) : activeTab === 'active' ? (
        /* ALL PUBLISHERS TAB */
        filteredActiveMembers.length === 0 ? (
          <EmptyState
            icon={<UserIcon size={44} color={colors.mutedForeground} />}
            title="No Publishers Found"
            description="No publishers matched your search filter."
          />
        ) : (
          <FlatList
            data={filteredActiveMembers}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{
              padding: spacing.md,
              paddingBottom: insets.bottom + spacing.xxl,
            }}
            renderItem={({ item }) => {
              const memberGroup = groups.find((g) => g.id === item.groupId);

              return (
                <Card style={[styles.memberCard, { marginBottom: spacing.sm }]}>
                  <View style={styles.memberRow}>
                    <View style={[styles.avatarBox, { backgroundColor: colors.primary + '20' }]}>
                      {item.user?.avatarUrl ? (
                        <Image
                          source={{ uri: item.user.avatarUrl }}
                          style={styles.avatarImage}
                          resizeMode="cover"
                        />
                      ) : (
                        <Text style={{ fontWeight: '800', color: colors.primary }}>
                          {item.user?.name ? item.user.name.charAt(0).toUpperCase() : 'P'}
                        </Text>
                      )}
                    </View>

                    <View style={{ flex: 1, marginLeft: spacing.sm }}>
                      <Text
                        style={{
                          fontWeight: '700',
                          color: colors.foreground,
                          fontSize: typography.base,
                        }}
                      >
                        {item.user?.name || 'Publisher'}
                      </Text>
                      <Text style={{ color: colors.mutedForeground, fontSize: typography.xs }}>
                        {item.user?.email || 'No email provided'}
                      </Text>
                      {memberGroup && (
                        <Text
                          style={{
                            color: colors.primary,
                            fontSize: 11,
                            fontWeight: '600',
                            marginTop: 2,
                          }}
                        >
                          {memberGroup.name}
                        </Text>
                      )}
                    </View>

                    <Badge
                      label={item.congregationRole || 'publisher'}
                      variant={
                        item.congregationRole === 'service_overseer' ? 'primary' : 'secondary'
                      }
                      size="sm"
                    />
                  </View>
                </Card>
              );
            }}
          />
        )
      ) : /* PENDING REQUESTS TAB */
      pendingMembers.length === 0 ? (
        <EmptyState
          icon={<Clock size={44} color={colors.mutedForeground} />}
          title="No Pending Requests"
          description="New requests to join your congregation will appear here."
        />
      ) : (
        <FlatList
          data={pendingMembers}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{
            padding: spacing.md,
            paddingBottom: insets.bottom + spacing.xxl,
          }}
          renderItem={({ item }) => (
            <Card style={[styles.memberCard, { marginBottom: spacing.sm }]}>
              <View style={styles.memberRow}>
                <View style={[styles.avatarBox, { backgroundColor: colors.warning + '20' }]}>
                  <Clock size={18} color={colors.warning} />
                </View>
                <View style={{ flex: 1, marginLeft: spacing.sm }}>
                  <Text
                    style={{
                      fontWeight: '700',
                      color: colors.foreground,
                      fontSize: typography.base,
                    }}
                  >
                    {item.user?.name || 'Publisher'}
                  </Text>
                  <Text style={{ color: colors.mutedForeground, fontSize: typography.xs }}>
                    {item.user?.email}
                  </Text>
                </View>
              </View>

              {item.joinMessage && (
                <Text
                  style={{
                    color: colors.mutedForeground,
                    fontSize: typography.xs,
                    marginTop: 8,
                    fontStyle: 'italic',
                  }}
                >
                  "{item.joinMessage}"
                </Text>
              )}

              {canApprove && (
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                  <Button
                    title="Decline"
                    variant="ghost"
                    size="sm"
                    onPress={() => handleDecline(item)}
                    style={{ flex: 1 }}
                  />
                  <Button
                    title="Approve"
                    variant="primary"
                    size="sm"
                    onPress={() => handleApprove(item)}
                    style={{ flex: 1 }}
                  />
                </View>
              )}
            </Card>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    paddingVertical: 4,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  myGroupBanner: {
    padding: 12,
    borderWidth: 1,
  },
  sectionLabel: {
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 6,
    marginLeft: 2,
  },
  leadershipCard: {
    padding: 12,
    borderWidth: 1,
  },
  memberCard: {
    padding: 14,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
});
