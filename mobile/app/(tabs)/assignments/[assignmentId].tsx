// mobile/app/(tabs)/assignments/[assignmentId].tsx
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  Check,
  Compass,
  Crosshair,
  List as ListIcon,
  Map as MapIcon,
  Plus,
  RotateCcw,
  X,
} from 'lucide-react-native';
import React, { useMemo, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { type MapMarkerItem, TerritoryMapView, type TerritoryMapViewRef } from '@/components/map';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Header } from '@/components/ui/Header';
import { Input } from '@/components/ui/Input';
import { TerritoryDetailSkeleton } from '@/components/ui/ScreenSkeletons';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useReturnAssignment, useTerritoryAssignments } from '@/hooks/useAssignments';
import { useCreateHousehold, useHouseholds } from '@/hooks/useHouseholds';
import { useLocation } from '@/hooks/useLocation';
import { useTerritoryDetail } from '@/hooks/useTerritories';
import { useCreateVisit } from '@/hooks/useVisits';
import { findDuplicateHouseholdByNumber, getNextCongregationHouseNumber } from '@/lib/households';
import { canAdjustAssignmentDates } from '@/lib/permissions';
import { triggerHaptic } from '@/lib/sound';
import type { Household } from '@/types/api';

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

export default function AssignmentDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { assignmentId } = useLocalSearchParams<{ assignmentId: string }>();
  const territoryId = assignmentId || '';

  const { user } = useAuth();
  const { colors, typography, spacing, radius, isDark } = useTheme();
  const mapRef = useRef<TerritoryMapViewRef>(null);

  const { territory, isLoading: territoryLoading } = useTerritoryDetail(territoryId);
  const { assignments = [] } = useTerritoryAssignments(territoryId);
  const { households = [], isLoading: householdsLoading } = useHouseholds({ territoryId });
  const { households: allCongregationHouseholds = [] } = useHouseholds({
    congregationId: territory?.congregationId || user?.congregationId || null,
  });
  const { returnTerritory, isReturning } = useReturnAssignment();
  const { create: createVisit, isCreating: isLoggingVisit } = useCreateVisit();
  const { create: createHousehold, isCreating: isCreatingHousehold } = useCreateHousehold();
  const { location, refreshLocation } = useLocation(true);

  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
  const [selectedHousehold, setSelectedHousehold] = useState<Household | null>(null);

  // Log Visit Modal State
  const [visitModalVisible, setVisitModalVisible] = useState(false);
  const [outcome, setOutcome] = useState('answered');
  const [notes, setNotes] = useState('');
  const [topicDiscussed, setTopicDiscussed] = useState('');
  const [literatureLeft, setLiteratureLeft] = useState('');
  const [returnVisitPlanned, setReturnVisitPlanned] = useState(false);

  // Add Household Modal State
  const [addDoorModalVisible, setAddDoorModalVisible] = useState(false);
  const [newDoorHouseNumber, setNewDoorHouseNumber] = useState('');
  const [newDoorAddress, setNewDoorAddress] = useState('');
  const [newDoorNotes, setNewDoorNotes] = useState('');

  // Return Territory Modal
  const [returnModalVisible, setReturnModalVisible] = useState(false);
  const [returnDate, setReturnDate] = useState(() => new Date().toISOString().slice(0, 10));
  const canAdjust = canAdjustAssignmentDates(user?.role);

  const activeAssignment =
    assignments.find((a) => a.status === 'assigned' || a.status === 'active') || assignments[0];

  // Parse boundary polygon coordinates for map
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

  // Initial map region
  const initialRegion = useMemo(() => {
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
        latitudeDelta: Math.max(0.01, (maxLat - minLat) * 1.5),
        longitudeDelta: Math.max(0.01, (maxLng - minLng) * 1.5),
      };
    }
    if (location) {
      return {
        latitude: location.latitude,
        longitude: location.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
    }
    return {
      latitude: 14.5995,
      longitude: 120.9842,
      latitudeDelta: 0.02,
      longitudeDelta: 0.02,
    };
  }, [boundaryCoords, location]);

  // Auto-fit to territory boundary when coordinates load
  React.useEffect(() => {
    if (boundaryCoords.length > 0 && mapRef.current) {
      const timer = setTimeout(() => {
        mapRef.current?.fitToCoordinates(boundaryCoords, {
          edgePadding: { top: 60, right: 60, bottom: 60, left: 60 },
          animated: true,
        });
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [boundaryCoords]);

  const handleCenterOnMe = async () => {
    await triggerHaptic('light');
    const coords = await refreshLocation();
    if (coords && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: coords.latitude,
        longitude: coords.longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      });
    }
  };

  const handleFitBoundary = () => {
    triggerHaptic('light');
    if (boundaryCoords.length > 0 && mapRef.current) {
      mapRef.current.fitToCoordinates(boundaryCoords, {
        edgePadding: { top: 60, right: 60, bottom: 60, left: 60 },
        animated: true,
      });
    }
  };

  const handleOpenLogVisit = (h: Household) => {
    setSelectedHousehold(h);
    setOutcome('answered');
    setNotes('');
    setTopicDiscussed('');
    setLiteratureLeft('');
    setReturnVisitPlanned(false);
    setVisitModalVisible(true);
  };

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

  const handleSubmitVisit = async () => {
    if (!selectedHousehold || !user) return;
    try {
      await createVisit({
        householdId: selectedHousehold.id,
        userId: user.id,
        publisherName: user.name || 'Publisher',
        assignmentId: activeAssignment?.id || null,
        outcome,
        householdStatusAfter: resolveHouseholdStatusAfter(outcome),
        notes: notes || null,
        bibleTopicDiscussed: topicDiscussed || null,
        literatureLeft: literatureLeft || null,
        returnVisitPlanned:
          returnVisitPlanned || outcome === 'return_visit' || outcome === 'study_conducted',
      });
      await triggerHaptic('success');
      setVisitModalVisible(false);
      setSelectedHousehold(null);
    } catch {
      triggerHaptic('error');
    }
  };

  const handleOpenAddDoorModal = () => {
    const list = allCongregationHouseholds.length > 0 ? allCongregationHouseholds : households;
    setNewDoorHouseNumber(getNextCongregationHouseNumber(list));
    setNewDoorAddress('');
    setNewDoorNotes('');
    setAddDoorModalVisible(true);
  };

  const handleAddDoorAtCurrentLocation = async () => {
    if (!newDoorHouseNumber.trim()) {
      Alert.alert('Required Field', 'House / Door number is required.');
      return;
    }
    if (!newDoorAddress.trim()) {
      Alert.alert('Required Field', 'Street name or address is required.');
      return;
    }

    const list = allCongregationHouseholds.length > 0 ? allCongregationHouseholds : households;
    const duplicate = findDuplicateHouseholdByNumber(newDoorHouseNumber.trim(), list);
    if (duplicate) {
      Alert.alert(
        'Duplicate House Number',
        `House #${newDoorHouseNumber.trim()} already exists in this congregation.`
      );
      return;
    }

    try {
      await createHousehold({
        houseNumber: newDoorHouseNumber.trim(),
        address: newDoorAddress.trim(),
        streetName: newDoorAddress.trim(),
        territoryId,
        congregationId: territory?.congregationId || user?.congregationId || null,
        createdById: user?.id || null,
        creatorName: user?.name || null,
        latitude: location?.latitude || null,
        longitude: location?.longitude || null,
        notes: newDoorNotes.trim() || null,
        status: 'new',
      });
      await triggerHaptic('success');
      setAddDoorModalVisible(false);
      setNewDoorHouseNumber('');
      setNewDoorAddress('');
      setNewDoorNotes('');
    } catch {
      triggerHaptic('error');
    }
  };

  const handleReturnTerritory = async () => {
    if (!activeAssignment) return;
    try {
      await returnTerritory(activeAssignment.id, canAdjust ? returnDate : undefined);
      await triggerHaptic('success');
      setReturnModalVisible(false);
      setReturnDate(new Date().toISOString().slice(0, 10));
      router.replace('/(tabs)/assignments');
    } catch {
      triggerHaptic('error');
    }
  };

  const getMarkerColor = (h: Household) => {
    switch (h.status) {
      case 'do_not_visit':
        return '#dc2626';
      case 'return_visit':
        return '#6b9ecc';
      case 'not_home':
        return '#d97706';
      case 'busy':
        return '#ea580c';
      case 'foreign_language':
        return '#06b6d4';
      case 'inaccessible':
        return '#78716c';
      case 'vacant':
        return '#64748b';
      case 'active':
        return '#16a34a';
      default:
        return '#9b9b9b';
    }
  };

  const mapMarkers: MapMarkerItem[] = useMemo(() => {
    return households
      .filter((h) => {
        const lat = Number(h.latitude);
        const lng = Number(h.longitude);
        return !Number.isNaN(lat) && !Number.isNaN(lng) && lat !== 0 && lng !== 0;
      })
      .map((h) => ({
        id: h.id,
        coordinate: { latitude: Number(h.latitude), longitude: Number(h.longitude) },
        title: h.address,
        description: h.status,
        color: getMarkerColor(h),
        onPress: () => setSelectedHousehold(h),
      }));
  }, [households]);

  if (territoryLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Header showBack title="Territory" />
        <TerritoryDetailSkeleton />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header
        showBack
        title={`Territory #${territory?.number || '—'}`}
        subtitle={territory?.name || 'Assignment View'}
        rightAction={
          <View style={styles.headerRight}>
            <TouchableOpacity
              onPress={() => {
                triggerHaptic('light');
                setViewMode(viewMode === 'map' ? 'list' : 'map');
              }}
              style={[styles.modeToggle, { backgroundColor: colors.muted }]}
            >
              {viewMode === 'map' ? (
                <ListIcon size={18} color={colors.foreground} />
              ) : (
                <MapIcon size={18} color={colors.foreground} />
              )}
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setReturnModalVisible(true)}
              style={[
                styles.modeToggle,
                { backgroundColor: `${colors.secondary}25`, marginLeft: 8 },
              ]}
            >
              <RotateCcw size={16} color={colors.secondaryForeground} />
            </TouchableOpacity>
          </View>
        }
      />

      {viewMode === 'map' ? (
        <View style={styles.mapContainer}>
          <TerritoryMapView
            ref={mapRef}
            style={styles.map}
            initialRegion={initialRegion}
            boundaryCoordinates={boundaryCoords}
            markers={mapMarkers}
            showsUserLocation
          />

          {/* Floating Action Controls on Map */}
          <View style={[styles.floatingControls, { top: spacing.md, right: spacing.md }]}>
            <TouchableOpacity
              onPress={handleCenterOnMe}
              style={[styles.mapFab, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <Crosshair size={20} color={colors.foreground} />
            </TouchableOpacity>

            {boundaryCoords.length > 0 && (
              <TouchableOpacity
                onPress={handleFitBoundary}
                style={[
                  styles.mapFab,
                  { backgroundColor: colors.card, borderColor: colors.border, marginTop: 8 },
                ]}
              >
                <Compass size={20} color={colors.foreground} />
              </TouchableOpacity>
            )}

            <TouchableOpacity
              onPress={handleOpenAddDoorModal}
              style={[
                styles.mapFab,
                { backgroundColor: colors.primary, borderColor: colors.primary, marginTop: 8 },
              ]}
            >
              <Plus size={22} color="#ffffff" />
            </TouchableOpacity>
          </View>

          {/* Selected Household Bottom Sheet Preview */}
          {selectedHousehold && (
            <Card style={[styles.selectedCard, { bottom: insets.bottom + spacing.md }]}>
              <View style={styles.selectedHeader}>
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      styles.selectedAddress,
                      { color: colors.foreground, fontSize: typography.base },
                    ]}
                  >
                    {selectedHousehold.address}
                  </Text>
                  <Text
                    style={[
                      styles.selectedStatus,
                      { color: colors.mutedForeground, fontSize: typography.xs },
                    ]}
                  >
                    Status: {selectedHousehold.status.toUpperCase()} &bull; Last:{' '}
                    {selectedHousehold.lastVisitDate
                      ? new Date(selectedHousehold.lastVisitDate).toLocaleDateString()
                      : 'Never'}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setSelectedHousehold(null)}>
                  <X size={20} color={colors.mutedForeground} />
                </TouchableOpacity>
              </View>

              {selectedHousehold.notes && (
                <Text
                  style={[
                    styles.selectedNotes,
                    { color: colors.foreground, fontSize: typography.xs },
                  ]}
                >
                  "{selectedHousehold.notes}"
                </Text>
              )}

              <View style={styles.selectedButtonRow}>
                <Button
                  title="Log Visit"
                  onPress={() => handleOpenLogVisit(selectedHousehold)}
                  size="sm"
                  style={{ flex: 1 }}
                />
              </View>
            </Card>
          )}
        </View>
      ) : (
        /* Household List View */
        <FlatList
          data={households}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{
            padding: spacing.md,
            paddingBottom: insets.bottom + spacing.xxl,
          }}
          ListHeaderComponent={
            <View
              style={{
                marginBottom: spacing.md,
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <Text
                style={{ fontWeight: '700', color: colors.foreground, fontSize: typography.base }}
              >
                Doors in Territory ({households.length})
              </Text>
              <Button
                title="Add Door"
                size="sm"
                variant="outline"
                onPress={handleOpenAddDoorModal}
              />
            </View>
          }
          renderItem={({ item }) => (
            <Card style={[styles.doorListItem, { marginBottom: spacing.sm }]}>
              <View style={styles.doorListRow}>
                <View style={[styles.statusDot, { backgroundColor: getMarkerColor(item) }]} />
                <View style={{ flex: 1, marginLeft: spacing.sm }}>
                  <Text
                    style={[
                      styles.doorAddress,
                      { color: colors.foreground, fontSize: typography.base },
                    ]}
                  >
                    {item.address}
                  </Text>
                  <Text style={{ color: colors.mutedForeground, fontSize: typography.xs }}>
                    Last Visit:{' '}
                    {item.lastVisitDate
                      ? new Date(item.lastVisitDate).toLocaleDateString()
                      : 'Never'}{' '}
                    ({item.lastVisitOutcome || 'None'})
                  </Text>
                </View>
                <Button
                  title="Log"
                  size="sm"
                  variant="primary"
                  onPress={() => handleOpenLogVisit(item)}
                />
              </View>
            </Card>
          )}
        />
      )}

      {/* Log Visit Modal */}
      <Modal visible={visitModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <Card style={[styles.visitModalCard, { width: '92%', maxHeight: '85%' }]}>
            <View style={styles.modalHeaderRow}>
              <Text
                style={[styles.modalTitle, { color: colors.foreground, fontSize: typography.lg }]}
              >
                Log Visit
              </Text>
              <TouchableOpacity onPress={() => setVisitModalVisible(false)}>
                <X size={22} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>

            <Text
              style={{
                color: colors.mutedForeground,
                fontSize: typography.xs,
                marginBottom: spacing.md,
              }}
            >
              {selectedHousehold?.address}
            </Text>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text
                style={[styles.formLabel, { color: colors.foreground, fontSize: typography.sm }]}
              >
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
                        backgroundColor: outcome === opt.id ? `${opt.color}20` : colors.card,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.outcomeText,
                        {
                          color: outcome === opt.id ? opt.color : colors.foreground,
                          fontWeight: outcome === opt.id ? '700' : '500',
                          fontSize: typography.xs,
                        },
                      ]}
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
                value={notes}
                onChangeText={setNotes}
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
                onPress={handleSubmitVisit}
                loading={isLoggingVisit}
                size="lg"
                style={{ marginTop: spacing.xs }}
              />
            </ScrollView>
          </Card>
        </View>
      </Modal>

      {/* Add Door Modal */}
      <Modal visible={addDoorModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <Card style={[styles.visitModalCard, { width: '90%' }]}>
            <View style={styles.modalHeaderRow}>
              <Text
                style={[styles.modalTitle, { color: colors.foreground, fontSize: typography.lg }]}
              >
                Add Door to Territory
              </Text>
              <TouchableOpacity onPress={() => setAddDoorModalVisible(false)}>
                <X size={22} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>

            <Input
              label="House / Door Number *"
              placeholder="e.g. 104"
              value={newDoorHouseNumber}
              onChangeText={setNewDoorHouseNumber}
            />
            <Text
              style={{
                color: colors.mutedForeground,
                fontSize: typography.xs,
                marginTop: -4,
                marginBottom: spacing.sm,
              }}
            >
              Auto-assigned for congregation. Override with actual number if known.
            </Text>

            <Input
              label="Street Name / Address *"
              placeholder="e.g. Jasmine St."
              value={newDoorAddress}
              onChangeText={setNewDoorAddress}
              autoFocus
            />

            <Input
              label="Notes"
              placeholder="e.g. Red gate, dog on premises"
              value={newDoorNotes}
              onChangeText={setNewDoorNotes}
            />

            <Text
              style={{
                color: colors.mutedForeground,
                fontSize: typography.xs,
                marginBottom: spacing.md,
              }}
            >
              GPS Location:{' '}
              {location
                ? `${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}`
                : 'Capturing...'}
            </Text>

            <Button
              title="Pin Door"
              onPress={handleAddDoorAtCurrentLocation}
              loading={isCreatingHousehold}
              size="lg"
            />
          </Card>
        </View>
      </Modal>

      {/* Return Territory Confirmation Modal */}
      <Modal visible={returnModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <Card style={[styles.visitModalCard, { width: '85%' }]}>
            <Text
              style={[styles.modalTitle, { color: colors.foreground, fontSize: typography.lg }]}
            >
              Return Territory #{territory?.number}?
            </Text>
            <Text
              style={{
                color: colors.mutedForeground,
                fontSize: typography.sm,
                marginTop: 6,
                marginBottom: 12,
              }}
            >
              This will mark your assignment as completed and return the territory to the
              congregation pool.
            </Text>

            {canAdjust && (
              <View style={{ marginBottom: 16 }}>
                <Input
                  label="Effective Return Date"
                  value={returnDate}
                  onChangeText={setReturnDate}
                  placeholder="YYYY-MM-DD"
                />
              </View>
            )}

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Button
                title="Cancel"
                variant="ghost"
                onPress={() => {
                  setReturnModalVisible(false);
                  setReturnDate(new Date().toISOString().slice(0, 10));
                }}
                style={{ flex: 1 }}
              />
              <Button
                title="Return"
                variant="destructive"
                onPress={handleReturnTerritory}
                loading={isReturning}
                disabled={canAdjust && !returnDate.trim()}
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
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modeToggle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  map: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  floatingControls: {
    position: 'absolute',
  },
  mapFab: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  selectedCard: {
    position: 'absolute',
    left: 16,
    right: 16,
    padding: 16,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  selectedHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  selectedAddress: {
    fontWeight: '700',
  },
  selectedStatus: {
    marginTop: 2,
  },
  selectedNotes: {
    fontStyle: 'italic',
    marginTop: 8,
  },
  selectedButtonRow: {
    flexDirection: 'row',
    marginTop: 12,
  },
  doorListItem: {
    padding: 12,
  },
  doorListRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  doorAddress: {
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  visitModalCard: {
    padding: 20,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  modalTitle: {
    fontWeight: '800',
  },
  formLabel: {
    fontWeight: '600',
    marginBottom: 8,
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
  outcomeText: {},
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
});
