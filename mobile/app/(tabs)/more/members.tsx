// mobile/app/(tabs)/more/members.tsx
import { useRouter } from 'expo-router';
import {
  Check,
  Clock,
  Copy,
  Crown,
  Mail,
  Plus,
  Search,
  Share2,
  Shield,
  Trash2,
  User as UserIcon,
  UserPlus,
  Users,
  X,
} from 'lucide-react-native';
import { useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  Modal,
  ScrollView,
  Share,
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
import { Input } from '@/components/ui/Input';
import { MembersSkeleton } from '@/components/ui/ScreenSkeletons';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useCongregationGroups } from '@/hooks/useCongregationGroups';
import {
  useApproveMember,
  useCongregationMembers,
  useUpdateMemberRole,
} from '@/hooks/useCongregationMembers';
import { useCongregation } from '@/hooks/useCongregations';
import {
  useCongregationInvitations,
  useCreateInvitation,
  useRevokeInvitation,
} from '@/hooks/useInvitations';
import {
  canApproveMembers,
  canSendCongregationInvite,
  getAllowedCongregationRolesForInviter,
  isUserInGroup,
} from '@/lib/permissions';
import { triggerHaptic } from '@/lib/sound';
import type { Invitation, Member } from '@/types/api';

type DirectoryTab = 'active' | 'my_group' | 'pending' | 'invites';

const ROLE_DISPLAY_NAMES: Record<string, string> = {
  publisher: 'Publisher',
  visiting_publisher: 'Visiting Publisher',
  territory_servant: 'Territory Servant',
  secretary: 'Secretary',
  service_overseer: 'Service Overseer',
  circuit_overseer: 'Circuit Overseer',
};

const GROUP_ROLE_DISPLAY_NAMES: Record<string, string> = {
  member: 'Group Member',
  group_overseer: 'Group Overseer',
  assistant_overseer: 'Assistant Overseer',
};

