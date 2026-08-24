// mobile/app/(tabs)/records/index.tsx
import { useRouter } from 'expo-router';
import {
  BookOpen,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  Home,
  MapPin,
  MessageSquare,
  Plus,
  Search,
  Sparkles,
  User as UserIcon,
  Users,
} from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
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
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useEncounters } from '@/hooks/useEncounters';
import { useCreateHousehold, useHouseholds } from '@/hooks/useHouseholds';
import { useVisits } from '@/hooks/useVisits';
import { triggerHaptic } from '@/lib/sound';
import type { Encounter, Household, Visit } from '@/types/api';

type Tab = 'households' | 'visits' | 'encounters';

export default function RecordsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, activeCongregationId } = useAuth();
  const { colors, typography, spacing, radius } = useTheme();

  const [activeTab, setActiveTab] = useState<Tab>('households');
  const [searchQuery, setSearchQuery] = useState('');

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
  const { create: createHousehold, isCreating } = useCreateHousehold();

  const filteredHouseholds = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return households;
    return households.filter(
      (h) =>
        h.address.toLowerCase().includes(q) ||
        (h.city && h.city.toLowerCase().includes(q)) ||
        (h.notes && h.notes.toLowerCase().includes(q))
    );
  }, [households, searchQuery]);

  const filteredVisits = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return visits;
    return visits.filter(
      (v) =>
        v.outcome.toLowerCase().includes(q) ||
        (v.notes && v.notes.toLowerCase().includes(q)) ||
        (v.bibleTopicDiscussed && v.bibleTopicDiscussed.toLowerCase().includes(q)) ||
        (v.householdAddress && v.householdAddress.toLowerCase().includes(q))
    );
  }, [visits, searchQuery]);

  const filteredEncounters = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return encounters;
    return encounters.filter(
      (e) =>
        (e.name && e.name.toLowerCase().includes(q)) ||
        e.response.toLowerCase().includes(q) ||
        (e.topicDiscussed && e.topicDiscussed.toLowerCase().includes(q)) ||
        (e.notes && e.notes.toLowerCase().includes(q))
    );
  }, [encounters, searchQuery]);

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

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header
        title="Ministry Records"
        subtitle="Households, visits, and encounters history"
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
            Doors ({households.length})
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
            Visits ({visits.length})
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
            Encounters ({encounters.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search Input */}
      <View style={{ padding: spacing.md, paddingBottom: spacing.xs }}>
        <Input
          placeholder={`Search ${activeTab}...`}
          value={searchQuery}
          onChangeText={setSearchQuery}
          icon={<Search size={18} color={colors.mutedForeground} />}
          style={{ marginBottom: 0 }}
        />
      </View>

      {/* Tab 1: Households List */}
      {activeTab === 'households' &&
        (householdsLoading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : filteredHouseholds.length === 0 ? (
          <EmptyState
            icon={<Home size={44} color={colors.mutedForeground} />}
            title="No Households Mapped"
            description="Add your first household or pin doors in assigned territories."
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
            renderItem={({ item }) => (
              <Card
                onPress={() => {
                  triggerHaptic('light');
                  router.push(`/(tabs)/records/household/${item.id}`);
                }}
                style={[styles.recordCard, { marginBottom: spacing.sm }]}
              >
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        styles.addressText,
                        { color: colors.foreground, fontSize: typography.base },
                      ]}
                    >
                      {item.houseNumber ? `${item.houseNumber} ` : ''}
                      {item.streetName || item.address}
                    </Text>
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
            )}
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
            renderItem={({ item }) => (
              <Card style={[styles.recordCard, { marginBottom: spacing.sm }]}>
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        styles.addressText,
                        { color: colors.foreground, fontSize: typography.sm + 1 },
                      ]}
                    >
                      {item.houseNumber ? `${item.houseNumber} ` : ''}
                      {item.streetName || item.householdAddress || 'Household Record'}
                    </Text>
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
            )}
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
            renderItem={({ item }) => (
              <Card style={[styles.recordCard, { marginBottom: spacing.sm }]}>
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        styles.addressText,
                        { color: colors.foreground, fontSize: typography.base },
                      ]}
                    >
                      {item.name || 'Anonymous Person'}
                    </Text>
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
            )}
          />
        ))}

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
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordCard: {
    padding: 14,
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
  modalTitle: {
    fontWeight: '800',
  },
});
