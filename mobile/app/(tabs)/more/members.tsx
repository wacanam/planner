// mobile/app/(tabs)/more/members.tsx
import { useRouter } from 'expo-router';
import { Check, Clock, Shield, User as UserIcon, UserCheck, X } from 'lucide-react-native';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
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
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useApproveMember, useCongregationMembers, useUpdateMemberRole } from '@/hooks/useCongregationMembers';
import { canApproveMembers } from '@/lib/permissions';
import { triggerHaptic } from '@/lib/sound';
import type { Member } from '@/types/api';

export default function CongregationMembersScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, activeCongregationId } = useAuth();
  const { colors, typography, spacing, radius } = useTheme();

  const [activeTab, setActiveTab] = useState<'active' | 'pending'>('active');
  const { members = [], isLoading } = useCongregationMembers(activeCongregationId);
  const { approve: approveMember } = useApproveMember();
  const { updateRole } = useUpdateMemberRole();

  const canApprove = canApproveMembers(user?.role);

  const activeMembers = members.filter((m) => m.status === 'active' || !m.status);
  const pendingMembers = members.filter((m) => m.status === 'pending');

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
      <View style={[styles.tabContainer, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
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
              fontSize: typography.sm,
            }}
          >
            Active Publishers ({activeMembers.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => {
            triggerHaptic('light');
            setActiveTab('pending');
          }}
          style={[
            styles.tabBtn,
            activeTab === 'pending' && { borderBottomColor: colors.primary, borderBottomWidth: 2.5 },
          ]}
        >
          <Text
            style={{
              color: activeTab === 'pending' ? colors.primary : colors.mutedForeground,
              fontWeight: activeTab === 'pending' ? '700' : '500',
              fontSize: typography.sm,
            }}
          >
            Join Requests ({pendingMembers.length})
          </Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : activeTab === 'active' ? (
        activeMembers.length === 0 ? (
          <EmptyState
            icon={<UserIcon size={44} color={colors.mutedForeground} />}
            title="No Active Members"
            description="Publishers who join this congregation will appear in this directory."
          />
        ) : (
          <FlatList
            data={activeMembers}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{
              padding: spacing.md,
              paddingBottom: insets.bottom + spacing.xxl,
            }}
            renderItem={({ item }) => (
              <Card style={[styles.memberCard, { marginBottom: spacing.sm }]}>
                <View style={styles.memberRow}>
                  <View style={[styles.avatarBox, { backgroundColor: colors.primary + '20' }]}>
                    <Text style={{ fontWeight: '800', color: colors.primary }}>
                      {item.user?.name ? item.user.name.charAt(0).toUpperCase() : 'P'}
                    </Text>
                  </View>

                  <View style={{ flex: 1, marginLeft: spacing.sm }}>
                    <Text style={{ fontWeight: '700', color: colors.foreground, fontSize: typography.base }}>
                      {item.user?.name || 'Publisher'}
                    </Text>
                    <Text style={{ color: colors.mutedForeground, fontSize: typography.xs }}>
                      {item.user?.email || 'No email provided'}
                    </Text>
                  </View>

                  <Badge
                    label={item.congregationRole || 'publisher'}
                    variant={item.congregationRole === 'service_overseer' ? 'primary' : 'secondary'}
                    size="sm"
                  />
                </View>
              </Card>
            )}
          />
        )
      ) : (
        /* Pending Requests List */
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
                    <Text style={{ fontWeight: '700', color: colors.foreground, fontSize: typography.base }}>
                      {item.user?.name || 'Publisher'}
                    </Text>
                    <Text style={{ color: colors.mutedForeground, fontSize: typography.xs }}>
                      {item.user?.email}
                    </Text>
                  </View>
                </View>

                {item.joinMessage && (
                  <Text style={{ color: colors.mutedForeground, fontSize: typography.xs, marginTop: 8, fontStyle: 'italic' }}>
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
        )
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
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
  },
});
