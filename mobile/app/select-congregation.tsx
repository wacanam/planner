// mobile/app/select-congregation.tsx
import { useRouter } from 'expo-router';
import { collection, doc, onSnapshot, query, where } from 'firebase/firestore';
import {
  Building2,
  Check,
  Clock,
  MapPin,
  Plus,
  Search,
  UserCheck,
  XCircle,
} from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
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
import { useJoinCongregation } from '@/hooks/useCongregationMembers';
import { useCongregations, useCreateCongregation } from '@/hooks/useCongregations';
import { FIRESTORE_COLLECTIONS, getPlannerFirestore } from '@/lib/firebase';
import { triggerHaptic } from '@/lib/sound';
import type { Congregation } from '@/types/api';

export default function SelectCongregationScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, activeCongregationId, setActiveCongregationId, logout } = useAuth();
  const { colors, typography, spacing, radius } = useTheme();

  const { congregations, isLoading } = useCongregations();
  const { join, isJoining } = useJoinCongregation();
  const { create: createCong, isCreating } = useCreateCongregation();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCong, setSelectedCong] = useState<Congregation | null>(null);
  const [joinModalVisible, setJoinModalVisible] = useState(false);
  const [joinMessage, setJoinMessage] = useState('');
  const [joinSuccess, setJoinSuccess] = useState(false);

  // Track memberships for current user: congregationId -> status
  const [memberships, setMemberships] = useState<Map<string, string>>(new Map());

  // New Congregation modal
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [newCongName, setNewCongName] = useState('');
  const [newCongCity, setNewCongCity] = useState('');

  useEffect(() => {
    if (!user?.id) return;
    const firestore = getPlannerFirestore();
    const q = query(
      collection(firestore, FIRESTORE_COLLECTIONS.congregationMembers),
      where('userId', '==', user.id)
    );
    return onSnapshot(q, (snap) => {
      const map = new Map<string, string>();
      for (const d of snap.docs) {
        const data = d.data();
        if (data.congregationId) {
          map.set(data.congregationId, data.status || 'active');
        }
      }
      setMemberships(map);
    });
  }, [user?.id]);

  const filtered = congregations.filter((c) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      c.name.toLowerCase().includes(q) ||
      (c.city && c.city.toLowerCase().includes(q)) ||
      (c.country && c.country.toLowerCase().includes(q))
    );
  });

  const handleSelectCongregation = async (c: Congregation) => {
    const status = memberships.get(c.id);
    const isApproved = status === 'active' || status === 'approved';
    const isGlobalAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN';

    if (!isApproved && !isGlobalAdmin) {
      handleOpenJoin(c);
      return;
    }

    await triggerHaptic('medium');
    await setActiveCongregationId(c.id);
    router.replace('/(tabs)/assignments');
  };

  const handleOpenJoin = (c: Congregation) => {
    setSelectedCong(c);
    setJoinMessage('');
    setJoinSuccess(false);
    setJoinModalVisible(true);
  };

  const handleSubmitJoin = async () => {
    if (!selectedCong || !user) return;
    try {
      await join({
        congregationId: selectedCong.id,
        userId: user.id,
        userName: user.name || 'Publisher',
        userEmail: user.email || '',
        message: joinMessage,
      });
      await triggerHaptic('success');
      setJoinSuccess(true);
      setTimeout(() => {
        setJoinModalVisible(false);
      }, 1500);
    } catch {
      triggerHaptic('error');
    }
  };

  const handleCreateCongregation = async () => {
    if (!newCongName.trim() || !user) return;
    try {
      const res = await createCong({
        name: newCongName.trim(),
        city: newCongCity.trim() || null,
        createdById: user.id,
      });
      await triggerHaptic('success');
      setCreateModalVisible(false);
      await setActiveCongregationId(res.id);
      router.replace('/(tabs)/assignments');
    } catch {
      triggerHaptic('error');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header
        title="Select Congregation"
        subtitle="Choose or join your congregation workspace"
        rightAction={
          <TouchableOpacity onPress={() => setCreateModalVisible(true)}>
            <Plus size={22} color={colors.primary} />
          </TouchableOpacity>
        }
      />

      <View style={[styles.searchSection, { padding: spacing.md }]}>
        <Input
          placeholder="Search by congregation name or city..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          icon={<Search size={18} color={colors.mutedForeground} />}
        />
      </View>

      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Building2 size={48} color={colors.mutedForeground} />}
          title="No Congregations Found"
          description="Create a new congregation workspace or try a different search."
          actionTitle="Create Congregation"
          onActionPress={() => setCreateModalVisible(true)}
        />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{
            padding: spacing.md,
            paddingBottom: insets.bottom + spacing.xxl,
          }}
          renderItem={({ item }) => {
            const memberStatus = memberships.get(item.id);
            const isApproved = memberStatus === 'active' || memberStatus === 'approved';
            const isPending = memberStatus === 'pending';
            const isRejected = memberStatus === 'rejected';
            const isActive = isApproved && activeCongregationId === item.id;

            return (
              <Card
                onPress={() => handleSelectCongregation(item)}
                style={[
                  styles.congCard,
                  { marginBottom: spacing.md },
                  isActive && { borderColor: colors.primary, borderWidth: 1.5 },
                ]}
              >
                <View style={styles.congCardContent}>
                  <View style={[styles.iconBox, { backgroundColor: colors.primary + '18' }]}>
                    <Building2 size={22} color={colors.primary} />
                  </View>

                  <View style={{ flex: 1, marginLeft: spacing.md }}>
                    <Text
                      style={[
                        styles.congName,
                        { color: colors.foreground, fontSize: typography.base },
                      ]}
                    >
                      {item.name}
                    </Text>
                    {item.city && (
                      <View style={styles.locationRow}>
                        <MapPin size={12} color={colors.mutedForeground} />
                        <Text
                          style={[
                            styles.congCity,
                            {
                              color: colors.mutedForeground,
                              fontSize: typography.xs,
                              marginLeft: 4,
                            },
                          ]}
                        >
                          {item.city} {item.country ? `• ${item.country}` : ''}
                        </Text>
                      </View>
                    )}
                  </View>

                  {isActive ? (
                    <Badge label="Active" variant="primary" />
                  ) : isApproved ? (
                    <Button
                      title="Open"
                      variant="outline"
                      size="sm"
                      onPress={() => handleSelectCongregation(item)}
                    />
                  ) : isPending ? (
                    <Badge label="Pending Review" variant="warning" />
                  ) : isRejected ? (
                    <Button
                      title="Re-apply"
                      variant="outline"
                      size="sm"
                      onPress={() => handleOpenJoin(item)}
                    />
                  ) : (
                    <Button
                      title="Join"
                      variant="outline"
                      size="sm"
                      onPress={() => handleOpenJoin(item)}
                    />
                  )}
                </View>
              </Card>
            );
          }}
        />
      )}

      {/* Join Request Modal */}
      <Modal visible={joinModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <Card style={[styles.modalCard, { width: '88%' }]}>
            {joinSuccess ? (
              <View style={styles.successBox}>
                <Check size={40} color={colors.success} />
                <Text
                  style={[
                    styles.modalTitle,
                    { color: colors.foreground, fontSize: typography.lg, marginTop: spacing.md },
                  ]}
                >
                  Request Submitted!
                </Text>
                <Text
                  style={{
                    color: colors.mutedForeground,
                    textAlign: 'center',
                    marginTop: 6,
                    fontSize: typography.xs,
                    lineHeight: 18,
                  }}
                >
                  Your request has been sent to the Service Overseer of {selectedCong?.name}. You
                  will gain access once approved.
                </Text>
              </View>
            ) : (
              <>
                <Text
                  style={[styles.modalTitle, { color: colors.foreground, fontSize: typography.lg }]}
                >
                  Join {selectedCong?.name}
                </Text>
                <Text
                  style={{
                    color: colors.mutedForeground,
                    fontSize: typography.sm,
                    marginBottom: spacing.md,
                  }}
                >
                  Send a request to the congregation service overseers for publisher access.
                </Text>

                <Input
                  label="Message (Optional)"
                  placeholder="e.g. Regular publisher moving from..."
                  value={joinMessage}
                  onChangeText={setJoinMessage}
                  multiline
                  numberOfLines={3}
                  style={{ minHeight: 70 }}
                />

                <View style={styles.modalButtonRow}>
                  <Button
                    title="Cancel"
                    variant="ghost"
                    onPress={() => setJoinModalVisible(false)}
                    style={{ flex: 1, marginRight: spacing.sm }}
                  />
                  <Button
                    title="Submit Request"
                    onPress={handleSubmitJoin}
                    loading={isJoining}
                    style={{ flex: 1 }}
                  />
                </View>
              </>
            )}
          </Card>
        </View>
      </Modal>

      {/* Create Congregation Modal */}
      <Modal visible={createModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <Card style={[styles.modalCard, { width: '88%' }]}>
            <Text
              style={[styles.modalTitle, { color: colors.foreground, fontSize: typography.lg }]}
            >
              Create Congregation
            </Text>
            <Text
              style={{
                color: colors.mutedForeground,
                fontSize: typography.sm,
                marginBottom: spacing.md,
              }}
            >
              Set up a new workspace for your congregation
            </Text>

            <Input
              label="Congregation Name *"
              placeholder="e.g. Central City English"
              value={newCongName}
              onChangeText={setNewCongName}
            />

            <Input
              label="City / Locality"
              placeholder="e.g. Springfield"
              value={newCongCity}
              onChangeText={setNewCongCity}
            />

            <View style={styles.modalButtonRow}>
              <Button
                title="Cancel"
                variant="ghost"
                onPress={() => setCreateModalVisible(false)}
                style={{ flex: 1, marginRight: spacing.sm }}
              />
              <Button
                title="Create"
                onPress={handleCreateCongregation}
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
  searchSection: {
    paddingBottom: 0,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  congCard: {
    padding: 14,
  },
  congCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  congName: {
    fontWeight: '700',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },
  congCity: {
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCard: {
    padding: 20,
  },
  modalTitle: {
    fontWeight: '800',
  },
  modalButtonRow: {
    flexDirection: 'row',
    marginTop: 16,
  },
  successBox: {
    alignItems: 'center',
    paddingVertical: 16,
  },
});
