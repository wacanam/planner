// mobile/app/(tabs)/records/index.tsx
import { useRouter } from 'expo-router';
import {
  BookOpen,
  Calendar,
  ChevronRight,
  Filter,
  Home,
  MapPin,
  MessageSquare,
  Plus,
  Search,
  Sparkles,
  User,
  Users,
  X,
} from 'lucide-react-native';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
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
import { useCongregationGroups } from '@/hooks/useCongregationGroups';
import { useCongregationMembers } from '@/hooks/useCongregationMembers';
import { useEncounters } from '@/hooks/useEncounters';
import { useCreateHousehold, useHouseholds } from '@/hooks/useHouseholds';
import { useVisits } from '@/hooks/useVisits';
import {
  canViewAllCongregationRecords,
  getOverseenGroupMateIds,
  isGroupOverseer,
  isGroupOverseerAssistant,
  isUserInGroup,
} from '@/lib/permissions';
import { triggerHaptic } from '@/lib/sound';
import type { Household } from '@/types/api';

type Tab = 'households' | 'visits' | 'encounters';
type RecordScope = 'mine' | 'group' | 'congregation';

export default function RecordsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, activeCongregationId } = useAuth();
  const { colors, typography, spacing, radius } = useTheme();

  const [activeTab, setActiveTab] = useState<Tab>('households');
  const [recordScope, setRecordScope] = useState<RecordScope>('mine');
  const [searchQuery, setSearchQuery] = useState('');
  const [publisherFilter, setPublisherFilter] = useState<string>('all');
  const [publisherModalVisible, setPublisherModalVisible] = useState(false);

  // Add Household Modal
  const [addHouseholdModal, setAddHouseholdModal] = useState(false);
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [notes, setNotes] = useState('');

  const { households = [], isLoading: householdsLoading } = useHouseholds({
    congregationId: activeCongregationId,
  });
  const { visits = [], isLoading: visitsLoading } = useVisits(
    activeCongregationId ? { congregationId: activeCongregationId } : undefined
  );
  const { encounters = [], isLoading: encountersLoading } = useEncounters(
    activeCongregationId ? { congregationId: activeCongregationId } : undefined
  );
  const { groups = [] } = useCongregationGroups(activeCongregationId);
  const { members = [] } = useCongregationMembers(activeCongregationId);
  const { create: createHousehold, isCreating } = useCreateHousehold();

  // Role and Oversight Evaluation
  const canViewCongregation = useMemo(() => {
    return canViewAllCongregationRecords(user?.role, user?.congregationRole);
  }, [user?.role, user?.congregationRole]);

  const myGroup = useMemo(() => {
    return groups.find((g) => isUserInGroup(user, g) || g.id === user?.groupId);
  }, [groups, user]);

  const isOverseer = useMemo(() => {
    if (!user?.id) return false;
    return (
      isGroupOverseer(user.id, myGroup) ||
      isGroupOverseerAssistant(user.id, myGroup) ||
      groups.some((g) => isGroupOverseer(user.id, g) || isGroupOverseerAssistant(user.id, g))
    );
  }, [user?.id, myGroup, groups]);

  const groupMateIds = useMemo(() => {
    return getOverseenGroupMateIds(user?.id, groups);
  }, [user?.id, groups]);

  // Available scopes based on permissions
  const availableScopes: { id: RecordScope; label: string; icon: string }[] = useMemo(() => {
    const list: { id: RecordScope; label: string; icon: string }[] = [
      { id: 'mine', label: 'My Records', icon: '★' },
    ];
    if (isOverseer || canViewCongregation) {
      list.push({ id: 'group', label: 'My Group', icon: '👥' });
    }
    if (canViewCongregation) {
      list.push({ id: 'congregation', label: 'All Congregation', icon: '🏛️' });
    }
    return list;
  }, [isOverseer, canViewCongregation]);

  // My Active Follow-ups & Studies (always computed for quick personal tray)
  const myActiveFollowups = useMemo(() => {
    if (!user?.id) return [];
    return households.filter((h) => {
      const isMine =
        h.createdById === user.id ||
        h.collaboratorIds?.includes(user.id) ||
        h.readOnlyUserIds?.includes(user.id);
      const isFollowup =
        h.status === 'return_visit' ||
        h.status === 'study_conducted' ||
        h.lastVisitOutcome === 'return_visit' ||
        h.lastVisitOutcome === 'study_conducted';
      return isMine && isFollowup;
    });
  }, [households, user?.id]);

  // Helper to check item ownership
  const getItemOwnership = (createdById?: string | null, collaboratorIds?: string[] | null) => {
    if (!user?.id) return { isMine: false, isCollaborator: false, isGroup: false };
    const isMine = createdById === user.id;
    const isCollaborator = Boolean(collaboratorIds?.includes(user.id));
    const isGroup = !isMine && !isCollaborator && Boolean(createdById && groupMateIds.has(createdById));
    return { isMine, isCollaborator, isGroup };
  };

  // Scope-Filtered Households
  const scopedHouseholds = useMemo(() => {
    if (!user?.id) return [];
    let list = households;

    if (recordScope === 'mine') {
      list = list.filter(
        (h) =>
          h.createdById === user.id ||
          h.collaboratorIds?.includes(user.id) ||
          h.readOnlyUserIds?.includes(user.id)
      );
    } else if (recordScope === 'group') {
      list = list.filter(
        (h) =>
          h.createdById === user.id ||
          (h.createdById && groupMateIds.has(h.createdById)) ||
          h.collaboratorIds?.includes(user.id)
      );
    }

    if (publisherFilter !== 'all') {
      list = list.filter((h) => h.createdById === publisherFilter);
    }

    // Sort: My personal records first when in group/congregation scope
    return [...list].sort((a, b) => {
      const aMine = a.createdById === user.id;
      const bMine = b.createdById === user.id;
      if (aMine && !bMine) return -1;
      if (!aMine && bMine) return 1;
      return (a.streetName || a.address).localeCompare(b.streetName || b.address);
    });
  }, [households, recordScope, publisherFilter, user?.id, groupMateIds]);

  // Scope-Filtered Visits
  const scopedVisits = useMemo(() => {
    if (!user?.id) return [];
    let list = visits;

    if (recordScope === 'mine') {
      list = list.filter((v) => v.userId === user.id);
    } else if (recordScope === 'group') {
      list = list.filter(
        (v) => v.userId === user.id || (v.userId && groupMateIds.has(v.userId))
      );
    }

    if (publisherFilter !== 'all') {
      list = list.filter((v) => v.userId === publisherFilter);
    }

    return [...list].sort((a, b) => {
      const aMine = a.userId === user.id;
      const bMine = b.userId === user.id;
      if (aMine && !bMine) return -1;
      if (!aMine && bMine) return 1;
      return b.visitDate.localeCompare(a.visitDate);
    });
  }, [visits, recordScope, publisherFilter, user?.id, groupMateIds]);

  // Scope-Filtered Encounters
  const scopedEncounters = useMemo(() => {
    if (!user?.id) return [];
    let list = encounters;

    if (recordScope === 'mine') {
      list = list.filter((e) => e.userId === user.id);
    } else if (recordScope === 'group') {
      list = list.filter(
        (e) => e.userId === user.id || (e.userId && groupMateIds.has(e.userId))
      );
    }

    if (publisherFilter !== 'all') {
      list = list.filter((e) => e.userId === publisherFilter);
    }

    return [...list].sort((a, b) => {
      const aMine = a.userId === user.id;
      const bMine = b.userId === user.id;
      if (aMine && !bMine) return -1;
      if (!aMine && bMine) return 1;
      return b.createdAt.localeCompare(a.createdAt);
    });
  }, [encounters, recordScope, publisherFilter, user?.id, groupMateIds]);

  // Search filtered results
  const filteredHouseholds = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return scopedHouseholds;
    return scopedHouseholds.filter(
      (h) =>
        h.address.toLowerCase().includes(q) ||
        h.city?.toLowerCase().includes(q) ||
        h.streetName?.toLowerCase().includes(q) ||
        h.notes?.toLowerCase().includes(q) ||
        h.creatorName?.toLowerCase().includes(q)
    );
  }, [scopedHouseholds, searchQuery]);

  const filteredVisits = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return scopedVisits;
    return scopedVisits.filter(
      (v) =>
        v.outcome.toLowerCase().includes(q) ||
        v.notes?.toLowerCase().includes(q) ||
        v.bibleTopicDiscussed?.toLowerCase().includes(q) ||
        v.householdAddress?.toLowerCase().includes(q) ||
        v.publisherName?.toLowerCase().includes(q)
    );
  }, [scopedVisits, searchQuery]);

  const filteredEncounters = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return scopedEncounters;
    return scopedEncounters.filter(
      (e) =>
        e.name?.toLowerCase().includes(q) ||
        e.response.toLowerCase().includes(q) ||
        e.topicDiscussed?.toLowerCase().includes(q) ||
        e.notes?.toLowerCase().includes(q)
    );
  }, [scopedEncounters, searchQuery]);

  const handleCreateHousehold = async () => {
    if (!address.trim()) return;
    try {
      const res = await createHousehold({
        address: address.trim(),
        city: city.trim() || '',
        streetName: address.trim(),
        notes: notes.trim() || null,
        congregationId: activeCongregationId,
        createdById: user?.id || null,
        creatorName: user?.name || null,
        status: 'new',
      });
      await triggerHaptic('success');
      setAddHouseholdModal(false);
      setAddress('');
      setCity('');
      setNotes('');
      router.push(`/(tabs)/records/household/${res.id}`);
    } catch {
      triggerHaptic('error');
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'do_not_visit':
        return 'destructive';
      case 'return_visit':
      case 'study_conducted':
      case 'foreign_language':
        return 'primary';
      case 'active':
      case 'answered':
        return 'success';
      case 'not_home':
      case 'busy':
        return 'warning';
      default:
        return 'secondary';
    }
  };

  const selectedPublisherName = useMemo(() => {
    if (publisherFilter === 'all') return 'All Publishers';
    const found = members.find((m) => m.userId === publisherFilter);
    return found?.user?.name || 'Selected Publisher';
  }, [publisherFilter, members]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header
        title="Ministry Records"
        subtitle={
          recordScope === 'mine'
            ? 'Your personal doors, visits & follow-ups'
            : recordScope === 'group'
              ? 'Group oversight & shepherding records'
              : 'Congregation-wide directory'
        }
        rightAction={
          <TouchableOpacity
            onPress={() => {
              triggerHaptic('light');
              setAddHouseholdModal(true);
            }}
            style={[styles.addBtn, { backgroundColor: colors.primary }]}
          >
            <Plus size={20} color="#ffffff" />
          </TouchableOpacity>
        }
      />

      {/* Scope Selector Bar (Role-Aware) */}
      {availableScopes.length > 1 && (
        <View
          style={[
            styles.scopeBar,
            { backgroundColor: colors.card, borderBottomColor: colors.border },
          ]}
        >
          {availableScopes.map((scope) => {
            const isSelected = recordScope === scope.id;
            const count =
              scope.id === 'mine'
                ? activeTab === 'households'
                  ? households.filter(
                      (h) =>
                        h.createdById === user?.id ||
                        h.collaboratorIds?.includes(user?.id || '')
                    ).length
                  : activeTab === 'visits'
                    ? visits.filter((v) => v.userId === user?.id).length
                    : encounters.filter((e) => e.userId === user?.id).length
                : scope.id === 'group'
                  ? activeTab === 'households'
                    ? households.filter(
                        (h) =>
                          h.createdById === user?.id ||
                          (h.createdById && groupMateIds.has(h.createdById))
                      ).length
                    : activeTab === 'visits'
                      ? visits.filter(
                          (v) => v.userId === user?.id || (v.userId && groupMateIds.has(v.userId))
                        ).length
                      : encounters.filter(
                          (e) => e.userId === user?.id || (e.userId && groupMateIds.has(e.userId))
                        ).length
                  : activeTab === 'households'
                    ? households.length
                    : activeTab === 'visits'
                      ? visits.length
                      : encounters.length;

            return (
              <TouchableOpacity
                key={scope.id}
                onPress={() => {
                  triggerHaptic('light');
                  setRecordScope(scope.id);
                  setPublisherFilter('all');
                }}
                style={[
                  styles.scopePill,
                  {
                    backgroundColor: isSelected ? colors.primary : `${colors.muted}40`,
                    borderColor: isSelected ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.scopeText,
                    {
                      color: isSelected ? '#ffffff' : colors.foreground,
                      fontWeight: isSelected ? '700' : '500',
                      fontSize: typography.xs,
                    },
                  ]}
                >
                  {scope.icon} {scope.label} ({count})
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* Tab Segment Controller */}
      <View
        style={[
          styles.tabBarContainer,
          { backgroundColor: colors.card, borderBottomColor: colors.border },
        ]}
      >
        <TouchableOpacity
          onPress={() => {
            triggerHaptic('light');
            setActiveTab('households');
          }}
          style={[
            styles.tabItem,
            activeTab === 'households' && {
              borderBottomColor: colors.primary,
              borderBottomWidth: 2.5,
            },
          ]}
        >
          <Home
            size={15}
            color={activeTab === 'households' ? colors.primary : colors.mutedForeground}
          />
          <Text
            style={[
              styles.tabText,
              {
                color: activeTab === 'households' ? colors.primary : colors.mutedForeground,
                fontWeight: activeTab === 'households' ? '700' : '500',
                fontSize: typography.xs,
              },
            ]}
          >
            Doors ({scopedHouseholds.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => {
            triggerHaptic('light');
            setActiveTab('visits');
          }}
          style={[
            styles.tabItem,
            activeTab === 'visits' && { borderBottomColor: colors.primary, borderBottomWidth: 2.5 },
          ]}
        >
          <Calendar
            size={15}
            color={activeTab === 'visits' ? colors.primary : colors.mutedForeground}
          />
          <Text
            style={[
              styles.tabText,
              {
                color: activeTab === 'visits' ? colors.primary : colors.mutedForeground,
                fontWeight: activeTab === 'visits' ? '700' : '500',
                fontSize: typography.xs,
              },
            ]}
          >
            Visits ({scopedVisits.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => {
            triggerHaptic('light');
            setActiveTab('encounters');
          }}
          style={[
            styles.tabItem,
            activeTab === 'encounters' && {
              borderBottomColor: colors.primary,
              borderBottomWidth: 2.5,
            },
          ]}
        >
          <MessageSquare
            size={15}
            color={activeTab === 'encounters' ? colors.primary : colors.mutedForeground}
          />
          <Text
            style={[
              styles.tabText,
              {
                color: activeTab === 'encounters' ? colors.primary : colors.mutedForeground,
                fontWeight: activeTab === 'encounters' ? '700' : '500',
                fontSize: typography.xs,
              },
            ]}
          >
            Encounters ({scopedEncounters.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Pinned "My Active Follow-ups & Studies" Tray (Always visible for fast personal access) */}
      {myActiveFollowups.length > 0 && activeTab === 'households' && (
        <View style={[styles.pinnedSection, { borderBottomColor: colors.border }]}>
          <View style={styles.pinnedHeaderRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Sparkles size={14} color={colors.primary} />
              <Text
                style={[
                  styles.pinnedTitle,
                  { color: colors.foreground, fontSize: typography.xs + 1 },
                ]}
              >
                My Active Follow-ups ({myActiveFollowups.length})
              </Text>
            </View>
            <Badge label="Personal" variant="primary" size="sm" />
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
            {myActiveFollowups.map((item) => (
              <TouchableOpacity
                key={item.id}
                activeOpacity={0.7}
                onPress={() => {
                  triggerHaptic('light');
                  router.push(`/(tabs)/records/household/${item.id}`);
                }}
                style={[
                  styles.pinnedCard,
                  {
                    backgroundColor: `${colors.primary}12`,
                    borderColor: `${colors.primary}35`,
                  },
                ]}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <MapPin size={12} color={colors.primary} />
                  <Text
                    style={{
                      fontWeight: '700',
                      color: colors.foreground,
                      fontSize: typography.xs,
                    }}
                    numberOfLines={1}
                  >
                    {item.houseNumber ? `${item.houseNumber} ` : ''}
                    {item.streetName || item.address}
                  </Text>
                </View>

                <Text
                  style={{
                    color: colors.mutedForeground,
                    fontSize: 11,
                    marginTop: 2,
                  }}
                  numberOfLines={1}
                >
                  {item.notes ? `"${item.notes}"` : 'Active Return Visit'}
                </Text>

                <View style={styles.pinnedCardFooter}>
                  <Badge
                    label={item.status.replace('_', ' ')}
                    variant={getStatusBadgeVariant(item.status)}
                    size="sm"
                  />
                  <ChevronRight size={12} color={colors.primary} />
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Search & Publisher Filter Row */}
      <View style={{ padding: spacing.md, paddingBottom: spacing.xs, flexDirection: 'row', gap: 8 }}>
        <View style={{ flex: 1 }}>
          <Input
            placeholder={`Search ${recordScope === 'mine' ? 'my' : recordScope} ${activeTab}...`}
            value={searchQuery}
            onChangeText={setSearchQuery}
            icon={<Search size={18} color={colors.mutedForeground} />}
            style={{ marginBottom: 0 }}
          />
        </View>

        {recordScope !== 'mine' && (
          <TouchableOpacity
            onPress={() => {
              triggerHaptic('light');
              setPublisherModalVisible(true);
            }}
            style={[
              styles.filterBtn,
              {
                backgroundColor: publisherFilter !== 'all' ? `${colors.primary}20` : colors.card,
                borderColor: publisherFilter !== 'all' ? colors.primary : colors.border,
              },
            ]}
          >
            <Filter
              size={16}
              color={publisherFilter !== 'all' ? colors.primary : colors.mutedForeground}
            />
          </TouchableOpacity>
        )}
      </View>

      {/* Active Publisher Filter Chip */}
      {publisherFilter !== 'all' && (
        <View style={styles.filterChipRow}>
          <Text style={{ fontSize: typography.xs, color: colors.mutedForeground }}>Filter:</Text>
          <View
            style={[
              styles.filterChip,
              { backgroundColor: `${colors.primary}15`, borderColor: `${colors.primary}30` },
            ]}
          >
            <User size={12} color={colors.primary} />
            <Text style={{ fontSize: typography.xs, color: colors.primary, fontWeight: '600' }}>
              {selectedPublisherName}
            </Text>
            <TouchableOpacity
              onPress={() => {
                triggerHaptic('light');
                setPublisherFilter('all');
              }}
            >
              <X size={12} color={colors.primary} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Tab 1: Households List */}
      {activeTab === 'households' &&
        (householdsLoading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : filteredHouseholds.length === 0 ? (
          <EmptyState
            icon={<Home size={44} color={colors.mutedForeground} />}
            title={
              recordScope === 'mine'
                ? 'No Personal Households'
                : 'No Households in this View'
            }
            description={
              recordScope === 'mine'
                ? 'Add your first household or pin doors in your assigned territories.'
                : 'No matching doors found for the selected scope and filters.'
            }
            actionTitle="Add Household"
            onActionPress={() => setAddHouseholdModal(true)}
          />
        ) : (
          <FlatList
            data={filteredHouseholds}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{
              padding: spacing.md,
              paddingBottom: insets.bottom + spacing.xxl,
            }}
            renderItem={({ item }) => {
              const { isMine, isCollaborator, isGroup } = getItemOwnership(
                item.createdById,
                item.collaboratorIds
              );

              return (
                <Card
                  onPress={() => {
                    triggerHaptic('light');
                    router.push(`/(tabs)/records/household/${item.id}`);
                  }}
                  style={[
                    styles.recordCard,
                    {
                      marginBottom: spacing.sm,
                      borderColor: isMine ? `${colors.primary}40` : colors.border,
                    },
                  ]}
                >
                  <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <Text
                          style={[
                            styles.addressText,
                            { color: colors.foreground, fontSize: typography.base },
                          ]}
                        >
                          {item.houseNumber ? `${item.houseNumber} ` : ''}
                          {item.streetName || item.address}
                        </Text>

                        {/* Ownership Badges */}
                        {isMine && (
                          <Badge label="👤 Mine" variant="primary" size="sm" />
                        )}
                        {isCollaborator && (
                          <Badge label="🤝 Collab" variant="success" size="sm" />
                        )}
                        {isGroup && (
                          <Badge
                            label={item.creatorName ? `👥 ${item.creatorName}` : '👥 Group'}
                            variant="outline"
                            size="sm"
                          />
                        )}
                        {!isMine && !isCollaborator && !isGroup && item.creatorName && (
                          <Badge
                            label={`🏛️ ${item.creatorName}`}
                            variant="secondary"
                            size="sm"
                          />
                        )}
                      </View>

                      <Text
                        style={{
                          color: colors.mutedForeground,
                          fontSize: typography.xs,
                          marginTop: 2,
                        }}
                      >
                        {item.address}
                        {item.city ? `, ${item.city}` : ''}
                        {item.postalCode ? ` (${item.postalCode})` : ''}
                      </Text>
                    </View>
                    <Badge label={item.status} variant={getStatusBadgeVariant(item.status)} />
                  </View>

                  {item.notes ? (
                    <Text
                      style={[
                        styles.notesSnippet,
                        { color: colors.mutedForeground, fontSize: typography.xs },
                      ]}
                    >
                      "{item.notes}"
                    </Text>
                  ) : null}

                  <View style={[styles.cardFooter, { borderTopColor: colors.border }]}>
                    <Text style={{ color: colors.mutedForeground, fontSize: typography.xs }}>
                      Last Visit:{' '}
                      {item.lastVisitDate
                        ? new Date(item.lastVisitDate).toLocaleDateString()
                        : 'Never'}{' '}
                      ({item.lastVisitOutcome || 'None'})
                    </Text>
                    <ChevronRight size={14} color={colors.primary} />
                  </View>
                </Card>
              );
            }}
          />
        ))}

      {/* Tab 2: Visits List */}
      {activeTab === 'visits' &&
        (visitsLoading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : filteredVisits.length === 0 ? (
          <EmptyState
            icon={<Calendar size={44} color={colors.mutedForeground} />}
            title="No Visits Logged"
            description="Visits recorded in the field will appear in this activity feed."
          />
        ) : (
          <FlatList
            data={filteredVisits}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{
              padding: spacing.md,
              paddingBottom: insets.bottom + spacing.xxl,
            }}
            renderItem={({ item }) => {
              const isMine = item.userId === user?.id;
              const isGroup = !isMine && Boolean(item.userId && groupMateIds.has(item.userId));

              return (
                <Card
                  style={[
                    styles.recordCard,
                    {
                      marginBottom: spacing.sm,
                      borderColor: isMine ? `${colors.primary}40` : colors.border,
                    },
                  ]}
                >
                  <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <Text
                          style={[
                            styles.addressText,
                            { color: colors.foreground, fontSize: typography.sm + 1 },
                          ]}
                        >
                          {item.houseNumber ? `${item.houseNumber} ` : ''}
                          {item.streetName || item.householdAddress || 'Household Record'}
                        </Text>

                        {isMine ? (
                          <Badge label="👤 Mine" variant="primary" size="sm" />
                        ) : isGroup ? (
                          <Badge
                            label={item.publisherName ? `👥 ${item.publisherName}` : '👥 Group'}
                            variant="outline"
                            size="sm"
                          />
                        ) : (
                          <Badge
                            label={item.publisherName ? `🏛️ ${item.publisherName}` : '🏛️ Cong'}
                            variant="secondary"
                            size="sm"
                          />
                        )}
                      </View>

                      <Text
                        style={{
                          color: colors.mutedForeground,
                          fontSize: typography.xs,
                          marginTop: 2,
                        }}
                      >
                        {new Date(item.visitDate).toLocaleDateString()} &bull;{' '}
                        {item.publisherName || 'Publisher'}
                      </Text>
                    </View>
                    <Badge
                      label={item.outcome.replace('_', ' ')}
                      variant={getStatusBadgeVariant(item.outcome)}
                    />
                  </View>

                  {item.bibleTopicDiscussed && (
                    <Text
                      style={{
                        color: colors.primary,
                        fontSize: typography.xs,
                        marginTop: 6,
                        fontWeight: '600',
                      }}
                    >
                      Topic: {item.bibleTopicDiscussed}
                    </Text>
                  )}

                  {item.notes && (
                    <Text
                      style={[
                        styles.notesSnippet,
                        { color: colors.foreground, fontSize: typography.xs },
                      ]}
                    >
                      "{item.notes}"
                    </Text>
                  )}
                </Card>
              );
            }}
          />
        ))}

      {/* Tab 3: Encounters List */}
      {activeTab === 'encounters' &&
        (encountersLoading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : filteredEncounters.length === 0 ? (
          <EmptyState
            icon={<MessageSquare size={44} color={colors.mutedForeground} />}
            title="No Encounters Logged"
            description="Person-level conversations recorded in the field will appear here."
          />
        ) : (
          <FlatList
            data={filteredEncounters}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{
              padding: spacing.md,
              paddingBottom: insets.bottom + spacing.xxl,
            }}
            renderItem={({ item }) => {
              const isMine = item.userId === user?.id;

              return (
                <Card
                  style={[
                    styles.recordCard,
                    {
                      marginBottom: spacing.sm,
                      borderColor: isMine ? `${colors.primary}40` : colors.border,
                    },
                  ]}
                >
                  <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text
                          style={[
                            styles.addressText,
                            { color: colors.foreground, fontSize: typography.base },
                          ]}
                        >
                          {item.name || 'Anonymous Person'}
                        </Text>
                        {isMine && <Badge label="👤 Mine" variant="primary" size="sm" />}
                      </View>

                      <Text
                        style={{
                          color: colors.mutedForeground,
                          fontSize: typography.xs,
                          marginTop: 2,
                        }}
                      >
                        {item.gender ? `${item.gender} • ` : ''}
                        {item.ageGroup ? `${item.ageGroup} • ` : ''}
                        {new Date(item.createdAt).toLocaleDateString()}
                      </Text>
                    </View>
                    <Badge
                      label={item.response}
                      variant={item.bibleStudyInterest ? 'success' : 'primary'}
                    />
                  </View>

                  {item.topicDiscussed && (
                    <Text
                      style={{
                        color: colors.primary,
                        fontSize: typography.xs,
                        marginTop: 6,
                        fontWeight: '600',
                      }}
                    >
                      Discussed: {item.topicDiscussed}
                    </Text>
                  )}

                  {item.notes && (
                    <Text
                      style={[
                        styles.notesSnippet,
                        { color: colors.foreground, fontSize: typography.xs },
                      ]}
                    >
                      "{item.notes}"
                    </Text>
                  )}
                </Card>
              );
            }}
          />
        ))}

      {/* Publisher Filter Modal */}
      <Modal visible={publisherModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <Card style={[styles.modalCard, { width: '88%', maxHeight: '75%' }]}>
            <View style={styles.modalHeaderRow}>
              <Text
                style={[styles.modalTitle, { color: colors.foreground, fontSize: typography.lg }]}
              >
                Filter by Publisher
              </Text>
              <TouchableOpacity onPress={() => setPublisherModalVisible(false)}>
                <X size={20} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ marginTop: 10 }}>
              <TouchableOpacity
                onPress={() => {
                  triggerHaptic('light');
                  setPublisherFilter('all');
                  setPublisherModalVisible(false);
                }}
                style={[
                  styles.filterOptionRow,
                  {
                    borderColor: publisherFilter === 'all' ? colors.primary : colors.border,
                    backgroundColor: publisherFilter === 'all' ? `${colors.primary}15` : colors.card,
                  },
                ]}
              >
                <Users size={16} color={publisherFilter === 'all' ? colors.primary : colors.mutedForeground} />
                <Text
                  style={{
                    color: colors.foreground,
                    fontWeight: publisherFilter === 'all' ? '700' : '500',
                    marginLeft: 8,
                  }}
                >
                  All Publishers
                </Text>
              </TouchableOpacity>

              {members
                .filter((m) => (recordScope === 'group' ? groupMateIds.has(m.userId || m.id) : true))
                .map((m) => {
                  const uid = m.userId || m.id;
                  const isSelected = publisherFilter === uid;
                  return (
                    <TouchableOpacity
                      key={m.id}
                      onPress={() => {
                        triggerHaptic('light');
                        setPublisherFilter(uid);
                        setPublisherModalVisible(false);
                      }}
                      style={[
                        styles.filterOptionRow,
                        {
                          borderColor: isSelected ? colors.primary : colors.border,
                          backgroundColor: isSelected ? `${colors.primary}15` : colors.card,
                        },
                      ]}
                    >
                      <User size={16} color={isSelected ? colors.primary : colors.mutedForeground} />
                      <View style={{ flex: 1, marginLeft: 8 }}>
                        <Text style={{ color: colors.foreground, fontWeight: isSelected ? '700' : '500' }}>
                          {m.user?.name || 'Publisher'} {uid === user?.id ? '(You)' : ''}
                        </Text>
                        <Text style={{ color: colors.mutedForeground, fontSize: 11 }}>
                          {m.congregationRole || 'publisher'}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
            </ScrollView>
          </Card>
        </View>
      </Modal>

      {/* Add Household Modal */}
      <Modal visible={addHouseholdModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <Card style={[styles.modalCard, { width: '90%' }]}>
            <Text
              style={[styles.modalTitle, { color: colors.foreground, fontSize: typography.lg }]}
            >
              Add Household
            </Text>
            <Text
              style={{
                color: colors.mutedForeground,
                fontSize: typography.xs,
                marginBottom: spacing.md,
              }}
            >
              Create a new household record in congregation
            </Text>

            <Input
              label="Address / Street Name *"
              placeholder="e.g. 742 Evergreen Terrace"
              value={address}
              onChangeText={setAddress}
            />

            <Input
              label="City / Locality"
              placeholder="e.g. Springfield"
              value={city}
              onChangeText={setCity}
            />

            <Input
              label="Notes (Optional)"
              placeholder="e.g. Spanish speaking, best time Saturday morning"
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={3}
              style={{ minHeight: 60 }}
            />

            <View style={{ flexDirection: 'row', gap: 10, marginTop: spacing.md }}>
              <Button
                title="Cancel"
                variant="ghost"
                onPress={() => setAddHouseholdModal(false)}
                style={{ flex: 1 }}
              />
              <Button
                title="Save Door"
                onPress={handleCreateHousehold}
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
  scopeBar: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  scopePill: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
  },
  scopeText: {},
  tabBarContainer: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
  },
  tabText: {},
  pinnedSection: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  pinnedHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pinnedTitle: {
    fontWeight: '700',
  },
  pinnedCard: {
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginRight: 8,
    width: 170,
  },
  pinnedCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  filterBtn: {
    width: 44,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterChipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    marginBottom: 6,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordCard: {
    padding: 14,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  addressText: {
    fontWeight: '700',
  },
  notesSnippet: {
    fontStyle: 'italic',
    marginTop: 6,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: 10,
    paddingTop: 8,
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
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  modalTitle: {
    fontWeight: '800',
  },
  filterOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
  },
});