export default function CongregationMembersScreen() {
  const _router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, activeCongregationId } = useAuth();
  const { colors, typography, spacing, radius } = useTheme();

  const [activeTab, setActiveTab] = useState<DirectoryTab>('active');
  const [searchQuery, setSearchQuery] = useState('');

  const { congregation } = useCongregation(activeCongregationId);
  const { members = [], isLoading: membersLoading } = useCongregationMembers(activeCongregationId);
  const { groups = [], isLoading: groupsLoading } = useCongregationGroups(activeCongregationId);
  const { invitations = [], isLoading: invitesLoading } =
    useCongregationInvitations(activeCongregationId);
  const { createCongregationInvitation, isCreating: isInviting } = useCreateInvitation();
  const { revoke: revokeInvite } = useRevokeInvitation();
  const { approve: approveMember } = useApproveMember();
  const { updateRole } = useUpdateMemberRole();

  // Permissions
  const canApprove = canApproveMembers(user?.role, user?.congregationRole);
  const canInvite = canSendCongregationInvite(user?.role, user?.congregationRole);
  const allowedRoles = useMemo(
    () => getAllowedCongregationRolesForInviter(user?.role, user?.congregationRole),
    [user?.role, user?.congregationRole]
  );

  const isLoading = membersLoading || groupsLoading;

  // Invite Modal state
  const [inviteModalVisible, setInviteModalVisible] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteCongRole, setInviteCongRole] = useState('publisher');
  const [inviteGroupId, setInviteGroupId] = useState<string | null>(null);
  const [inviteGroupRole, setInviteGroupRole] = useState('member');
  const [inviteExpiryDays, setInviteExpiryDays] = useState(14);
  const [createdInvite, setCreatedInvite] = useState<Invitation | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Approve Member Modal state
  const [approveModalVisible, setApproveModalVisible] = useState(false);
  const [approveMemberItem, setApproveMemberItem] = useState<Member | null>(null);
  const [approveCongRole, setApproveCongRole] = useState('publisher');
  const [approveGroupId, setApproveGroupId] = useState<string | null>(null);
  const [approveGroupRole, setApproveGroupRole] = useState('member');
  const [isSubmittingApprove, setIsSubmittingApprove] = useState(false);

  const activeMembers = useMemo(
    () => members.filter((m) => m.status === 'active' || !m.status),
    [members]
  );
  const pendingMembers = useMemo(() => members.filter((m) => m.status === 'pending'), [members]);
  const pendingInvitations = useMemo(
    () => invitations.filter((inv) => inv.status === 'pending'),
    [invitations]
  );

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

  const handleOpenApproveModal = (m: Member) => {
    setApproveMemberItem(m);
    setApproveCongRole(m.congregationRole || 'publisher');
    setApproveGroupId(m.groupId || null);
    setApproveGroupRole('member');
    setApproveModalVisible(true);
  };

  const handleConfirmApprove = async () => {
    if (!approveMemberItem) return;
    setIsSubmittingApprove(true);
    try {
      const reviewerName = user?.name || user?.email || 'Service Overseer';
      await approveMember(
        approveMemberItem.id,
        'active',
        {
          id: user?.id || null,
          name: reviewerName,
          role: user?.role || null,
        },
        {
          congregationRole: approveCongRole,
          groupId: approveGroupId,
          groupRole: approveGroupId ? approveGroupRole : null,
        }
      );
      await triggerHaptic('success');
      setApproveModalVisible(false);
      setApproveMemberItem(null);
    } catch (err: any) {
      triggerHaptic('error');
      Alert.alert('Error', err?.message || 'Failed to approve member.');
    } finally {
      setIsSubmittingApprove(false);
    }
  };

  const handleDecline = async (m: Member) => {
    try {
      const reviewerName = user?.name || user?.email || 'Service Overseer';
      await approveMember(m.id, 'rejected', {
        id: user?.id || null,
        name: reviewerName,
        role: user?.role || null,
      });
      await triggerHaptic('warning');
    } catch {
      triggerHaptic('error');
    }
  };

  const handleOpenInviteModal = () => {
    setInviteEmail('');
    setInviteCongRole('publisher');
    setInviteGroupId(null);
    setInviteGroupRole('member');
    setInviteExpiryDays(14);
    setCreatedInvite(null);
    setCopiedLink(false);
    setInviteModalVisible(true);
  };

  const handleCreateInvite = async () => {
    if (!activeCongregationId || !user?.id) return;
    try {
      const selectedGroup = groups.find((g) => g.id === inviteGroupId);
      const inv = await createCongregationInvitation({
        congregationId: activeCongregationId,
        congregationName: congregation?.name || 'Congregation',
        email: inviteEmail.trim() || null,
        congregationRole: inviteCongRole,
        groupId: inviteGroupId,
        groupName: selectedGroup?.name || null,
        groupRole: inviteGroupId ? inviteGroupRole : null,
        invitedBy: user.id,
        invitedByName: user.name || user.email || 'Overseer',
        invitedByRole: user.congregationRole || user.role || 'Service Overseer',
        expiresInDays: inviteExpiryDays,
      });
      await triggerHaptic('success');
      setCreatedInvite(inv);
    } catch (err: any) {
      triggerHaptic('error');
      Alert.alert('Error', err.message || 'Failed to generate invitation.');
    }
  };

  const handleShareInvite = async (inv: Invitation) => {
    const inviteLink = `https://kanataran.app/invite?code=${inv.id}`;
    const roleText = ROLE_DISPLAY_NAMES[inv.congregationRole || 'publisher'] || inv.congregationRole;
    const msg = `You have been invited by ${inv.invitedByName} to join ${inv.congregationName || 'the congregation'} on Kanataran as ${roleText}.\n\nUse Invite Code: ${inv.id}\nOr tap link: ${inviteLink}`;

    try {
      await Share.share({
        message: msg,
        title: `Invite to join ${inv.congregationName || 'Kanataran'}`,
        url: inviteLink,
      });
      await triggerHaptic('light');
    } catch {
      // User cancelled share
    }
  };

  const handleRevokeInvite = (inv: Invitation) => {
    Alert.alert(
      'Revoke Invitation',
      `Are you sure you want to revoke invite code ${inv.id}? The recipient will no longer be able to use it.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Revoke',
          style: 'destructive',
          onPress: async () => {
            try {
              await revokeInvite(inv.id);
              await triggerHaptic('medium');
            } catch (e: any) {
              Alert.alert('Error', e.message || 'Failed to revoke invite.');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header
        showBack
        title="Members Directory"
        subtitle={`Congregation Publishers (${activeMembers.length})`}
        rightAction={
          canInvite ? (
            <TouchableOpacity
              onPress={() => {
                triggerHaptic('light');
                handleOpenInviteModal();
              }}
              style={[
                styles.inviteHeaderBtn,
                { backgroundColor: `${colors.primary}18`, borderColor: `${colors.primary}40` },
              ]}
            >
              <UserPlus size={16} color={colors.primary} />
              <Text
                style={{
                  color: colors.primary,
                  fontWeight: '700',
                  fontSize: typography.xs,
                  marginLeft: 5,
                }}
              >
                Invite
              </Text>
            </TouchableOpacity>
          ) : undefined
        }
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
              fontSize: 12,
            }}
          >
            All ({activeMembers.length})
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
              fontSize: 12,
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
              fontSize: 12,
            }}
          >
            Requests ({pendingMembers.length})
          </Text>
        </TouchableOpacity>

        {canInvite && (
          <TouchableOpacity
            onPress={() => {
              triggerHaptic('light');
              setActiveTab('invites');
            }}
            style={[
              styles.tabBtn,
              activeTab === 'invites' && {
                borderBottomColor: colors.primary,
                borderBottomWidth: 2.5,
              },
            ]}
          >
            <Text
              style={{
                color: activeTab === 'invites' ? colors.primary : colors.mutedForeground,
                fontWeight: activeTab === 'invites' ? '700' : '500',
                fontSize: 12,
              }}
            >
              Invites ({pendingInvitations.length})
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Search Bar for member lists */}
      {activeTab !== 'pending' && activeTab !== 'invites' && (
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
        <MembersSkeleton />
      ) : activeTab === 'invites' ? (
        /* INVITATIONS TAB */
        pendingInvitations.length === 0 ? (
          <EmptyState
            icon={<UserPlus size={44} color={colors.mutedForeground} />}
            title="No Active Invitations"
            description="Send an invitation link or email to invite members with assigned roles and service groups."
            actionTitle="Invite Member"
            onActionPress={handleOpenInviteModal}
          />
        ) : (
          <FlatList
            data={pendingInvitations}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{
              padding: spacing.md,
              paddingBottom: insets.bottom + spacing.xxl,
            }}
            renderItem={({ item }) => {
              const roleName =
                ROLE_DISPLAY_NAMES[item.congregationRole || 'publisher'] || item.congregationRole;
              const isCircuitOverseer = item.congregationRole === 'circuit_overseer';

              return (
                <Card style={[styles.memberCard, { marginBottom: spacing.sm }]}>
                  <View style={styles.memberRow}>
                    <View
                      style={[
                        styles.avatarBox,
                        {
                          backgroundColor: isCircuitOverseer
                            ? '#8b5cf620'
                            : `${colors.primary}20`,
                        },
                      ]}
                    >
                      {isCircuitOverseer ? (
                        <Crown size={20} color="#8b5cf6" />
                      ) : (
                        <UserPlus size={18} color={colors.primary} />
                      )}
                    </View>

                    <View style={{ flex: 1, marginLeft: spacing.sm }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text
                          style={{
                            fontWeight: '800',
                            color: colors.foreground,
                            fontSize: typography.base,
                          }}
                        >
                          Code: {item.id}
                        </Text>
                        <Badge
                          label={roleName || 'Publisher'}
                          variant={isCircuitOverseer ? 'primary' : 'secondary'}
                          size="sm"
                        />
                      </View>

                      {item.email ? (
                        <Text
                          style={{
                            color: colors.mutedForeground,
                            fontSize: typography.xs,
                            marginTop: 2,
                          }}
                        >
                          To: {item.email}
                        </Text>
                      ) : (
                        <Text
                          style={{
                            color: colors.mutedForeground,
                            fontSize: typography.xs,
                            marginTop: 2,
                          }}
                        >
                          Shareable invite link
                        </Text>
                      )}

                      {item.groupName && (
                        <Text
                          style={{
                            color: colors.primary,
                            fontSize: 11,
                            fontWeight: '600',
                            marginTop: 2,
                          }}
                        >
                          {item.groupName}
                          {item.groupRole && item.groupRole !== 'member'
                            ? ` (${GROUP_ROLE_DISPLAY_NAMES[item.groupRole] || item.groupRole})`
                            : ''}
                        </Text>
                      )}

                      <Text
                        style={{
                          color: colors.mutedForeground,
                          fontSize: 10,
                          marginTop: 4,
                        }}
                      >
                        Invited by {item.invitedByName} • Expires{' '}
                        {new Date(item.expiresAt).toLocaleDateString()}
                      </Text>
                    </View>
                  </View>

                  <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                    <Button
                      title="Share Link"
                      variant="outline"
                      size="sm"
                      icon={<Share2 size={14} color={colors.foreground} />}
                      onPress={() => handleShareInvite(item)}
                      style={{ flex: 1 }}
                    />
                    <Button
                      title="Revoke"
                      variant="ghost"
                      size="sm"
                      icon={<Trash2 size={14} color={colors.destructive} />}
                      onPress={() => handleRevokeInvite(item)}
                      style={{ flex: 1 }}
                    />
                  </View>
                </Card>
              );
            }}
          />
        )
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
                    { backgroundColor: `${colors.primary}10`, borderColor: `${colors.primary}30` },
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
                    <View style={[styles.avatarBox, { backgroundColor: `${colors.primary}20` }]}>
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
                      {(item.approvedByName || item.reviewedByName) && (
                        <Text
                          style={{
                            color: colors.mutedForeground,
                            fontSize: 10,
                            marginTop: 2,
                          }}
                        >
                          Approved by {item.approvedByName || item.reviewedByName}
                        </Text>
                      )}
                    </View>

                    {isOverseer ? (
                      <Badge label="Overseer" variant="primary" size="sm" />
                    ) : isAssistant ? (
                      <Badge label="Assistant" variant="secondary" size="sm" />
                    ) : (
                      <Badge
                        label={ROLE_DISPLAY_NAMES[item.congregationRole || ''] || item.congregationRole || 'Publisher'}
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
              const isCO = item.congregationRole === 'circuit_overseer';

              return (
                <Card style={[styles.memberCard, { marginBottom: spacing.sm }]}>
                  <View style={styles.memberRow}>
                    <View
                      style={[
                        styles.avatarBox,
                        {
                          backgroundColor: isCO
                            ? '#8b5cf620'
                            : `${colors.primary}20`,
                        },
                      ]}
                    >
                      {item.user?.avatarUrl ? (
                        <Image
                          source={{ uri: item.user.avatarUrl }}
                          style={styles.avatarImage}
                          resizeMode="cover"
                        />
                      ) : (
                        <Text
                          style={{
                            fontWeight: '800',
                            color: isCO ? '#8b5cf6' : colors.primary,
                          }}
                        >
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
                      {(item.approvedByName || item.reviewedByName) && (
                        <Text
                          style={{
                            color: colors.mutedForeground,
                            fontSize: 10,
                            marginTop: 2,
                          }}
                        >
                          Approved by {item.approvedByName || item.reviewedByName}
                        </Text>
                      )}
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
                      label={
                        ROLE_DISPLAY_NAMES[item.congregationRole || 'publisher'] ||
                        item.congregationRole ||
                        'publisher'
                      }
                      variant={
                        isCO
                          ? 'primary'
                          : item.congregationRole === 'service_overseer'
                            ? 'primary'
                            : 'secondary'
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
                <View style={[styles.avatarBox, { backgroundColor: `${colors.warning}20` }]}>
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
                    onPress={() => handleOpenApproveModal(item)}
                    style={{ flex: 1 }}
                  />
                </View>
              )}
            </Card>
          )}
        />
      )}

      {/* Invite Member Modal */}
      <Modal visible={inviteModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <Card style={[styles.modalCard, { width: '92%', maxHeight: '85%' }]}>
            <ScrollView showsVerticalScrollIndicator={false}>
              {createdInvite ? (
                /* INVITATION GENERATED VIEW */
                <View style={{ alignItems: 'center', paddingVertical: 10 }}>
                  <View
                    style={[
                      styles.avatarBox,
                      {
                        width: 56,
                        height: 56,
                        borderRadius: 28,
                        backgroundColor: `${colors.primary}20`,
                        marginBottom: spacing.md,
                      },
                    ]}
                  >
                    <Check size={32} color={colors.primary} />
                  </View>

                  <Text
                    style={{
                      fontWeight: '800',
                      color: colors.foreground,
                      fontSize: typography.title,
                      textAlign: 'center',
                    }}
                  >
                    Invitation Created!
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
                    Share this code or link with the publisher to join with their assigned role.
                  </Text>

                  {/* Invite Code Box */}
                  <View
                    style={[
                      styles.codeBox,
                      {
                        backgroundColor: `${colors.primary}12`,
                        borderColor: `${colors.primary}40`,
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
                      INVITE CODE
                    </Text>
                    <Text
                      style={{
                        fontSize: 28,
                        fontWeight: '900',
                        color: colors.primary,
                        letterSpacing: 4,
                        marginVertical: 4,
                      }}
                    >
                      {createdInvite.id}
                    </Text>
                    <Text style={{ fontSize: 11, color: colors.mutedForeground }}>
                      Assigned:{' '}
                      <Text style={{ fontWeight: '700', color: colors.foreground }}>
                        {ROLE_DISPLAY_NAMES[createdInvite.congregationRole || ''] ||
                          createdInvite.congregationRole}
                      </Text>
                      {createdInvite.groupName ? ` • ${createdInvite.groupName}` : ''}
                    </Text>
                  </View>

                  <View style={{ width: '100%', gap: 10, marginTop: spacing.lg }}>
                    <Button
                      title="Share Invite"
                      variant="primary"
                      size="lg"
                      icon={<Share2 size={18} color="#ffffff" />}
                      onPress={() => handleShareInvite(createdInvite)}
                    />
                    <Button
                      title="Done"
                      variant="outline"
                      size="md"
                      onPress={() => setInviteModalVisible(false)}
                    />
                  </View>
                </View>
              ) : (
                /* INVITATION FORM VIEW */
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
                      Invite Member
                    </Text>
                    <TouchableOpacity onPress={() => setInviteModalVisible(false)}>
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
                    Send an invite link or email to join {congregation?.name || 'the congregation'}{' '}
                    with predefined roles.
                  </Text>

                  {/* Invitee Email (Optional) */}
                  <Input
                    label="Invitee Email (Optional)"
                    placeholder="e.g. publisher@example.com"
                    autoCapitalize="none"
                    keyboardType="email-address"
                    value={inviteEmail}
                    onChangeText={setInviteEmail}
                    icon={<Mail size={16} color={colors.mutedForeground} />}
                  />

                  {/* Congregation Role Selector */}
                  <Text
                    style={[
                      styles.sectionLabel,
                      { color: colors.foreground, fontSize: typography.xs, marginTop: spacing.sm },
                    ]}
                  >
                    CONGREGATION ROLE *
                  </Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: spacing.md }}>
                    {allowedRoles.map((r) => {
                      const isSelected = inviteCongRole === r;
                      return (
                        <TouchableOpacity
                          key={r}
                          onPress={() => {
                            triggerHaptic('light');
                            setInviteCongRole(r);
                          }}
                          style={[
                            styles.rolePill,
                            {
                              borderColor: isSelected ? colors.primary : colors.border,
                              backgroundColor: isSelected ? `${colors.primary}18` : colors.card,
                            },
                          ]}
                        >
                          <Text
                            style={{
                              color: isSelected ? colors.primary : colors.foreground,
                              fontWeight: isSelected ? '700' : '500',
                              fontSize: 12,
                            }}
                          >
                            {ROLE_DISPLAY_NAMES[r] || r}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {/* Service Group Selector */}
                  <Text
                    style={[
                      styles.sectionLabel,
                      { color: colors.foreground, fontSize: typography.xs },
                    ]}
                  >
                    SERVICE GROUP (OPTIONAL)
                  </Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: spacing.md }}>
                    <TouchableOpacity
                      onPress={() => {
                        triggerHaptic('light');
                        setInviteGroupId(null);
                      }}
                      style={[
                        styles.rolePill,
                        {
                          borderColor: inviteGroupId === null ? colors.primary : colors.border,
                          backgroundColor:
                            inviteGroupId === null ? `${colors.primary}18` : colors.card,
                        },
                      ]}
                    >
                      <Text
                        style={{
                          color: inviteGroupId === null ? colors.primary : colors.foreground,
                          fontWeight: inviteGroupId === null ? '700' : '500',
                          fontSize: 12,
                        }}
                      >
                        None / Unassigned
                      </Text>
                    </TouchableOpacity>

                    {groups.map((g) => {
                      const isSelected = inviteGroupId === g.id;
                      return (
                        <TouchableOpacity
                          key={g.id}
                          onPress={() => {
                            triggerHaptic('light');
                            setInviteGroupId(g.id);
                          }}
                          style={[
                            styles.rolePill,
                            {
                              borderColor: isSelected ? colors.primary : colors.border,
                              backgroundColor: isSelected ? `${colors.primary}18` : colors.card,
                            },
                          ]}
                        >
                          <Text
                            style={{
                              color: isSelected ? colors.primary : colors.foreground,
                              fontWeight: isSelected ? '700' : '500',
                              fontSize: 12,
                            }}
                          >
                            {g.name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {/* Service Group Role (only shown if a group is chosen) */}
                  {inviteGroupId && (
                    <>
                      <Text
                        style={[
                          styles.sectionLabel,
                          { color: colors.foreground, fontSize: typography.xs },
                        ]}
                      >
                        SERVICE GROUP ROLE
                      </Text>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: spacing.md }}>
                        {(['member', 'group_overseer', 'assistant_overseer'] as const).map(
                          (gr) => {
                            const isSelected = inviteGroupRole === gr;
                            return (
                              <TouchableOpacity
                                key={gr}
                                onPress={() => {
                                  triggerHaptic('light');
                                  setInviteGroupRole(gr);
                                }}
                                style={[
                                  styles.rolePill,
                                  {
                                    borderColor: isSelected ? colors.primary : colors.border,
                                    backgroundColor: isSelected
                                      ? `${colors.primary}18`
                                      : colors.card,
                                  },
                                ]}
                              >
                                <Text
                                  style={{
                                    color: isSelected ? colors.primary : colors.foreground,
                                    fontWeight: isSelected ? '700' : '500',
                                    fontSize: 12,
                                  }}
                                >
                                  {GROUP_ROLE_DISPLAY_NAMES[gr]}
                                </Text>
                              </TouchableOpacity>
                            );
                          }
                        )}
                      </View>
                    </>
                  )}

                  {/* Expiration Days */}
                  <Text
                    style={[
                      styles.sectionLabel,
                      { color: colors.foreground, fontSize: typography.xs },
                    ]}
                  >
                    INVITATION EXPIRATION
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 8, marginBottom: spacing.lg }}>
                    {[7, 14, 30].map((days) => {
                      const isSelected = inviteExpiryDays === days;
                      return (
                        <TouchableOpacity
                          key={days}
                          onPress={() => {
                            triggerHaptic('light');
                            setInviteExpiryDays(days);
                          }}
                          style={[
                            styles.rolePill,
                            {
                              flex: 1,
                              alignItems: 'center',
                              borderColor: isSelected ? colors.primary : colors.border,
                              backgroundColor: isSelected ? `${colors.primary}18` : colors.card,
                            },
                          ]}
                        >
                          <Text
                            style={{
                              color: isSelected ? colors.primary : colors.foreground,
                              fontWeight: isSelected ? '700' : '500',
                              fontSize: 12,
                            }}
                          >
                            {days} Days
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {/* Actions */}
                  <View style={styles.modalButtonRow}>
                    <Button
                      title="Cancel"
                      variant="ghost"
                      onPress={() => setInviteModalVisible(false)}
                      style={{ flex: 1, marginRight: spacing.sm }}
                    />
                    <Button
                      title="Generate Invite"
                      variant="primary"
                      onPress={handleCreateInvite}
                      loading={isInviting}
                      style={{ flex: 1 }}
                    />
                  </View>
                </View>
              )}
            </ScrollView>
          </Card>
        </View>
      </Modal>

      {/* Approve Member Modal */}
      <Modal visible={approveModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <Card style={[styles.modalCard, { width: '92%', maxHeight: '85%' }]}>
            <ScrollView showsVerticalScrollIndicator={false}>
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
                    Approve Membership
                  </Text>
                  <TouchableOpacity onPress={() => setApproveModalVisible(false)}>
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
                  Accept this publisher into {congregation?.name || 'the congregation'} and optionally assign a service group and role.
                </Text>

                {approveMemberItem && (
                  <View
                    style={{
                      padding: spacing.sm,
                      borderRadius: radius.md,
                      backgroundColor: `${colors.primary}10`,
                      marginBottom: spacing.md,
                    }}
                  >
                    <Text style={{ fontWeight: '700', color: colors.foreground, fontSize: typography.sm }}>
                      {approveMemberItem.user?.name || 'Publisher'}
                    </Text>
                    <Text style={{ color: colors.mutedForeground, fontSize: typography.xs }}>
                      {approveMemberItem.user?.email}
                    </Text>
                    {approveMemberItem.joinMessage && (
                      <Text
                        style={{
                          color: colors.mutedForeground,
                          fontSize: typography.xs,
                          fontStyle: 'italic',
                          marginTop: 4,
                        }}
                      >
                        "{approveMemberItem.joinMessage}"
                      </Text>
                    )}
                  </View>
                )}

                {/* Congregation Role Selector */}
                <Text
                  style={[
                    styles.sectionLabel,
                    { color: colors.foreground, fontSize: typography.xs },
                  ]}
                >
                  CONGREGATION ROLE *
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: spacing.md }}>
                  {allowedRoles.map((r) => {
                    const isSelected = approveCongRole === r;
                    return (
                      <TouchableOpacity
                        key={r}
                        onPress={() => {
                          triggerHaptic('light');
                          setApproveCongRole(r);
                        }}
                        style={[
                          styles.rolePill,
                          {
                            borderColor: isSelected ? colors.primary : colors.border,
                            backgroundColor: isSelected ? `${colors.primary}18` : colors.card,
                          },
                        ]}
                      >
                        <Text
                          style={{
                            color: isSelected ? colors.primary : colors.foreground,
                            fontWeight: isSelected ? '700' : '500',
                            fontSize: 12,
                          }}
                        >
                          {ROLE_DISPLAY_NAMES[r] || r}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Service Group Selector */}
                <Text
                  style={[
                    styles.sectionLabel,
                    { color: colors.foreground, fontSize: typography.xs },
                  ]}
                >
                  SERVICE GROUP (OPTIONAL)
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: spacing.md }}>
                  <TouchableOpacity
                    onPress={() => {
                      triggerHaptic('light');
                      setApproveGroupId(null);
                    }}
                    style={[
                      styles.rolePill,
                      {
                        borderColor: approveGroupId === null ? colors.primary : colors.border,
                        backgroundColor:
                          approveGroupId === null ? `${colors.primary}18` : colors.card,
                      },
                    ]}
                  >
                    <Text
                      style={{
                        color: approveGroupId === null ? colors.primary : colors.foreground,
                        fontWeight: approveGroupId === null ? '700' : '500',
                        fontSize: 12,
                      }}
                    >
                      None / Unassigned
                    </Text>
                  </TouchableOpacity>

                  {groups.map((g) => {
                    const isSelected = approveGroupId === g.id;
                    return (
                      <TouchableOpacity
                        key={g.id}
                        onPress={() => {
                          triggerHaptic('light');
                          setApproveGroupId(g.id);
                        }}
                        style={[
                          styles.rolePill,
                          {
                            borderColor: isSelected ? colors.primary : colors.border,
                            backgroundColor: isSelected ? `${colors.primary}18` : colors.card,
                          },
                        ]}
                      >
                        <Text
                          style={{
                            color: isSelected ? colors.primary : colors.foreground,
                            fontWeight: isSelected ? '700' : '500',
                            fontSize: 12,
                          }}
                        >
                          {g.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Group Role Selector (only when group selected) */}
                {approveGroupId !== null && (
                  <>
                    <Text
                      style={[
                        styles.sectionLabel,
                        { color: colors.foreground, fontSize: typography.xs },
                      ]}
                    >
                      ROLE IN SERVICE GROUP *
                    </Text>
                    <View
                      style={{
                        flexDirection: 'row',
                        flexWrap: 'wrap',
                        gap: 6,
                        marginBottom: spacing.md,
                      }}
                    >
                      {(['member', 'group_overseer', 'assistant_overseer'] as const).map((gr) => {
                        const isSelected = approveGroupRole === gr;
                        return (
                          <TouchableOpacity
                            key={gr}
                            onPress={() => {
                              triggerHaptic('light');
                              setApproveGroupRole(gr);
                            }}
                            style={[
                              styles.rolePill,
                              {
                                borderColor: isSelected ? colors.primary : colors.border,
                                backgroundColor: isSelected ? `${colors.primary}18` : colors.card,
                              },
                            ]}
                          >
                            <Text
                              style={{
                                color: isSelected ? colors.primary : colors.foreground,
                                fontWeight: isSelected ? '700' : '500',
                                fontSize: 12,
                              }}
                            >
                              {GROUP_ROLE_DISPLAY_NAMES[gr] || gr}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </>
                )}

                {/* Modal Actions */}
                <View style={styles.modalButtonRow}>
                  <Button
                    title="Cancel"
                    variant="ghost"
                    onPress={() => setApproveModalVisible(false)}
                    disabled={isSubmittingApprove}
                    style={{ flex: 1, marginRight: spacing.sm }}
                  />
                  <Button
                    title={isSubmittingApprove ? 'Approving…' : 'Approve Member'}
                    variant="primary"
                    onPress={handleConfirmApprove}
                    disabled={isSubmittingApprove}
                    style={{ flex: 1 }}
                  />
                </View>
              </View>
            </ScrollView>
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
  inviteHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
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
  modalButtonRow: {
    flexDirection: 'row',
    marginTop: 10,
  },
  rolePill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  codeBox: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    width: '100%',
  },
});

