// mobile/app/(tabs)/records/household/[id].tsx
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Home,
  MapPin,
  MessageSquare,
  Plus,
  Share2,
  Trash2,
  User as UserIcon,
  Users,
  X,
} from 'lucide-react-native';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { Header } from '@/components/ui/Header';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useCongregationMembers } from '@/hooks/useCongregationMembers';
import { useDeleteHousehold, useHouseholdDetail, useUpdateHousehold } from '@/hooks/useHouseholds';
import { useCreateVisit, useVisits } from '@/hooks/useVisits';
import { canDeleteHousehold, canEditHousehold, canLogVisitOrEncounter, canShareHousehold } from '@/lib/permissions';
import { triggerHaptic } from '@/lib/sound';

const OUTCOME_OPTIONS = [
  { id: 'answered', label: 'Answered', color: '#16a34a' },
  { id: 'not_home', label: 'Not Home', color: '#d97706' },
  { id: 'busy', label: 'Busy / Callback', color: '#ea580c' },
  { id: 'return_visit', label: 'Return Visit', color: '#6b9ecc' },
  { id: 'study_conducted', label: 'Bible Study', color: '#8b5cf6' },
  { id: 'minor_only', label: 'Minor Only', color: '#6366f1' },
  { id: 'foreign_language', label: 'Foreign Lang', color: '#06b6d4' },
  { id: 'inaccessible', label: 'Inaccessible', color: '#78716c' },
  { id: 'vacant', label: 'Vacant', color: '#64748b' },
  { id: 'do_not_visit', label: 'Do Not Call', color: '#dc2626' },
  { id: 'moved', label: 'Moved', color: '#9b9b9b' },
  { id: 'other', label: 'Other', color: '#707070' },
];

