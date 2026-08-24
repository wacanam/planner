// mobile/app/(tabs)/territories/index.tsx
import { useRouter } from 'expo-router';
import { ChevronRight, FolderOpen, Plus, Search, Users } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { FlatList, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Header } from '@/components/ui/Header';
import { Input } from '@/components/ui/Input';
import { TerritoriesDirectorySkeleton } from '@/components/ui/ScreenSkeletons';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useCongregationGroups } from '@/hooks/useCongregationGroups';
import { useHouseholds } from '@/hooks/useHouseholds';
import { useCongregationTerritories } from '@/hooks/useTerritories';
import { canCreateTerritory } from '@/lib/permissions';
import { triggerHaptic } from '@/lib/sound';
import type { Territory } from '@/types/api';

const STATUS_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'available', label: 'Available' },
  { id: 'assigned', label: 'Assigned' },
  { id: 'completed', label: 'Completed' },
];

export default function TerritoriesDirectoryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, activeCongregationId } = useAuth();
  const { colors, typography, spacing, radius } = useTheme();

  const { territories, isLoading } = useCongregationTerritories(activeCongregationId);
  const { groups = [] } = useCongregationGroups(activeCongregationId);
  const { households = [] } = useHouseholds({ congregationId: activeCongregationId });

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedGroup, _setSelectedGroup] = useState<string | null>(null);

  const canCreate = canCreateTerritory(user?.role);

  const filteredTerritories = useMemo(() => {
    return territories.filter((t) => {
      // Search filter
      const q = searchQuery.toLowerCase().trim();
      if (q) {
        const matchesNumber = t.number.toLowerCase().includes(q);
        const matchesName = t.name.toLowerCase().includes(q);
        const matchesCity = t.city?.toLowerCase().includes(q);
        const matchesPublisher = t.publisherName?.toLowerCase().includes(q);
        if (!matchesNumber && !matchesName && !matchesCity && !matchesPublisher) return false;
      }

      // Status filter
      if (selectedStatus !== 'all' && t.status !== selectedStatus) {
        return false;
      }

      // Group filter
      if (selectedGroup && t.groupId !== selectedGroup) {
        return false;
      }

      return true;
    });
  }, [territories, searchQuery, selectedStatus, selectedGroup]);

  const handleOpenTerritory = (t: Territory) => {
    triggerHaptic('light');
    router.push(`/(tabs)/territories/${t.id}`);
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'available':
        return 'success';
      case 'assigned':
        return 'primary';
      case 'completed':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header
        title="Territories"
        subtitle={`Congregation Territory Directory (${territories.length})`}
        rightAction={
          canCreate ? (
            <TouchableOpacity
              onPress={() => {
                triggerHaptic('light');
                router.push('/(tabs)/territories/create');
              }}
              style={[styles.addButton, { backgroundColor: colors.primary }]}
            >
              <Plus size={20} color="#ffffff" />
            </TouchableOpacity>
          ) : null
        }
      />

      {/* Search & Filter Bar */}
      <View style={[styles.filterSection, { padding: spacing.md }]}>
        <Input
          placeholder="Search territory #, name, locality..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          icon={<Search size={18} color={colors.mutedForeground} />}
          style={{ marginBottom: 0 }}
        />

        {/* Status Filter Pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.pillsScroll}
          contentContainerStyle={{ gap: spacing.sm }}
        >
          {STATUS_FILTERS.map((f) => {
            const isSelected = selectedStatus === f.id;
            return (
              <TouchableOpacity
                key={f.id}
                onPress={() => {
                  triggerHaptic('light');
                  setSelectedStatus(f.id);
                }}
                style={[
                  styles.filterPill,
                  {
                    backgroundColor: isSelected ? colors.primary : colors.card,
                    borderColor: isSelected ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.pillText,
                    {
                      color: isSelected ? colors.primaryForeground : colors.foreground,
                      fontSize: typography.xs,
                      fontWeight: isSelected ? '700' : '500',
                    },
                  ]}
                >
                  {f.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {isLoading ? (
        <TerritoriesDirectorySkeleton />
      ) : filteredTerritories.length === 0 ? (
        <EmptyState
          icon={<FolderOpen size={48} color={colors.mutedForeground} />}
          title="No Territories Found"
          description="Try adjusting your search query or filters to find territories."
        />
      ) : (
        <FlatList
          data={filteredTerritories}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{
            padding: spacing.md,
            paddingBottom: insets.bottom + spacing.xxl,
          }}
          renderItem={({ item }) => {
            const territoryHouseholds = households.filter((h) => h.territoryId === item.id);
            const totalDoors = territoryHouseholds.length || item.householdsCount || 0;
            const workedDoors = territoryHouseholds.filter((h) => h.lastVisitDate).length;
            const coverage =
              totalDoors > 0
                ? Math.round((workedDoors / totalDoors) * 100)
                : parseFloat(item.coveragePercent || '0');

            return (
              <Card
                onPress={() => handleOpenTerritory(item)}
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
                      #{item.number}
                    </Text>
                  </View>

                  <View style={{ flex: 1, marginLeft: spacing.sm }}>
                    <Text
                      style={[
                        styles.territoryName,
                        { color: colors.foreground, fontSize: typography.base },
                      ]}
                    >
                      {item.name}
                    </Text>
                    {item.city && (
                      <Text
                        style={[
                          styles.territoryCity,
                          { color: colors.mutedForeground, fontSize: typography.xs },
                        ]}
                      >
                        {item.city}
                      </Text>
                    )}
                  </View>

                  <Badge label={item.status} variant={getStatusBadgeVariant(item.status)} />
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
                      {workedDoors}/{totalDoors} doors worked
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
                  {item.publisherName ? (
                    <View style={styles.footerItem}>
                      <Users size={13} color={colors.primary} />
                      <Text
                        style={[
                          styles.footerText,
                          {
                            color: colors.foreground,
                            fontSize: typography.xs,
                            marginLeft: 4,
                            fontWeight: '600',
                          },
                        ]}
                      >
                        {item.publisherName}
                      </Text>
                    </View>
                  ) : item.groupName ? (
                    <View style={styles.footerItem}>
                      <Users size={13} color={colors.secondaryForeground} />
                      <Text
                        style={[
                          styles.footerText,
                          {
                            color: colors.foreground,
                            fontSize: typography.xs,
                            marginLeft: 4,
                            fontWeight: '600',
                          },
                        ]}
                      >
                        {item.groupName}
                      </Text>
                    </View>
                  ) : (
                    <Text
                      style={[
                        styles.footerText,
                        { color: colors.success, fontSize: typography.xs, fontWeight: '600' },
                      ]}
                    >
                      Ready for assignment
                    </Text>
                  )}

                  <View style={styles.actionRow}>
                    <Text
                      style={[
                        styles.actionText,
                        { color: colors.primary, fontSize: typography.xs },
                      ]}
                    >
                      Details
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
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterSection: {
    paddingBottom: 4,
  },
  pillsScroll: {
    marginTop: 10,
  },
  filterPill: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
  },
  pillText: {},
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
  footerText: {},
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionText: {
    fontWeight: '700',
  },
});
