// mobile/app/(tabs)/assignments/index.tsx
import { useRouter } from 'expo-router';
import { Calendar, ChevronRight, Sparkles, Users } from 'lucide-react-native';
import { useMemo } from 'react';
import { FlatList, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Header } from '@/components/ui/Header';
import { MyAssignmentsSkeleton } from '@/components/ui/ScreenSkeletons';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useMyAssignments } from '@/hooks/useAssignments';
import { useCongregationGroups } from '@/hooks/useCongregationGroups';
import { useCongregationMembers } from '@/hooks/useCongregationMembers';
import { useHouseholds } from '@/hooks/useHouseholds';
import { useCongregationTerritories } from '@/hooks/useTerritories';
import { getUserGroupIds, isUserInGroup, resolveUserAssignments } from '@/lib/permissions';
import { formatDate } from '@/lib/date-utils';
import { triggerHaptic } from '@/lib/sound';
import type { Assignment } from '@/types/api';

export default function MyAssignmentsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, activeCongregationId } = useAuth();
  const { colors, typography, spacing, radius } = useTheme();

  const { assignments, isLoading: assignmentsLoading } = useMyAssignments(activeCongregationId);
  const { territories, isLoading: territoriesLoading } =
    useCongregationTerritories(activeCongregationId);
  const { groups = [], isLoading: groupsLoading } = useCongregationGroups(activeCongregationId);
  const { members = [] } = useCongregationMembers(activeCongregationId);
  const { households = [] } = useHouseholds({ congregationId: activeCongregationId });

  const userGroupIds = useMemo(() => getUserGroupIds(user, groups), [user, groups]);

  const myGroup = useMemo(() => {
    return groups.find((g) => isUserInGroup(user, g) || g.id === user?.groupId);
  }, [groups, user]);

  const groupmateCount = useMemo(() => {
    if (!myGroup) return 0;
    const fromGroup = (myGroup.members || []).length;
    const fromMembers = members.filter(
      (m) =>
        (m.status === 'active' || !m.status) &&
        (m.groupId === myGroup.id ||
          myGroup.members?.some((gm) => gm.userId === m.userId || gm.id === m.userId))
    ).length;
    return Math.max(fromGroup, fromMembers);
  }, [members, myGroup]);

  const activeAssignments = useMemo(() => {
    const resolved = resolveUserAssignments(
      user,
      assignments,
      territories,
      userGroupIds,
      activeCongregationId
    );
    return resolved.filter((a) => a.status === 'assigned' || a.status === 'active' || !a.status);
  }, [user, assignments, territories, userGroupIds, activeCongregationId]);

  const isLoading = assignmentsLoading || territoriesLoading || groupsLoading;

  const handleOpenAssignment = (assignment: Assignment) => {
    triggerHaptic('light');
    router.push(`/(tabs)/assignments/${assignment.territoryId}`);
  };

  const renderGroupBanner = () => {
    if (!myGroup) return null;
    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => {
          triggerHaptic('light');
          router.push('/(tabs)/more/groups');
        }}
        style={{ marginBottom: spacing.md }}
      >
        <Card
          style={[
            styles.groupBanner,
            { backgroundColor: `${colors.primary}10`, borderColor: `${colors.primary}30` },
          ]}
        >
          <View style={styles.groupBannerRow}>
            <View style={[styles.groupIconBox, { backgroundColor: colors.primary }]}>
              <Users size={18} color="#ffffff" />
            </View>

            <View style={{ flex: 1, marginLeft: spacing.sm }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text
                  style={[
                    styles.groupBannerTitle,
                    { color: colors.foreground, fontSize: typography.sm },
                  ]}
                >
                  {myGroup.name}
                </Text>
                <Badge label={`${groupmateCount} Publishers`} variant="outline" size="sm" />
              </View>

              <Text style={{ color: colors.mutedForeground, fontSize: 11, marginTop: 2 }}>
                Overseer: {myGroup.overseerName || 'Unassigned'}
                {myGroup.assistantOverseerName ? ` • Asst: ${myGroup.assistantOverseerName}` : ''}
              </Text>
            </View>

            <ChevronRight size={16} color={colors.primary} />
          </View>
        </Card>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header title="My Assignments" subtitle="Your assigned territories and active field work" />

      {isLoading ? (
        <MyAssignmentsSkeleton />
      ) : activeAssignments.length === 0 ? (
        <ScrollView
          contentContainerStyle={{
            padding: spacing.md,
            paddingBottom: insets.bottom + spacing.xxl,
          }}
        >
          {renderGroupBanner()}

          <EmptyState
            icon={<Sparkles size={48} color={colors.primary} />}
            title="No Active Assignments"
            description="You don't currently have any active territory assignments. Browse available territories to request one!"
            actionTitle="Browse Territories"
            onActionPress={() => router.push('/(tabs)/territories')}
          />
        </ScrollView>
      ) : (
        <FlatList
          data={activeAssignments}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{
            padding: spacing.md,
            paddingBottom: insets.bottom + spacing.xxl,
          }}
          ListHeaderComponent={renderGroupBanner}
          renderItem={({ item }) => {
            const territory = territories.find((t) => t.id === item.territoryId);
            const territoryHouseholds = households.filter(
              (h) => h.territoryId === item.territoryId
            );
            const totalDoors = territoryHouseholds.length || territory?.householdsCount || 0;
            const workedDoors = territoryHouseholds.filter((h) => h.lastVisitDate).length;
            const coverage = totalDoors > 0 ? Math.round((workedDoors / totalDoors) * 100) : 0;

            return (
              <Card
                onPress={() => handleOpenAssignment(item)}
                style={[styles.card, { marginBottom: spacing.md }]}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.numberBadge}>
                    <Text
                      style={[
                        styles.numberText,
                        { color: colors.primary, fontSize: typography.lg },
                      ]}
                    >
                      #{item.territoryNumber || territory?.number || '—'}
                    </Text>
                  </View>

                  <View style={{ flex: 1, marginLeft: spacing.sm }}>
                    <Text
                      style={[
                        styles.territoryName,
                        { color: colors.foreground, fontSize: typography.base },
                      ]}
                    >
                      {item.territoryName || territory?.name || 'Territory'}
                    </Text>
                    {territory?.city && (
                      <Text
                        style={[
                          styles.territoryCity,
                          { color: colors.mutedForeground, fontSize: typography.xs },
                        ]}
                      >
                        {territory.city}
                      </Text>
                    )}
                  </View>

                  {item.serviceGroupId ? (
                    <Badge label="Group" variant="secondary" />
                  ) : (
                    <Badge label="Personal" variant="primary" />
                  )}
                </View>

                {/* Progress bar */}
                <View style={styles.progressContainer}>
                  <View style={styles.progressLabels}>
                    <Text
                      style={[
                        styles.progressLabel,
                        { color: colors.mutedForeground, fontSize: typography.xs },
                      ]}
                    >
                      Coverage ({workedDoors}/{totalDoors} doors)
                    </Text>
                    <Text
                      style={[
                        styles.progressPercent,
                        { color: colors.foreground, fontSize: typography.xs },
                      ]}
                    >
                      {coverage}%
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.progressBarBg,
                      { backgroundColor: colors.muted, borderRadius: radius.round },
                    ]}
                  >
                    <View
                      style={[
                        styles.progressBarFill,
                        {
                          width: `${Math.min(coverage, 100)}%`,
                          backgroundColor: coverage >= 100 ? colors.success : colors.primary,
                          borderRadius: radius.round,
                        },
                      ]}
                    />
                  </View>
                </View>

                {/* Card footer details */}
                <View style={[styles.cardFooter, { borderTopColor: colors.border }]}>
                  {item.assignedAt && (
                    <View style={styles.footerItem}>
                      <Calendar size={13} color={colors.mutedForeground} />
                      <Text
                        style={[
                          styles.footerText,
                          { color: colors.mutedForeground, fontSize: typography.xs, marginLeft: 4 },
                        ]}
                      >
                        Assigned {formatDate(item.assignedAt)}
                      </Text>
                    </View>
                  )}

                  <View style={styles.actionRow}>
                    <Text
                      style={[
                        styles.actionText,
                        { color: colors.primary, fontSize: typography.xs },
                      ]}
                    >
                      Open Map & Doors
                    </Text>
                    <ChevronRight size={14} color={colors.primary} />
                  </View>
                </View>
              </Card>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupBanner: {
    padding: 12,
    borderWidth: 1,
  },
  groupBannerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  groupIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupBannerTitle: {
    fontWeight: '800',
  },
  card: {
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  numberBadge: {
    minWidth: 42,
    alignItems: 'center',
  },
  numberText: {
    fontWeight: '800',
  },
  territoryName: {
    fontWeight: '700',
  },
  territoryCity: {
    marginTop: 1,
    fontWeight: '500',
  },
  progressContainer: {
    marginTop: 14,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  progressLabel: {
    fontWeight: '500',
  },
  progressPercent: {
    fontWeight: '700',
  },
  progressBarBg: {
    height: 6,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: 14,
    paddingTop: 10,
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footerText: {
    fontWeight: '500',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionText: {
    fontWeight: '700',
  },
});
