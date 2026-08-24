// mobile/app/(tabs)/territories/[territoryId].tsx
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  CheckCircle2,
  Clock,
  Download,
  Home,
  MapPin,
  UserCheck,
  Users,
  X,
} from 'lucide-react-native';
import { useMemo, useState } from 'react';
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
import { TerritoryMapView } from '@/components/map';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Header } from '@/components/ui/Header';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import {
  useCreateAssignment,
  useReturnAssignment,
  useRevokeTerritory,
  useTerritoryAssignments,
  useUpdateAssignment,
} from '@/hooks/useAssignments';
import { useCongregationGroups } from '@/hooks/useCongregationGroups';
import { useCongregationMembers } from '@/hooks/useCongregationMembers';
import { useHouseholds } from '@/hooks/useHouseholds';
import {
  useCreateTerritoryRequest,
  useDeleteTerritory,
  useTerritoryDetail,
} from '@/hooks/useTerritories';
import { exportTerritoryCardPdf } from '@/lib/pdf-export';
import { canAdjustAssignmentDates, canEditTerritory } from '@/lib/permissions';
import { triggerHaptic } from '@/lib/sound';
import type { Assignment } from '@/types/api';

export default function TerritoryDetailScreen() {
  const _router = useRouter();
  const insets = useSafeAreaInsets();
  const { territoryId } = useLocalSearchParams<{ territoryId: string }>();

  const { user, activeCongregationId } = useAuth();
  const { colors, typography, spacing, radius } = useTheme();

  const { territory, isLoading: territoryLoading } = useTerritoryDetail(territoryId);
  const { assignments = [], isLoading: assignmentsLoading } = useTerritoryAssignments(territoryId);
  const { households = [] } = useHouseholds({ territoryId });
  const { members = [] } = useCongregationMembers(activeCongregationId);
  const { groups = [] } = useCongregationGroups(activeCongregationId);

  const { request: requestTerritory, isRequesting } = useCreateTerritoryRequest(
    activeCongregationId || ''
  );
  const { create: assignTerritory, isCreating: isAssigning } = useCreateAssignment();
  const { returnTerritory, isReturning } = useReturnAssignment();
  const { revoke: revokeTerritory, isRevoking } = useRevokeTerritory();
  const { update: updateAssignment, isUpdating: isUpdatingAssignment } = useUpdateAssignment();
  const { remove: deleteTerritory, isDeleting } = useDeleteTerritory();

  const [requestModalVisible, setRequestModalVisible] = useState(false);
  const [requestMessage, setRequestMessage] = useState('');

  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [assignDate, setAssignDate] = useState(() => new Date().toISOString().slice(0, 10));

  const [returnRevokeModalVisible, setReturnRevokeModalVisible] = useState(false);
  const [returnRevokeDate, setReturnRevokeDate] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );

  const [historyModalVisible, setHistoryModalVisible] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);
  const [editAssignedAt, setEditAssignedAt] = useState('');
  const [editReturnedAt, setEditReturnedAt] = useState('');
  const [editDueAt, setEditDueAt] = useState('');
  const [editNotes, setEditNotes] = useState('');

  const canEdit = canEditTerritory(user?.role);
  const canAdjust = canAdjustAssignmentDates(user?.role);
  const activeAssignment = assignments.find(
    (a) => a.status === 'assigned' || a.status === 'active'
  );

  const boundaryCoords = useMemo(() => {
    if (!territory?.boundaryCoordinates) return [];
    const raw = territory.boundaryCoordinates;
    if (Array.isArray(raw) && raw.length > 0) {
      if (Array.isArray(raw[0])) {
        return (raw[0] as Array<{ lat: number; lng: number }>).map((pt) => ({
          latitude: pt.lat,
          longitude: pt.lng,
        }));
      }
      return (raw as Array<{ lat: number; lng: number }>).map((pt) => ({
        latitude: pt.lat,
        longitude: pt.lng,
      }));
    }
    return [];
  }, [territory?.boundaryCoordinates]);

  const mapRegion = useMemo(() => {
    if (boundaryCoords.length > 0) {
      const lats = boundaryCoords.map((c) => c.latitude);
      const lngs = boundaryCoords.map((c) => c.longitude);
      const minLat = Math.min(...lats);
      const maxLat = Math.max(...lats);
      const minLng = Math.min(...lngs);
      const maxLng = Math.max(...lngs);
      return {
        latitude: (minLat + maxLat) / 2,
        longitude: (minLng + maxLng) / 2,
        latitudeDelta: Math.max(0.008, (maxLat - minLat) * 1.5),
        longitudeDelta: Math.max(0.008, (maxLng - minLng) * 1.5),
      };
    }
    return {
      latitude: 14.5995,
      longitude: 120.9842,
      latitudeDelta: 0.02,
      longitudeDelta: 0.02,
    };
  }, [boundaryCoords]);

  const totalDoors = households.length || territory?.householdsCount || 0;
  const workedDoors = households.filter((h) => h.lastVisitDate).length;
  const coverage = totalDoors > 0 ? Math.round((workedDoors / totalDoors) * 100) : 0;

  const handleSendRequest = async () => {
    if (!user || !territoryId) return;
    try {
      await requestTerritory({
        publisherId: user.id,
        publisherName: user.name || 'Publisher',
        territoryId,
        message: requestMessage.trim() || null,
      });
      await triggerHaptic('success');
      setRequestModalVisible(false);
      Alert.alert('Request Sent', 'Your territory request has been sent to the territory servant.');
    } catch {
      triggerHaptic('error');
    }
  };

  const handleAssignToMember = async () => {
    if (!selectedMemberId || !territory) return;
    const member = members.find((m) => m.userId === selectedMemberId);
    try {
      await assignTerritory({
        territoryId: territory.id,
        congregationId: territory.congregationId,
        userId: selectedMemberId,
        assigneeName: member?.user?.name || 'Publisher',
        assigneeEmail: member?.user?.email || null,
        endorsedByUserId: user?.id || null,
        endorsedByUserName: user?.name || null,
        assignedAt: assignDate || new Date().toISOString(),
        territoryName: territory.name,
        territoryNumber: territory.number,
      });
      await triggerHaptic('success');
      setAssignModalVisible(false);
      setAssignDate(new Date().toISOString().slice(0, 10));
    } catch {
      triggerHaptic('error');
    }
  };

  const handleReturn = () => {
    if (!activeAssignment) return;
    if (canAdjust) {
      setReturnRevokeDate(new Date().toISOString().slice(0, 10));
      setReturnRevokeModalVisible(true);
    } else {
      Alert.alert('Return Territory', `Return Territory #${territory?.number} to available pool?`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Return',
          style: 'destructive',
          onPress: async () => {
            await returnTerritory(activeAssignment.id);
            await triggerHaptic('success');
          },
        },
      ]);
    }
  };

  const handleConfirmReturnRevoke = async () => {
    if (!activeAssignment) return;
    try {
      await returnTerritory(activeAssignment.id, returnRevokeDate);
      await triggerHaptic('success');
      setReturnRevokeModalVisible(false);
    } catch {
      triggerHaptic('error');
    }
  };

  const handleOpenEditAssignment = (a: Assignment) => {
    setEditingAssignment(a);
    setEditAssignedAt(a.assignedAt ? a.assignedAt.slice(0, 10) : '');
    setEditReturnedAt(a.returnedAt ? a.returnedAt.slice(0, 10) : '');
    setEditDueAt(a.dueAt ? a.dueAt.slice(0, 10) : '');
    setEditNotes(a.notes || '');
  };

  const handleSaveAssignmentDates = async () => {
    if (!editingAssignment) return;
    try {
      await updateAssignment({
        id: editingAssignment.id,
        assignedAt: editAssignedAt
          ? new Date(`${editAssignedAt}T12:00:00.000Z`).toISOString()
          : editingAssignment.assignedAt,
        returnedAt: editReturnedAt
          ? new Date(`${editReturnedAt}T12:00:00.000Z`).toISOString()
          : null,
        dueAt: editDueAt ? new Date(`${editDueAt}T12:00:00.000Z`).toISOString() : null,
        notes: editNotes.trim() || undefined,
      });
      await triggerHaptic('success');
      Alert.alert('Success', 'Assignment dates updated successfully.');
      setEditingAssignment(null);
    } catch (err: any) {
      triggerHaptic('error');
      Alert.alert('Error', err?.message || 'Failed to update assignment dates');
    }
  };

  const handleExportCard = async () => {
    if (!territory) return;
    try {
      await triggerHaptic('light');
      await exportTerritoryCardPdf(territory);
    } catch (err: any) {
      Alert.alert('Export Error', err.message || 'Failed to export territory card');
    }
  };

  if (territoryLoading) {
    return (
      <View
        style={[styles.container, styles.centerContainer, { backgroundColor: colors.background }]}
      >
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!territory) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Header showBack title="Territory" />
        <View style={styles.centerContainer}>
          <Text style={{ color: colors.mutedForeground }}>Territory not found</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header
        showBack
        title={`Territory #${territory.number}`}
        subtitle={territory.name}
        rightAction={
          <TouchableOpacity onPress={handleExportCard} style={styles.exportBtn}>
            <Download size={20} color={colors.primary} />
          </TouchableOpacity>
        }
      />

      <ScrollView
        contentContainerStyle={{
          padding: spacing.md,
          paddingBottom: insets.bottom + spacing.xxl,
        }}
      >
        {/* Boundary Map Preview */}
        <Card style={styles.mapCard}>
          <TerritoryMapView
            style={styles.miniMap}
            initialRegion={mapRegion}
            boundaryCoordinates={boundaryCoords}
            scrollEnabled={false}
            zoomEnabled={false}
            showsUserLocation={false}
          />
        </Card>

        {/* Territory Overview Header */}
        <Card style={[styles.sectionCard, { marginTop: spacing.md }]}>
          <View style={styles.titleRow}>
            <View style={{ flex: 1 }}>
              <Text
                style={[styles.terrName, { color: colors.foreground, fontSize: typography.lg }]}
              >
                {territory.name}
              </Text>
              {territory.city && (
                <View style={styles.locRow}>
                  <MapPin size={13} color={colors.mutedForeground} />
                  <Text
                    style={{
                      color: colors.mutedForeground,
                      fontSize: typography.xs,
                      marginLeft: 4,
                    }}
                  >
                    {territory.city}
                  </Text>
                </View>
              )}
            </View>
            <Badge
              label={territory.status}
              variant={territory.status === 'available' ? 'success' : 'primary'}
            />
          </View>

          {/* Quick Stats Grid */}
          <View style={styles.statsGrid}>
            <View style={[styles.statBox, { backgroundColor: `${colors.muted}40` }]}>
              <Home size={16} color={colors.primary} />
              <Text
                style={[styles.statValue, { color: colors.foreground, fontSize: typography.lg }]}
              >
                {totalDoors}
              </Text>
              <Text
                style={[
                  styles.statLabel,
                  { color: colors.mutedForeground, fontSize: typography.xs },
                ]}
              >
                Total Doors
              </Text>
            </View>

            <View style={[styles.statBox, { backgroundColor: `${colors.muted}40` }]}>
              <CheckCircle2 size={16} color={colors.success} />
              <Text
                style={[styles.statValue, { color: colors.foreground, fontSize: typography.lg }]}
              >
                {workedDoors}
              </Text>
              <Text
                style={[
                  styles.statLabel,
                  { color: colors.mutedForeground, fontSize: typography.xs },
                ]}
              >
                Worked Doors
              </Text>
            </View>

            <View style={[styles.statBox, { backgroundColor: `${colors.muted}40` }]}>
              <Clock size={16} color={colors.secondaryForeground} />
              <Text
                style={[styles.statValue, { color: colors.foreground, fontSize: typography.lg }]}
              >
                {coverage}%
              </Text>
              <Text
                style={[
                  styles.statLabel,
                  { color: colors.mutedForeground, fontSize: typography.xs },
                ]}
              >
                Coverage
              </Text>
            </View>
          </View>

          {territory.notes && (
            <View
              style={[
                styles.notesBox,
                { backgroundColor: `${colors.muted}30`, borderColor: colors.border },
              ]}
            >
              <Text
                style={[
                  styles.notesLabel,
                  { color: colors.mutedForeground, fontSize: typography.xs },
                ]}
              >
                TERRITORY NOTES & INSTRUCTIONS
              </Text>
              <Text
                style={[styles.notesContent, { color: colors.foreground, fontSize: typography.sm }]}
              >
                {territory.notes}
              </Text>
            </View>
          )}
        </Card>

        {/* Current Assignment Details */}
        <Card style={[styles.sectionCard, { marginTop: spacing.md }]}>
          <Text
            style={[styles.sectionTitle, { color: colors.foreground, fontSize: typography.base }]}
          >
            Assignment Information
          </Text>

          {territory.publisherName ? (
            <View style={styles.assigneeRow}>
              <View style={[styles.avatarBox, { backgroundColor: `${colors.primary}20` }]}>
                <UserCheck size={20} color={colors.primary} />
              </View>
              <View style={{ flex: 1, marginLeft: spacing.sm }}>
                <Text
                  style={[
                    styles.assigneeName,
                    { color: colors.foreground, fontSize: typography.base },
                  ]}
                >
                  {territory.publisherName}
                </Text>
                <Text style={{ color: colors.mutedForeground, fontSize: typography.xs }}>
                  Assigned Publisher
                </Text>
              </View>

              {canEdit && (
                <Button
                  title="Return"
                  size="sm"
                  variant="destructive"
                  onPress={handleReturn}
                  loading={isReturning}
                />
              )}
            </View>
          ) : territory.groupName ? (
            <View style={styles.assigneeRow}>
              <View style={[styles.avatarBox, { backgroundColor: `${colors.secondary}20` }]}>
                <Users size={20} color={colors.secondaryForeground} />
              </View>
              <View style={{ flex: 1, marginLeft: spacing.sm }}>
                <Text
                  style={[
                    styles.assigneeName,
                    { color: colors.foreground, fontSize: typography.base },
                  ]}
                >
                  {territory.groupName}
                </Text>
                <Text style={{ color: colors.mutedForeground, fontSize: typography.xs }}>
                  Service Group Assignment
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.availableBox}>
              <Text style={{ color: colors.mutedForeground, fontSize: typography.sm }}>
                This territory is currently available for checkout.
              </Text>
              <Button
                title="Request Territory"
                size="md"
                onPress={() => setRequestModalVisible(true)}
                style={{ marginTop: spacing.sm }}
              />
            </View>
          )}

          {/* Servant Actions & History */}
          {canEdit && !territory.publisherName && !territory.groupName && (
            <Button
              title="Assign to Publisher"
              variant="outline"
              size="md"
              onPress={() => setAssignModalVisible(true)}
              style={{ marginTop: spacing.md }}
            />
          )}

          <Button
            title="Assignment History & Dates"
            variant="ghost"
            size="sm"
            onPress={() => setHistoryModalVisible(true)}
            style={{ marginTop: spacing.sm }}
          />
        </Card>
      </ScrollView>

      {/* Request Territory Modal */}
      <Modal visible={requestModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <Card style={[styles.modalCard, { width: '88%' }]}>
            <View style={styles.modalHeaderRow}>
              <Text
                style={[styles.modalTitle, { color: colors.foreground, fontSize: typography.lg }]}
              >
                Request Territory #{territory.number}
              </Text>
              <TouchableOpacity onPress={() => setRequestModalVisible(false)}>
                <X size={20} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>

            <Input
              label="Message / Note (Optional)"
              placeholder="e.g. Planning to work this weekend with..."
              value={requestMessage}
              onChangeText={setRequestMessage}
              multiline
              numberOfLines={3}
              style={{ minHeight: 70 }}
            />

            <Button
              title="Send Request"
              onPress={handleSendRequest}
              loading={isRequesting}
              size="lg"
              style={{ marginTop: spacing.sm }}
            />
          </Card>
        </View>
      </Modal>

      {/* Assign to Publisher Modal */}
      <Modal visible={assignModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <Card style={[styles.modalCard, { width: '90%', maxHeight: '80%' }]}>
            <View style={styles.modalHeaderRow}>
              <Text
                style={[styles.modalTitle, { color: colors.foreground, fontSize: typography.lg }]}
              >
                Assign Territory #{territory.number}
              </Text>
              <TouchableOpacity onPress={() => setAssignModalVisible(false)}>
                <X size={20} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>

            <View style={{ marginBottom: spacing.sm }}>
              <Input
                label="Assignment Date (YYYY-MM-DD)"
                value={assignDate}
                onChangeText={setAssignDate}
                placeholder="YYYY-MM-DD"
              />
            </View>

            <Text
              style={{
                color: colors.mutedForeground,
                fontSize: typography.xs,
                marginBottom: spacing.xs,
              }}
            >
              Select a publisher from your congregation:
            </Text>

            <ScrollView style={{ maxHeight: 200 }}>
              {members.map((m) => {
                const isSelected = selectedMemberId === m.userId;
                return (
                  <TouchableOpacity
                    key={m.id}
                    onPress={() => {
                      triggerHaptic('light');
                      setSelectedMemberId(m.userId);
                    }}
                    style={[
                      styles.memberSelectRow,
                      {
                        borderColor: isSelected ? colors.primary : colors.border,
                        backgroundColor: isSelected ? `${colors.primary}15` : colors.card,
                      },
                    ]}
                  >
                    <Text
                      style={{
                        color: colors.foreground,
                        fontWeight: isSelected ? '700' : '500',
                        fontSize: typography.sm,
                      }}
                    >
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
              title="Confirm Assignment"
              onPress={handleAssignToMember}
              disabled={!selectedMemberId || !assignDate.trim()}
              loading={isAssigning}
              size="lg"
              style={{ marginTop: spacing.md }}
            />
          </Card>
        </View>
      </Modal>

      {/* Return / Revoke Territory Modal */}
      <Modal visible={returnRevokeModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <Card style={[styles.modalCard, { width: '88%' }]}>
            <View style={styles.modalHeaderRow}>
              <Text
                style={[styles.modalTitle, { color: colors.foreground, fontSize: typography.lg }]}
              >
                Return Territory #{territory.number}
              </Text>
              <TouchableOpacity onPress={() => setReturnRevokeModalVisible(false)}>
                <X size={20} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>

            <Text
              style={{ color: colors.mutedForeground, fontSize: typography.sm, marginBottom: 12 }}
            >
              This will mark the current assignment as completed and return the territory to
              available status.
            </Text>

            <View style={{ marginBottom: 16 }}>
              <Input
                label="Effective Return / Revocation Date"
                value={returnRevokeDate}
                onChangeText={setReturnRevokeDate}
                placeholder="YYYY-MM-DD"
              />
            </View>

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Button
                title="Cancel"
                variant="ghost"
                onPress={() => setReturnRevokeModalVisible(false)}
                style={{ flex: 1 }}
              />
              <Button
                title="Confirm Return"
                variant="destructive"
                onPress={handleConfirmReturnRevoke}
                loading={isReturning}
                disabled={!returnRevokeDate.trim()}
                style={{ flex: 1 }}
              />
            </View>
          </Card>
        </View>
      </Modal>

      {/* Territory Assignment History Modal */}
      <Modal visible={historyModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <Card style={[styles.modalCard, { width: '92%', maxHeight: '80%' }]}>
            <View style={styles.modalHeaderRow}>
              <Text
                style={[styles.modalTitle, { color: colors.foreground, fontSize: typography.lg }]}
              >
                Territory #{territory.number} History
              </Text>
              <TouchableOpacity onPress={() => setHistoryModalVisible(false)}>
                <X size={20} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 380 }}>
              {assignmentsLoading ? (
                <ActivityIndicator color={colors.primary} style={{ marginVertical: 20 }} />
              ) : assignments.length === 0 ? (
                <Text
                  style={{
                    color: colors.mutedForeground,
                    fontSize: typography.sm,
                    textAlign: 'center',
                    marginVertical: 20,
                  }}
                >
                  No assignment records for this territory.
                </Text>
              ) : (
                assignments.map((a) => (
                  <View
                    key={a.id}
                    style={{
                      padding: 12,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: colors.border,
                      marginBottom: 10,
                      backgroundColor: colors.card,
                    }}
                  >
                    <View
                      style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <Text
                        style={{
                          fontWeight: '700',
                          color: colors.foreground,
                          fontSize: typography.sm,
                        }}
                      >
                        {a.groupName || a.assigneeName || 'Publisher / Group'}
                      </Text>
                      <Badge
                        label={a.status}
                        variant={a.status === 'completed' ? 'success' : 'primary'}
                        size="sm"
                      />
                    </View>
                    <Text
                      style={{
                        color: colors.mutedForeground,
                        fontSize: typography.xs,
                        marginTop: 4,
                      }}
                    >
                      Assigned: {a.assignedAt ? new Date(a.assignedAt).toLocaleDateString() : '—'}
                    </Text>
                    <Text style={{ color: colors.mutedForeground, fontSize: typography.xs }}>
                      Returned:{' '}
                      {a.returnedAt
                        ? new Date(a.returnedAt).toLocaleDateString()
                        : 'Active in Field'}
                    </Text>
                    {a.dueAt && (
                      <Text style={{ color: colors.mutedForeground, fontSize: typography.xs }}>
                        Due: {new Date(a.dueAt).toLocaleDateString()}
                      </Text>
                    )}
                    {a.notes ? (
                      <Text
                        style={{
                          color: colors.mutedForeground,
                          fontSize: typography.xs,
                          fontStyle: 'italic',
                          marginTop: 2,
                        }}
                      >
                        Note: {a.notes}
                      </Text>
                    ) : null}

                    {canAdjust && (
                      <Button
                        title="Adjust Dates"
                        variant="outline"
                        size="sm"
                        onPress={() => handleOpenEditAssignment(a)}
                        style={{ marginTop: 8 }}
                      />
                    )}
                  </View>
                ))
              )}
            </ScrollView>
          </Card>
        </View>
      </Modal>

      {/* Adjust Assignment Dates Sub-Modal */}
      <Modal visible={Boolean(editingAssignment)} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <Card style={[styles.modalCard, { width: '90%' }]}>
            <View style={styles.modalHeaderRow}>
              <Text
                style={[styles.modalTitle, { color: colors.foreground, fontSize: typography.md }]}
              >
                Adjust Assignment Dates
              </Text>
              <TouchableOpacity onPress={() => setEditingAssignment(null)}>
                <X size={20} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>

            <View style={{ gap: 10, marginVertical: 10 }}>
              <Input
                label="Date Assigned (YYYY-MM-DD)"
                value={editAssignedAt}
                onChangeText={setEditAssignedAt}
                placeholder="YYYY-MM-DD"
              />
              <Input
                label="Date Returned (YYYY-MM-DD)"
                value={editReturnedAt}
                onChangeText={setEditReturnedAt}
                placeholder="Leave blank if active"
              />
              <Input
                label="Due Date (YYYY-MM-DD)"
                value={editDueAt}
                onChangeText={setEditDueAt}
                placeholder="Optional"
              />
              <Input
                label="Notes"
                value={editNotes}
                onChangeText={setEditNotes}
                placeholder="Reason for adjustment"
              />
            </View>

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 6 }}>
              <Button
                title="Cancel"
                variant="ghost"
                onPress={() => setEditingAssignment(null)}
                style={{ flex: 1 }}
              />
              <Button
                title="Save Changes"
                onPress={handleSaveAssignmentDates}
                loading={isUpdatingAssignment}
                disabled={!editAssignedAt.trim()}
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
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exportBtn: {
    padding: 6,
  },
  mapCard: {
    padding: 0,
    overflow: 'hidden',
    height: 180,
  },
  miniMap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  sectionCard: {
    padding: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  terrName: {
    fontWeight: '800',
  },
  locRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
  },
  statBox: {
    flex: 1,
    padding: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  statValue: {
    fontWeight: '800',
    marginTop: 4,
  },
  statLabel: {
    fontWeight: '500',
    marginTop: 1,
  },
  notesBox: {
    marginTop: 16,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  notesLabel: {
    fontWeight: '700',
    marginBottom: 4,
  },
  notesContent: {
    lineHeight: 20,
  },
  sectionTitle: {
    fontWeight: '700',
    marginBottom: 12,
  },
  assigneeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  assigneeName: {
    fontWeight: '700',
  },
  availableBox: {
    alignItems: 'center',
    paddingVertical: 10,
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
  memberSelectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
});
