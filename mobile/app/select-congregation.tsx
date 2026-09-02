// mobile/app/select-congregation.tsx
import { useRouter } from 'expo-router';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import {
  AlertCircle,
  Building2,
  Check,
  KeyRound,
  MapPin,
  Plus,
  Search,
  Ticket,
  UserPlus,
  X,
} from 'lucide-react-native';
import { useEffect, useState } from 'react';
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
import { SelectCongregationSkeleton } from '@/components/ui/ScreenSkeletons';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useJoinCongregation } from '@/hooks/useCongregationMembers';
import { useCongregations, useCreateCongregation } from '@/hooks/useCongregations';
import { fetchInvitationByCode, useAcceptInvitation } from '@/hooks/useInvitations';
import { FIRESTORE_COLLECTIONS, getPlannerFirestore } from '@/lib/firebase';
import { triggerHaptic } from '@/lib/sound';
import type { Congregation, Invitation } from '@/types/api';

const ROLE_DISPLAY_NAMES: Record<string, string> = {
  publisher: 'Publisher',
  visiting_publisher: 'Visiting Publisher',
  territory_servant: 'Territory Servant',
  secretary: 'Secretary',
  service_overseer: 'Service Overseer',
  circuit_overseer: 'Circuit Overseer',
};

export default function SelectCongregationScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, activeCongregationId, setActiveCongregationId, logout } = useAuth();
  const { colors, typography, spacing, radius } = useTheme();

  const { congregations, isLoading } = useCongregations();
  const { join, isJoining } = useJoinCongregation();
  const { create: createCong, isCreating } = useCreateCongregation();
  const { accept: acceptInvite, isAccepting } = useAcceptInvitation();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCong, setSelectedCong] = useState<Congregation | null>(null);
  const [joinModalVisible, setJoinModalVisible] = useState(false);
  const [joinMessage, setJoinMessage] = useState('');
  const [joinSuccess, setJoinSuccess] = useState(false);

  // Invite Code Modal
  const [codeModalVisible, setCodeModalVisible] = useState(false);
  const [inputCode, setInputCode] = useState('');
  const [isCheckingCode, setIsCheckingCode] = useState(false);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [foundInvitation, setFoundInvitation] = useState<Invitation | null>(null);
  const [acceptSuccess, setAcceptSuccess] = useState(false);

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
      c.city?.toLowerCase().includes(q) ||
      c.country?.toLowerCase().includes(q)
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

  const handleOpenCodeModal = () => {
    setInputCode('');
    setCodeError(null);
    setFoundInvitation(null);
    setAcceptSuccess(false);
    setCodeModalVisible(true);
  };

  const handleCheckCode = async () => {
    const clean = inputCode.trim().toUpperCase();
    if (!clean) {
      setCodeError('Please enter a valid invite code.');
      return;
    }

    setIsCheckingCode(true);
    setCodeError(null);
    try {
      const inv = await fetchInvitationByCode(clean);
      if (!inv) {
        setCodeError('Invitation code not found or invalid.');
        setFoundInvitation(null);
      } else if (inv.status !== 'pending') {
        setCodeError(`This invitation has already been ${inv.status}.`);
        setFoundInvitation(null);
      } else if (new Date(inv.expiresAt).getTime() < Date.now()) {
        setCodeError('This invitation has expired.');
        setFoundInvitation(null);
      } else {
        setFoundInvitation(inv);
        await triggerHaptic('medium');
      }
    } catch (e: any) {
      setCodeError(e.message || 'Error looking up invitation.');
      setFoundInvitation(null);
    } finally {
      setIsCheckingCode(false);
    }
  };

  const handleAcceptInvite = async () => {
    if (!foundInvitation || !user?.id) return;
    try {
      await acceptInvite(foundInvitation, {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      });
      await triggerHaptic('success');
      setAcceptSuccess(true);

      setTimeout(async () => {
        setCodeModalVisible(false);
        if (foundInvitation.congregationId) {
          await setActiveCongregationId(foundInvitation.congregationId);
          router.replace('/(tabs)/assignments');
        } else {
          router.replace('/(tabs)/more');
        }
      }, 1500);
    } catch (e: any) {
      triggerHaptic('error');
      setCodeError(e.message || 'Failed to accept invitation.');
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

        {/* Enter Code Banner */}
        <TouchableOpacity
          onPress={() => {
            triggerHaptic('light');
            handleOpenCodeModal();
          }}
          style={[
            styles.inviteBanner,
            {
              backgroundColor: `${colors.primary}12`,
              borderColor: `${colors.primary}30`,
              marginTop: spacing.sm,
            },
          ]}
        >
          <KeyRound size={18} color={colors.primary} />
          <Text
            style={{
              color: colors.primary,
              fontWeight: '700',
              fontSize: typography.sm,
              marginLeft: 8,
              flex: 1,
            }}
          >
            Have an Invite Code?
          </Text>
          <Badge label="Enter Code" variant="primary" size="sm" />
        </TouchableOpacity>
      </View>


      {isLoading ? (
        <SelectCongregationSkeleton />
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
                  <View style={[styles.iconBox, { backgroundColor: `${colors.primary}18` }]}>
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

      {/* Enter Invite Code Modal */}
      <Modal visible={codeModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <Card style={[styles.modalCard, { width: '90%' }]}>
            {acceptSuccess ? (
              <View style={styles.successBox}>
                <Check size={40} color={colors.success} />
                <Text
                  style={[
                    styles.modalTitle,
                    { color: colors.foreground, fontSize: typography.lg, marginTop: spacing.md },
                  ]}
                >
                  Invitation Accepted!
                </Text>
                <Text
                  style={{
                    color: colors.mutedForeground,
                    textAlign: 'center',
                    marginTop: 6,
                    fontSize: typography.xs,
                  }}
                >
                  You are now enrolled. Loading your workspace...
                </Text>
              </View>
            ) : (
              <View>
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: spacing.xs,
                  }}
                >
                  <Text
                    style={[
                      styles.modalTitle,
                      { color: colors.foreground, fontSize: typography.lg },
                    ]}
                  >
                    Enter Invite Code
                  </Text>
                  <TouchableOpacity onPress={() => setCodeModalVisible(false)}>
                    <X size={20} color={colors.mutedForeground} />
                  </TouchableOpacity>
                </View>

                <Text
                  style={{
                    color: colors.mutedForeground,
                    fontSize: typography.xs,
                    marginBottom: spacing.md,
                  }}
                >
                  Enter the 6-character code provided by your congregation overseer.
                </Text>

                <Input
                  placeholder="e.g. 7X9K2P"
                  autoCapitalize="characters"
                  maxLength={10}
                  value={inputCode}
                  onChangeText={(val) => {
                    setInputCode(val.toUpperCase());
                    setCodeError(null);
                    setFoundInvitation(null);
                  }}
                  icon={<KeyRound size={16} color={colors.mutedForeground} />}
                />

                {codeError && (
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: `${colors.destructive}15`,
                      padding: 8,
                      borderRadius: 8,
                      marginBottom: spacing.sm,
                    }}
                  >
                    <AlertCircle size={14} color={colors.destructive} />
                    <Text
                      style={{
                        color: colors.destructive,
                        fontSize: typography.xs,
                        marginLeft: 6,
                        flex: 1,
                      }}
                    >
                      {codeError}
                    </Text>
                  </View>
                )}

                {/* Found Invitation Preview Card */}
                {foundInvitation && (
                  <Card
                    style={{
                      padding: 12,
                      backgroundColor: `${colors.primary}10`,
                      borderColor: `${colors.primary}30`,
                      marginBottom: spacing.md,
                    }}
                  >
                    <Text
                      style={{
                        fontWeight: '800',
                        color: colors.foreground,
                        fontSize: typography.base,
                      }}
                    >
                      {foundInvitation.congregationName || 'System Admin Invite'}
                    </Text>
                    <View style={{ flexDirection: 'row', gap: 6, marginTop: 4, alignItems: 'center' }}>
                      <Badge
                        label={
                          ROLE_DISPLAY_NAMES[foundInvitation.congregationRole || ''] ||
                          foundInvitation.systemRole ||
                          foundInvitation.congregationRole ||
                          'Member'
                        }
                        variant="primary"
                        size="sm"
                      />
                      {foundInvitation.groupName && (
                        <Badge label={foundInvitation.groupName} variant="outline" size="sm" />
                      )}
                    </View>
                    <Text
                      style={{
                        color: colors.mutedForeground,
                        fontSize: 10,
                        marginTop: 6,
                      }}
                    >
                      Invited by {foundInvitation.invitedByName} ({foundInvitation.invitedByRole})
                    </Text>
                  </Card>
                )}

                <View style={styles.modalButtonRow}>
                  <Button
                    title="Cancel"
                    variant="ghost"
                    onPress={() => setCodeModalVisible(false)}
                    style={{ flex: 1, marginRight: spacing.sm }}
                  />
                  {foundInvitation ? (
                    <Button
                      title="Accept & Join"
                      variant="primary"
                      onPress={handleAcceptInvite}
                      loading={isAccepting}
                      style={{ flex: 1 }}
                    />
                  ) : (
                    <Button
                      title="Lookup Code"
                      variant="primary"
                      onPress={handleCheckCode}
                      loading={isCheckingCode}
                      style={{ flex: 1 }}
                    />
                  )}
                </View>
              </View>
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
  inviteBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
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