export default function HouseholdDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const householdId = id || '';

  const { user, activeCongregationId } = useAuth();
  const { colors, typography, spacing, radius } = useTheme();

  const { household, isLoading: householdLoading } = useHouseholdDetail(householdId);
  const { visits = [], isLoading: visitsLoading } = useVisits({ householdId });
  const { members = [] } = useCongregationMembers(activeCongregationId);
  const { update: updateHousehold } = useUpdateHousehold();
  const { remove: deleteHousehold, isDeleting } = useDeleteHousehold();
  const { create: createVisit, isCreating: isLoggingVisit } = useCreateVisit();

  // Log Visit Modal State
  const [visitModalVisible, setVisitModalVisible] = useState(false);
  const [outcome, setOutcome] = useState('answered');
  const [visitNotes, setVisitNotes] = useState('');
  const [topicDiscussed, setTopicDiscussed] = useState('');
  const [literatureLeft, setLiteratureLeft] = useState('');
  const [returnVisitPlanned, setReturnVisitPlanned] = useState(false);

  // Share Modal State
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [selectedCollaboratorId, setSelectedCollaboratorId] = useState<string | null>(null);

  const canEdit = canEditHousehold(user, household);
  const canDelete = canDeleteHousehold(user, household);
  const canLog = canLogVisitOrEncounter(user, household);
  const canShare = canShareHousehold(user, household);

  const resolveHouseholdStatusAfter = (selectedOutcome: string) => {
    switch (selectedOutcome) {
      case 'do_not_visit':
        return 'do_not_visit';
      case 'moved':
        return 'moved';
      case 'vacant':
        return 'vacant';
      case 'foreign_language':
        return 'foreign_language';
      case 'inaccessible':
        return 'inaccessible';
      case 'not_home':
        return 'not_home';
      case 'busy':
        return 'busy';
      case 'return_visit':
      case 'study_conducted':
        return 'return_visit';
      default:
        return 'active';
    }
  };

  const handleSaveVisit = async () => {
    if (!household || !user) return;
    try {
      await createVisit({
        householdId: household.id,
        userId: user.id,
        publisherName: user.name || 'Publisher',
        outcome,
        householdStatusAfter: resolveHouseholdStatusAfter(outcome),
        notes: visitNotes || null,
        bibleTopicDiscussed: topicDiscussed || null,
        literatureLeft: literatureLeft || null,
        returnVisitPlanned: returnVisitPlanned || outcome === 'return_visit' || outcome === 'study_conducted',
      });
      await triggerHaptic('success');
      setVisitModalVisible(false);
    } catch {
      triggerHaptic('error');
    }
  };

  const handleAddCollaborator = async () => {
    if (!household || !selectedCollaboratorId) return;
    const current = household.collaboratorIds || [];
    if (current.includes(selectedCollaboratorId)) {
      setShareModalVisible(false);
      return;
    }
    try {
      await updateHousehold(household.id, {
        collaboratorIds: [...current, selectedCollaboratorId],
      });
      await triggerHaptic('success');
      setShareModalVisible(false);
      Alert.alert('Shared', 'Household record has been shared with collaborator.');
    } catch {
      triggerHaptic('error');
    }
  };

  const getBadgeVariant = (val?: string) => {
    switch (val) {
      case 'do_not_visit':
        return 'destructive';
      case 'not_home':
      case 'busy':
        return 'warning';
      case 'active':
      case 'answered':
        return 'success';
      case 'return_visit':
      case 'study_conducted':
      case 'foreign_language':
        return 'primary';
      default:
        return 'secondary';
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Household',
      'Are you sure you want to delete this household record? All visit history will be preserved.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteHousehold(householdId);
            await triggerHaptic('success');
            router.back();
          },
        },
      ]
    );
  };

  if (householdLoading) {
    return (
      <View style={[styles.container, styles.centerContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!household) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Header showBack title="Household" />
        <View style={styles.centerContainer}>
          <Text style={{ color: colors.mutedForeground }}>Household record not found</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header
        showBack
        title="Household Details"
        subtitle={household.address}
        rightAction={
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {canShare && (
              <TouchableOpacity onPress={() => setShareModalVisible(true)} style={styles.iconBtn}>
                <Share2 size={18} color={colors.foreground} />
              </TouchableOpacity>
            )}
            {canDelete && (
              <TouchableOpacity onPress={handleDelete} style={styles.iconBtn}>
                <Trash2 size={18} color={colors.destructive} />
              </TouchableOpacity>
            )}
          </View>
        }
      />

      <ScrollView
        contentContainerStyle={{
          padding: spacing.md,
          paddingBottom: insets.bottom + spacing.xxl,
        }}
      >
        {/* Profile Card */}
        <Card style={styles.card}>
          <View style={styles.profileHeader}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.addressTitle, { color: colors.foreground, fontSize: typography.lg }]}>
                {household.address}
              </Text>
              {household.city ? (
                <View style={styles.locRow}>
                  <MapPin size={12} color={colors.mutedForeground} />
                  <Text style={{ color: colors.mutedForeground, fontSize: typography.xs, marginLeft: 4 }}>
                    {household.city} {household.postalCode ? `• ${household.postalCode}` : ''}
                  </Text>
                </View>
              ) : null}
            </View>
            <Badge label={household.status.replace('_', ' ')} variant={getBadgeVariant(household.status)} />
          </View>

          {household.notes && (
            <View style={[styles.notesBox, { backgroundColor: colors.muted + '30', borderColor: colors.border }]}>
              <Text style={{ color: colors.foreground, fontSize: typography.sm }}>
                "{household.notes}"
              </Text>
            </View>
          )}

          {canLog && (
            <Button
              title="Log Visit for this Door"
              onPress={() => setVisitModalVisible(true)}
              size="lg"
              style={{ marginTop: spacing.md }}
            />
          )}
        </Card>

        {/* Visit History Section */}
        <Text style={[styles.sectionTitle, { color: colors.foreground, fontSize: typography.base, marginTop: spacing.lg, marginBottom: spacing.sm }]}>
          Visit History ({visits.length})
        </Text>

        {visitsLoading ? (
          <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 16 }} />
        ) : visits.length === 0 ? (
          <Card style={{ padding: 16, alignItems: 'center' }}>
            <Text style={{ color: colors.mutedForeground, fontSize: typography.sm }}>
              No visits logged for this household yet.
            </Text>
          </Card>
        ) : (
          visits.map((v) => (
            <Card key={v.id} style={[styles.card, { marginBottom: spacing.sm }]}>
              <View style={styles.visitHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.foreground, fontWeight: '700', fontSize: typography.sm }}>
                    {new Date(v.visitDate).toLocaleDateString()} &bull; {v.publisherName || 'Publisher'}
                  </Text>
                </View>
                <Badge label={v.outcome.replace('_', ' ')} variant={getBadgeVariant(v.outcome)} size="sm" />
              </View>

              {v.bibleTopicDiscussed && (
                <Text style={{ color: colors.primary, fontSize: typography.xs, marginTop: 4, fontWeight: '600' }}>
                  Topic: {v.bibleTopicDiscussed}
                </Text>
              )}

              {v.literatureLeft && (
                <Text style={{ color: colors.secondaryForeground, fontSize: typography.xs, marginTop: 2 }}>
                  Literature: {v.literatureLeft}
                </Text>
              )}

              {v.notes && (
                <Text style={{ color: colors.foreground, fontSize: typography.xs, marginTop: 4, fontStyle: 'italic' }}>
                  "{v.notes}"
                </Text>
              )}
            </Card>
          ))
        )}
      </ScrollView>

      {/* Log Visit Modal */}
      <Modal visible={visitModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <Card style={[styles.modalCard, { width: '92%', maxHeight: '85%' }]}>
            <View style={styles.modalHeaderRow}>
              <Text style={[styles.modalTitle, { color: colors.foreground, fontSize: typography.lg }]}>
                Log Visit
              </Text>
              <TouchableOpacity onPress={() => setVisitModalVisible(false)}>
                <X size={22} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={{ color: colors.foreground, fontWeight: '600', marginBottom: 8 }}>
                Outcome
              </Text>
              <View style={styles.outcomesGrid}>
                {OUTCOME_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt.id}
                    onPress={() => {
                      triggerHaptic('light');
                      setOutcome(opt.id);
                    }}
                    style={[
                      styles.outcomeOption,
                      {
                        borderColor: outcome === opt.id ? opt.color : colors.border,
                        backgroundColor: outcome === opt.id ? opt.color + '20' : colors.card,
                      },
                    ]}
                  >
                    <Text
                      style={{
                        color: outcome === opt.id ? opt.color : colors.foreground,
                        fontWeight: outcome === opt.id ? '700' : '500',
                        fontSize: typography.xs,
                      }}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Input
                label="Bible Topic / Scripture Discussed"
                placeholder="e.g. Hope for the dead, Psalm 37:29"
                value={topicDiscussed}
                onChangeText={setTopicDiscussed}
              />

              <Input
                label="Literature Placed / Left"
                placeholder="e.g. Awake! No. 1, Enjoy Life tract"
                value={literatureLeft}
                onChangeText={setLiteratureLeft}
              />

              <Input
                label="Visit Notes"
                placeholder="Details of conversation, family members, etc."
                value={visitNotes}
                onChangeText={setVisitNotes}
                multiline
                numberOfLines={3}
                style={{ minHeight: 60 }}
              />

              <TouchableOpacity
                onPress={() => setReturnVisitPlanned(!returnVisitPlanned)}
                style={[styles.checkboxRow, { marginTop: spacing.xs, marginBottom: spacing.md }]}
              >
                <View
                  style={[
                    styles.checkbox,
                    {
                      borderColor: returnVisitPlanned ? colors.primary : colors.border,
                      backgroundColor: returnVisitPlanned ? colors.primary : 'transparent',
                    },
                  ]}
                >
                  {returnVisitPlanned && <Check size={14} color="#ffffff" />}
                </View>
                <Text style={{ color: colors.foreground, fontSize: typography.sm, marginLeft: 8 }}>
                  Plan a Return Visit
                </Text>
              </TouchableOpacity>

              <Button
                title="Save Visit"
                onPress={handleSaveVisit}
                loading={isLoggingVisit}
                size="lg"
              />
            </ScrollView>
          </Card>
        </View>
      </Modal>

      {/* Share / Collaborate Modal */}
      <Modal visible={shareModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <Card style={[styles.modalCard, { width: '88%', maxHeight: '70%' }]}>
            <View style={styles.modalHeaderRow}>
              <Text style={[styles.modalTitle, { color: colors.foreground, fontSize: typography.lg }]}>
                Share Household Record
              </Text>
              <TouchableOpacity onPress={() => setShareModalVisible(false)}>
                <X size={20} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>

            <Text style={{ color: colors.mutedForeground, fontSize: typography.xs, marginBottom: spacing.md }}>
              Select a publisher to collaborate on this return visit / door:
            </Text>

            <ScrollView style={{ maxHeight: 220 }}>
              {members
                .filter((m) => m.userId !== user?.id)
                .map((m) => {
                  const isSelected = selectedCollaboratorId === m.userId;
                  return (
                    <TouchableOpacity
                      key={m.id}
                      onPress={() => {
                        triggerHaptic('light');
                        setSelectedCollaboratorId(m.userId);
                      }}
                      style={[
                        styles.memberRow,
                        {
                          borderColor: isSelected ? colors.primary : colors.border,
                          backgroundColor: isSelected ? colors.primary + '15' : colors.card,
                        },
                      ]}
                    >
                      <Text style={{ color: colors.foreground, fontWeight: isSelected ? '700' : '500' }}>
                        {m.user?.name || 'Publisher'}
                      </Text>
                      <Text style={{ color: colors.mutedForeground, fontSize: typography.xs }}>
                        {m.congregationRole || 'publisher'}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
            </ScrollView>

            <Button
              title="Add Collaborator"
              onPress={handleAddCollaborator}
              disabled={!selectedCollaboratorId}
              size="lg"
              style={{ marginTop: spacing.md }}
            />
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
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtn: {
    padding: 6,
  },
  card: {
    padding: 16,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  addressTitle: {
    fontWeight: '800',
  },
  locRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  notesBox: {
    marginTop: 12,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  sectionTitle: {
    fontWeight: '700',
  },
  visitHeader: {
    flexDirection: 'row',
    alignItems: 'center',
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
    marginBottom: 10,
  },
  modalTitle: {
    fontWeight: '800',
  },
  outcomesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  outcomeOption: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1.2,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
});
