// mobile/app/(tabs)/more/groups.tsx
import { useRouter } from 'expo-router';
import {
  ChevronRight,
  Crown,
  Edit2,
  FolderOpen,
  MapPin,
  Plus,
  Shield,
  Trash2,
  UserCheck,
  User as UserIcon,
  Users,
  X,
} from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
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
import { EmptyState } from '@/components/ui/EmptyState';
import { Header } from '@/components/ui/Header';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import {
  useCongregationGroups,
  useCreateGroup,
  useDeleteGroup,
  useUpdateGroup,
} from '@/hooks/useCongregationGroups';
import { useCongregationMembers } from '@/hooks/useCongregationMembers';
import { useCongregationTerritories } from '@/hooks/useTerritories';
import { canManageGroups, isUserInGroup } from '@/lib/permissions';
import { triggerHaptic } from '@/lib/sound';
import type { Group, Member } from '@/types/api';

export default function ServiceGroupsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, activeCongregationId } = useAuth();
  const { colors, typography, spacing, radius } = useTheme();

  const { groups = [], isLoading } = useCongregationGroups(activeCongregationId);
  const { members = [] } = useCongregationMembers(activeCongregationId);
  const { territories = [] } = useCongregationTerritories(activeCongregationId);
  const { create: createGroup, isCreating } = useCreateGroup(activeCongregationId || '');
  const { update: updateGroup, isUpdating } = useUpdateGroup();
  const { remove: deleteGroup } = useDeleteGroup();

  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [editGroup, setEditGroup] = useState<Group | null>(null);
  const [selectedGroupDetail, setSelectedGroupDetail] = useState<Group | null>(null);

  const [groupName, setGroupName] = useState('');
  const [selectedOverseerId, setSelectedOverseerId] = useState<string | null>(null);
  const [selectedAssistantId, setSelectedAssistantId] = useState<string | null>(null);

  const canManage = canManageGroups(user?.role, user?.congregationRole);
  const activeMembers = useMemo(
    () => members.filter((m) => m.status === 'active' || !m.status),
    [members]
  );

  // Find the current user's group
  const myGroup = useMemo(() => {
    return groups.find((g) => isUserInGroup(user, g) || g.id === user?.groupId);
  }, [groups, user]);

  const handleOpenCreate = () => {
    setGroupName('');
    setSelectedOverseerId(null);
    setSelectedAssistantId(null);
    setCreateModalVisible(true);
  };

  const handleOpenEdit = (group: Group) => {
    setEditGroup(group);
    setGroupName(group.name);
    setSelectedOverseerId(group.overseerId || null);
    setSelectedAssistantId(group.assistantOverseerId || null);
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) return;
    const overseer = activeMembers.find((m) => m.userId === selectedOverseerId);
    const assistant = activeMembers.find((m) => m.userId === selectedAssistantId);
    try {
      await createGroup(
        groupName.trim(),
        selectedOverseerId,
        overseer?.user?.name || overseer?.user?.email || null,
        selectedAssistantId,
        assistant?.user?.name || assistant?.user?.email || null
      );
      await triggerHaptic('success');
      setCreateModalVisible(false);
      setGroupName('');
      setSelectedOverseerId(null);
      setSelectedAssistantId(null);
    } catch {
      triggerHaptic('error');
    }
  };

  const handleUpdateGroup = async () => {
    if (!editGroup || !groupName.trim()) return;
    const overseer = activeMembers.find((m) => m.userId === selectedOverseerId);
    const assistant = activeMembers.find((m) => m.userId === selectedAssistantId);
    try {
      await updateGroup(editGroup.id, {
        name: groupName.trim(),
        overseerId: selectedOverseerId,
        overseerName: overseer?.user?.name || overseer?.user?.email || null,
        assistantOverseerId: selectedAssistantId,
        assistantOverseerName: assistant?.user?.name || assistant?.user?.email || null,
      });
      await triggerHaptic('success');
      setEditGroup(null);
      if (selectedGroupDetail?.id === editGroup.id) {
        setSelectedGroupDetail({
          ...selectedGroupDetail,
          name: groupName.trim(),
          overseerId: selectedOverseerId,
          overseerName: overseer?.user?.name || overseer?.user?.email || null,
          assistantOverseerId: selectedAssistantId,
          assistantOverseerName: assistant?.user?.name || assistant?.user?.email || null,
        });
      }
    } catch {
      triggerHaptic('error');
    }
  };

  const handleDeleteGroup = (groupId: string, name: string) => {
    Alert.alert('Delete Group', `Are you sure you want to delete "${name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteGroup(groupId);
          if (selectedGroupDetail?.id === groupId) {
            setSelectedGroupDetail(null);
          }
          await triggerHaptic('success');
        },
      },
    ]);
  };

  const getGroupMembers = (groupId: string): Member[] => {
    return activeMembers.filter((m) => m.groupId === groupId);
  };

  const getGroupTerritories = (groupId: string) => {
    return territories.filter((t) => t.groupId === groupId);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header
        showBack
        title="Service Groups"
        subtitle={`Congregation Groups (${groups.length})`}
        rightAction={
          canManage ? (
            <TouchableOpacity
              onPress={handleOpenCreate}
              style={[styles.addBtn, { backgroundColor: colors.primary }]}
            >
              <Plus size={20} color="#ffffff" />
            </TouchableOpacity>
          ) : null
        }
      />

      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : groups.length === 0 ? (
        <EmptyState
          icon={<Users size={44} color={colors.mutedForeground} />}
          title="No Service Groups"
          description="Create your first service group to organize publishers and assign group territories."
          actionTitle={canManage ? 'Create Group' : undefined}
          onActionPress={canManage ? handleOpenCreate : undefined}
        />
      ) : (
        <FlatList
          data={groups}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{
            padding: spacing.md,
            paddingBottom: insets.bottom + spacing.xxl,
          }}
          ListHeaderComponent={
            myGroup ? (
              <View style={{ marginBottom: spacing.md }}>
                <Text
                  style={[
                    styles.sectionLabel,
                    { color: colors.mutedForeground, fontSize: typography.xs },
                  ]}
                >
                  YOUR ASSIGNED GROUP
                </Text>
                <Card
                  onPress={() => {
                    triggerHaptic('light');
                    setSelectedGroupDetail(myGroup);
                  }}
                  style={[
                    styles.myGroupCard,
                    { backgroundColor: colors.primary + '12', borderColor: colors.primary + '35' },
                  ]}
                >
                  <View style={styles.groupHeader}>
                    <View style={[styles.iconBox, { backgroundColor: colors.primary }]}>
                      <Users size={20} color="#ffffff" />
                    </View>
                    <View style={{ flex: 1, marginLeft: spacing.sm }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text
                          style={[
                            styles.groupTitle,
                            { color: colors.foreground, fontSize: typography.base },
                          ]}
                        >
                          {myGroup.name}
                        </Text>
                        <Badge label="Your Group" variant="primary" size="sm" />
                      </View>
                      <Text
                        style={{
                          color: colors.mutedForeground,
                          fontSize: typography.xs,
                          marginTop: 2,
                        }}
                      >
                        Overseer: {myGroup.overseerName || 'Unassigned'}
                        {myGroup.assistantOverseerName
                          ? ` • Asst: ${myGroup.assistantOverseerName}`
                          : ''}
                      </Text>
                    </View>
                    <ChevronRight size={18} color={colors.primary} />
                  </View>
                </Card>
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
                  ALL CONGREGATION GROUPS
                </Text>
              </View>
            ) : null
          }
          renderItem={({ item }) => {
            const groupMembers = getGroupMembers(item.id);
            const isCurrentMyGroup = myGroup?.id === item.id;

            return (
              <Card
                onPress={() => {
                  triggerHaptic('light');
                  setSelectedGroupDetail(item);
                }}
                style={[
                  styles.groupCard,
                  { marginBottom: spacing.md },
                  isCurrentMyGroup && { borderColor: colors.primary + '40' },
                ]}
              >
                <View style={styles.groupHeader}>
                  <View style={[styles.iconBox, { backgroundColor: colors.secondary + '25' }]}>
                    <Users size={20} color={colors.secondaryForeground} />
                  </View>
                  <View style={{ flex: 1, marginLeft: spacing.sm }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text
                        style={[
                          styles.groupTitle,
                          { color: colors.foreground, fontSize: typography.base },
                        ]}
                      >
                        {item.name}
                      </Text>
                      {isCurrentMyGroup && <Badge label="Your Group" variant="primary" size="sm" />}
                    </View>
                    <Text
                      style={{
                        color: colors.mutedForeground,
                        fontSize: typography.xs,
                        marginTop: 2,
                      }}
                    >
                      Overseer: {item.overseerName || 'Unassigned'}
                      {item.assistantOverseerName ? ` • Asst: ${item.assistantOverseerName}` : ''}
                    </Text>
                    <Text
                      style={{
                        color: colors.mutedForeground,
                        fontSize: typography.xs,
                        marginTop: 1,
                      }}
                    >
                      {groupMembers.length} publishers assigned
                    </Text>
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    {canManage && (
                      <TouchableOpacity
                        onPress={(e) => {
                          e.stopPropagation();
                          handleOpenEdit(item);
                        }}
                        style={{ padding: 6 }}
                      >
                        <Edit2 size={16} color={colors.primary} />
                      </TouchableOpacity>
                    )}
                    {canManage && (
                      <TouchableOpacity
                        onPress={(e) => {
                          e.stopPropagation();
                          handleDeleteGroup(item.id, item.name);
                        }}
                        style={{ padding: 6 }}
                      >
                        <Trash2 size={16} color={colors.destructive} />
                      </TouchableOpacity>
                    )}
                    <ChevronRight size={16} color={colors.mutedForeground} />
                  </View>
                </View>
              </Card>
            );
          }}
        />
      )}

      {/* Group Detail Inspector Modal */}
      <Modal visible={!!selectedGroupDetail} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <Card style={[styles.modalCard, { maxHeight: '85%', width: '92%' }]}>
            {selectedGroupDetail && (
              <>
                <View style={styles.detailHeader}>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        styles.modalTitle,
                        { color: colors.foreground, fontSize: typography.lg },
                      ]}
                    >
                      {selectedGroupDetail.name}
                    </Text>
                    <Text style={{ color: colors.mutedForeground, fontSize: typography.xs }}>
                      Service Group & Member Directory
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setSelectedGroupDetail(null)}
                    style={styles.closeBtn}
                  >
                    <X size={20} color={colors.foreground} />
                  </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} style={{ marginTop: spacing.md }}>
                  {/* Leadership Section */}
                  <Text
                    style={[
                      styles.sectionLabel,
                      { color: colors.mutedForeground, fontSize: typography.xs },
                    ]}
                  >
                    GROUP LEADERSHIP
                  </Text>

                  {/* Group Overseer */}
                  <View
                    style={[
                      styles.roleCard,
                      { backgroundColor: colors.muted + '40', borderColor: colors.border },
                    ]}
                  >
                    <View style={[styles.roleIconCircle, { backgroundColor: '#f59e0b20' }]}>
                      <Crown size={16} color="#d97706" />
                    </View>
                    <View style={{ flex: 1, marginLeft: spacing.sm }}>
                      <Text
                        style={{
                          fontSize: typography.xs,
                          color: colors.mutedForeground,
                          fontWeight: '600',
                        }}
                      >
                        GROUP OVERSEER
                      </Text>
                      <Text
                        style={{
                          fontSize: typography.sm,
                          fontWeight: '700',
                          color: colors.foreground,
                        }}
                      >
                        {selectedGroupDetail.overseerName || 'Unassigned'}
                      </Text>
                    </View>
                    <Badge label="Overseer" variant="primary" size="sm" />
                  </View>

                  {/* Assistant Group Overseer */}
                  <View
                    style={[
                      styles.roleCard,
                      {
                        backgroundColor: colors.muted + '40',
                        borderColor: colors.border,
                        marginTop: 8,
                      },
                    ]}
                  >
                    <View style={[styles.roleIconCircle, { backgroundColor: '#3b82f620' }]}>
                      <Shield size={16} color="#2563eb" />
                    </View>
                    <View style={{ flex: 1, marginLeft: spacing.sm }}>
                      <Text
                        style={{
                          fontSize: typography.xs,
                          color: colors.mutedForeground,
                          fontWeight: '600',
                        }}
                      >
                        ASSISTANT OVERSEER
                      </Text>
                      <Text
                        style={{
                          fontSize: typography.sm,
                          fontWeight: '700',
                          color: colors.foreground,
                        }}
                      >
                        {selectedGroupDetail.assistantOverseerName || 'Unassigned'}
                      </Text>
                    </View>
                    <Badge label="Assistant" variant="secondary" size="sm" />
                  </View>

                  {/* Groupmates List */}
                  {(() => {
                    const groupmates = getGroupMembers(selectedGroupDetail.id);
                    return (
                      <View style={{ marginTop: spacing.lg }}>
                        <Text
                          style={[
                            styles.sectionLabel,
                            { color: colors.mutedForeground, fontSize: typography.xs },
                          ]}
                        >
                          GROUPMATES & PUBLISHERS ({groupmates.length})
                        </Text>

                        {groupmates.length === 0 ? (
                          <Text
                            style={{
                              color: colors.mutedForeground,
                              fontSize: typography.xs,
                              fontStyle: 'italic',
                              marginVertical: 8,
                            }}
                          >
                            No publishers currently assigned to this group.
                          </Text>
                        ) : (
                          groupmates.map((gm) => {
                            const isOverseer = gm.userId === selectedGroupDetail.overseerId;
                            const isAssistant =
                              gm.userId === selectedGroupDetail.assistantOverseerId;

                            return (
                              <View
                                key={gm.id}
                                style={[
                                  styles.groupmateRow,
                                  { borderBottomColor: colors.border },
                                  (isOverseer || isAssistant) && {
                                    backgroundColor: colors.muted + '25',
                                  },
                                ]}
                              >
                                <View
                                  style={[
                                    styles.avatarCircle,
                                    { backgroundColor: colors.primary + '20' },
                                  ]}
                                >
                                  {gm.user?.avatarUrl ? (
                                    <Image
                                      source={{ uri: gm.user.avatarUrl }}
                                      style={styles.avatarImage}
                                      resizeMode="cover"
                                    />
                                  ) : (
                                    <Text
                                      style={{
                                        fontWeight: '700',
                                        color: colors.primary,
                                        fontSize: 12,
                                      }}
                                    >
                                      {gm.user?.name ? gm.user.name.charAt(0).toUpperCase() : 'P'}
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
                                    {gm.user?.name || 'Publisher'}
                                  </Text>
                                  {gm.user?.email && (
                                    <Text
                                      style={{
                                        color: colors.mutedForeground,
                                        fontSize: typography.xs,
                                      }}
                                    >
                                      {gm.user.email}
                                    </Text>
                                  )}
                                </View>

                                {isOverseer ? (
                                  <Badge label="Overseer" variant="primary" size="sm" />
                                ) : isAssistant ? (
                                  <Badge label="Assistant" variant="secondary" size="sm" />
                                ) : (
                                  <Badge
                                    label={gm.congregationRole || 'Publisher'}
                                    variant="outline"
                                    size="sm"
                                  />
                                )}
                              </View>
                            );
                          })
                        )}
                      </View>
                    );
                  })()}

                  {/* Group Territories */}
                  {(() => {
                    const groupTerritories = getGroupTerritories(selectedGroupDetail.id);
                    if (groupTerritories.length === 0) return null;
                    return (
                      <View style={{ marginTop: spacing.lg, marginBottom: spacing.md }}>
                        <Text
                          style={[
                            styles.sectionLabel,
                            { color: colors.mutedForeground, fontSize: typography.xs },
                          ]}
                        >
                          GROUP TERRITORIES ({groupTerritories.length})
                        </Text>
                        {groupTerritories.map((t) => (
                          <TouchableOpacity
                            key={t.id}
                            onPress={() => {
                              setSelectedGroupDetail(null);
                              router.push(`/(tabs)/territories/${t.id}`);
                            }}
                            style={[
                              styles.territoryRow,
                              { backgroundColor: colors.card, borderColor: colors.border },
                            ]}
                          >
                            <View style={styles.numberBadge}>
                              <Text
                                style={{ color: colors.primary, fontWeight: '800', fontSize: 13 }}
                              >
                                #{t.number}
                              </Text>
                            </View>
                            <View style={{ flex: 1, marginLeft: spacing.sm }}>
                              <Text
                                style={{
                                  fontWeight: '600',
                                  color: colors.foreground,
                                  fontSize: typography.xs,
                                }}
                              >
                                {t.name}
                              </Text>
                              <Text style={{ color: colors.mutedForeground, fontSize: 11 }}>
                                {t.householdsCount || 0} doors &bull; {t.coveragePercent || 0}%
                                worked
                              </Text>
                            </View>
                            <ChevronRight size={14} color={colors.mutedForeground} />
                          </TouchableOpacity>
                        ))}
                      </View>
                    );
                  })()}
                </ScrollView>

                <View style={{ flexDirection: 'row', gap: 10, marginTop: spacing.md }}>
                  {canManage && (
                    <Button
                      title="Edit Group"
                      variant="outline"
                      onPress={() => {
                        handleOpenEdit(selectedGroupDetail);
                      }}
                      style={{ flex: 1 }}
                    />
                  )}
                  <Button
                    title="Close"
                    onPress={() => setSelectedGroupDetail(null)}
                    style={{ flex: 1 }}
                  />
                </View>
              </>
            )}
          </Card>
        </View>
      </Modal>

      {/* Create / Edit Group Modal */}
      <Modal visible={createModalVisible || !!editGroup} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <Card style={[styles.modalCard, { width: '92%', maxHeight: '85%' }]}>
            <Text
              style={[styles.modalTitle, { color: colors.foreground, fontSize: typography.lg }]}
            >
              {editGroup ? 'Edit Service Group' : 'Create Service Group'}
            </Text>
            <Text
              style={{
                color: colors.mutedForeground,
                fontSize: typography.xs,
                marginBottom: spacing.md,
              }}
            >
              {editGroup
                ? 'Update group leadership and publishers'
                : 'Add a new service group and designate overseers'}
            </Text>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Input
                label="Group Name *"
                placeholder="e.g. Group 1 - North"
                value={groupName}
                onChangeText={setGroupName}
              />

              {/* Select Overseer */}
              <Text
                style={[
                  styles.fieldLabel,
                  { color: colors.foreground, fontSize: typography.xs, marginTop: spacing.sm },
                ]}
              >
                Group Overseer
              </Text>
              <View style={[styles.pickerBox, { borderColor: colors.border }]}>
                <TouchableOpacity
                  onPress={() => setSelectedOverseerId(null)}
                  style={[
                    styles.pickerOption,
                    !selectedOverseerId && { backgroundColor: colors.primary + '15' },
                  ]}
                >
                  <Text
                    style={{
                      fontSize: typography.xs,
                      color: !selectedOverseerId ? colors.primary : colors.mutedForeground,
                    }}
                  >
                    None (Unassigned)
                  </Text>
                </TouchableOpacity>
                {activeMembers.map((m) => (
                  <TouchableOpacity
                    key={m.userId}
                    onPress={() => setSelectedOverseerId(m.userId)}
                    style={[
                      styles.pickerOption,
                      selectedOverseerId === m.userId && { backgroundColor: colors.primary + '15' },
                    ]}
                  >
                    <Text
                      style={{
                        fontSize: typography.xs,
                        fontWeight: selectedOverseerId === m.userId ? '700' : '400',
                        color: selectedOverseerId === m.userId ? colors.primary : colors.foreground,
                      }}
                    >
                      {m.user?.name || m.user?.email || 'Publisher'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Select Assistant Overseer */}
              <Text
                style={[
                  styles.fieldLabel,
                  { color: colors.foreground, fontSize: typography.xs, marginTop: spacing.md },
                ]}
              >
                Assistant Group Overseer
              </Text>
              <View style={[styles.pickerBox, { borderColor: colors.border }]}>
                <TouchableOpacity
                  onPress={() => setSelectedAssistantId(null)}
                  style={[
                    styles.pickerOption,
                    !selectedAssistantId && { backgroundColor: colors.secondary + '20' },
                  ]}
                >
                  <Text
                    style={{
                      fontSize: typography.xs,
                      color: !selectedAssistantId
                        ? colors.secondaryForeground
                        : colors.mutedForeground,
                    }}
                  >
                    None (Unassigned)
                  </Text>
                </TouchableOpacity>
                {activeMembers.map((m) => (
                  <TouchableOpacity
                    key={m.userId}
                    onPress={() => setSelectedAssistantId(m.userId)}
                    style={[
                      styles.pickerOption,
                      selectedAssistantId === m.userId && {
                        backgroundColor: colors.secondary + '20',
                      },
                    ]}
                  >
                    <Text
                      style={{
                        fontSize: typography.xs,
                        fontWeight: selectedAssistantId === m.userId ? '700' : '400',
                        color:
                          selectedAssistantId === m.userId
                            ? colors.secondaryForeground
                            : colors.foreground,
                      }}
                    >
                      {m.user?.name || m.user?.email || 'Publisher'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <View style={{ flexDirection: 'row', gap: 10, marginTop: spacing.md }}>
              <Button
                title="Cancel"
                variant="ghost"
                onPress={() => {
                  setCreateModalVisible(false);
                  setEditGroup(null);
                }}
                style={{ flex: 1 }}
              />
              <Button
                title={editGroup ? 'Save Changes' : 'Create Group'}
                onPress={editGroup ? handleUpdateGroup : handleCreateGroup}
                loading={isCreating || isUpdating}
                style={{ flex: 1 }}
              />
            </View>
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
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionLabel: {
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 6,
    marginLeft: 2,
  },
  myGroupCard: {
    padding: 14,
    borderWidth: 1.5,
  },
  groupCard: {
    padding: 14,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupTitle: {
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCard: {
    padding: 20,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  closeBtn: {
    padding: 4,
  },
  modalTitle: {
    fontWeight: '800',
  },
  roleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  roleIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupmateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
  },
  avatarCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  territoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 6,
  },
  numberBadge: {
    minWidth: 32,
    alignItems: 'center',
  },
  fieldLabel: {
    fontWeight: '700',
    marginBottom: 4,
  },
  pickerBox: {
    borderWidth: 1,
    borderRadius: 10,
    maxHeight: 120,
    overflow: 'hidden',
  },
  pickerOption: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#00000010',
  },
});
