// mobile/app/(tabs)/more/groups.tsx
import { useRouter } from 'expo-router';
import { Plus, Trash2, UserCheck, Users } from 'lucide-react-native';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Header } from '@/components/ui/Header';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useCongregationGroups, useCreateGroup, useDeleteGroup } from '@/hooks/useCongregationGroups';
import { useCongregationMembers } from '@/hooks/useCongregationMembers';
import { canManageGroups } from '@/lib/permissions';
import { triggerHaptic } from '@/lib/sound';

export default function ServiceGroupsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, activeCongregationId } = useAuth();
  const { colors, typography, spacing, radius } = useTheme();

  const { groups = [], isLoading } = useCongregationGroups(activeCongregationId);
  const { members = [] } = useCongregationMembers(activeCongregationId);
  const { create: createGroup, isCreating } = useCreateGroup(activeCongregationId || '');
  const { remove: deleteGroup } = useDeleteGroup();

  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [selectedOverseerId, setSelectedOverseerId] = useState<string | null>(null);

  const canManage = canManageGroups(user?.role);

  const handleCreateGroup = async () => {
    if (!groupName.trim()) return;
    const overseer = members.find((m) => m.userId === selectedOverseerId);
    try {
      await createGroup(groupName.trim(), selectedOverseerId, overseer?.user?.name || null);
      await triggerHaptic('success');
      setCreateModalVisible(false);
      setGroupName('');
      setSelectedOverseerId(null);
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
          await triggerHaptic('success');
        },
      },
    ]);
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
              onPress={() => setCreateModalVisible(true)}
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
          onActionPress={canManage ? () => setCreateModalVisible(true) : undefined}
        />
      ) : (
        <FlatList
          data={groups}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{
            padding: spacing.md,
            paddingBottom: insets.bottom + spacing.xxl,
          }}
          renderItem={({ item }) => {
            const groupMembers = members.filter((m) => m.groupId === item.id);
            return (
              <Card style={[styles.groupCard, { marginBottom: spacing.md }]}>
                <View style={styles.groupHeader}>
                  <View style={[styles.iconBox, { backgroundColor: colors.secondary + '25' }]}>
                    <Users size={20} color={colors.secondaryForeground} />
                  </View>
                  <View style={{ flex: 1, marginLeft: spacing.sm }}>
                    <Text style={[styles.groupTitle, { color: colors.foreground, fontSize: typography.base }]}>
                      {item.name}
                    </Text>
                    <Text style={{ color: colors.mutedForeground, fontSize: typography.xs }}>
                      Overseer: {item.overseerName || 'Unassigned'} &bull; {groupMembers.length} members
                    </Text>
                  </View>

                  {canManage && (
                    <TouchableOpacity onPress={() => handleDeleteGroup(item.id, item.name)} style={{ padding: 6 }}>
                      <Trash2 size={16} color={colors.destructive} />
                    </TouchableOpacity>
                  )}
                </View>
              </Card>
            );
          }}
        />
      )}

      {/* Create Group Modal */}
      <Modal visible={createModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <Card style={[styles.modalCard, { width: '90%' }]}>
            <Text style={[styles.modalTitle, { color: colors.foreground, fontSize: typography.lg }]}>
              Create Service Group
            </Text>
            <Text style={{ color: colors.mutedForeground, fontSize: typography.xs, marginBottom: spacing.md }}>
              Add a new service group to your congregation
            </Text>

            <Input
              label="Group Name *"
              placeholder="e.g. Group 1 - North"
              value={groupName}
              onChangeText={setGroupName}
            />

            <View style={{ flexDirection: 'row', gap: 10, marginTop: spacing.md }}>
              <Button
                title="Cancel"
                variant="ghost"
                onPress={() => setCreateModalVisible(false)}
                style={{ flex: 1 }}
              />
              <Button
                title="Create Group"
                onPress={handleCreateGroup}
                loading={isCreating}
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
  modalTitle: {
    fontWeight: '800',
  },
});
