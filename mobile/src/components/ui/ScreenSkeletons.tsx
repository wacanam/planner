// mobile/src/components/ui/ScreenSkeletons.tsx
import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Skeleton, SkeletonCard, SkeletonCircle, SkeletonText } from '@/components/ui/Skeleton';
import { useTheme } from '@/context/ThemeContext';

/**
 * 1. Select Congregation Screen Skeleton
 */
export function SelectCongregationSkeleton() {
  const insets = useSafeAreaInsets();
  const { spacing } = useTheme();

  return (
    <ScrollView
      contentContainerStyle={[
        styles.scrollContent,
        {
          padding: spacing.md,
          paddingBottom: insets.bottom + spacing.xxl,
        },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {Array.from({ length: 5 }).map((_, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: Static placeholder list
        <SkeletonCard key={i} style={[styles.congCard, { marginBottom: spacing.md }]}>
          <View style={styles.congCardContent}>
            <Skeleton width={44} height={44} borderRadius={12} />
            <View style={{ flex: 1, marginLeft: spacing.md }}>
              <Skeleton width="65%" height={16} borderRadius={4} />
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
                <Skeleton width={12} height={12} borderRadius={6} />
                <Skeleton width="45%" height={12} borderRadius={4} style={{ marginLeft: 4 }} />
              </View>
            </View>
            <Skeleton width={60} height={32} borderRadius={8} />
          </View>
        </SkeletonCard>
      ))}
    </ScrollView>
  );
}

/**
 * 2. My Assignments Screen Skeleton
 */
export function MyAssignmentsSkeleton() {
  const insets = useSafeAreaInsets();
  const { spacing, colors } = useTheme();

  return (
    <ScrollView
      contentContainerStyle={[
        styles.scrollContent,
        {
          padding: spacing.md,
          paddingBottom: insets.bottom + spacing.xxl,
        },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* Group Banner Skeleton */}
      <SkeletonCard
        style={[
          styles.groupBanner,
          {
            backgroundColor: `${colors.primary}10`,
            borderColor: `${colors.primary}25`,
            marginBottom: spacing.md,
          },
        ]}
      >
        <View style={styles.groupBannerRow}>
          <Skeleton width={34} height={34} borderRadius={10} />
          <View style={{ flex: 1, marginLeft: spacing.sm }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Skeleton width={120} height={15} borderRadius={4} />
              <Skeleton width={75} height={18} borderRadius={9999} />
            </View>
            <Skeleton width={160} height={11} borderRadius={4} style={{ marginTop: 6 }} />
          </View>
          <Skeleton width={16} height={16} borderRadius={8} />
        </View>
      </SkeletonCard>

      {/* Territory Assignment Cards */}
      {Array.from({ length: 3 }).map((_, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: Static placeholder list
        <SkeletonCard key={i} style={[styles.assignmentCard, { marginBottom: spacing.md }]}>
          <View style={styles.cardHeader}>
            <Skeleton width={42} height={24} borderRadius={6} />
            <View style={{ flex: 1, marginLeft: spacing.sm }}>
              <Skeleton width="60%" height={16} borderRadius={4} />
              <Skeleton width="35%" height={12} borderRadius={4} style={{ marginTop: 4 }} />
            </View>
            <Skeleton width={55} height={20} borderRadius={9999} />
          </View>

          {/* Progress Bar Section */}
          <View style={styles.progressContainer}>
            <View style={styles.progressLabels}>
              <Skeleton width={140} height={12} borderRadius={4} />
              <Skeleton width={28} height={12} borderRadius={4} />
            </View>
            <Skeleton width="100%" height={6} borderRadius={9999} style={{ marginTop: 6 }} />
          </View>

          {/* Card Footer Details */}
          <View style={[styles.cardFooter, { borderTopColor: colors.border }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Skeleton width={13} height={13} borderRadius={6} />
              <Skeleton width={110} height={12} borderRadius={4} style={{ marginLeft: 6 }} />
            </View>
            <Skeleton width={110} height={14} borderRadius={4} />
          </View>
        </SkeletonCard>
      ))}
    </ScrollView>
  );
}

/**
 * 3. Territories Directory Screen Skeleton
 */
export function TerritoriesDirectorySkeleton() {
  const insets = useSafeAreaInsets();
  const { spacing, colors } = useTheme();

  return (
    <ScrollView
      contentContainerStyle={[
        styles.scrollContent,
        {
          padding: spacing.md,
          paddingBottom: insets.bottom + spacing.xxl,
        },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {Array.from({ length: 4 }).map((_, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: Static placeholder list
        <SkeletonCard key={i} style={[styles.assignmentCard, { marginBottom: spacing.md }]}>
          <View style={styles.cardHeader}>
            <Skeleton width={42} height={24} borderRadius={6} />
            <View style={{ flex: 1, marginLeft: spacing.sm }}>
              <Skeleton width="65%" height={16} borderRadius={4} />
              <Skeleton width="40%" height={12} borderRadius={4} style={{ marginTop: 4 }} />
            </View>
            <Skeleton width={60} height={20} borderRadius={9999} />
          </View>

          {/* Progress Bar Section */}
          <View style={styles.progressContainer}>
            <View style={styles.progressLabels}>
              <Skeleton width={130} height={12} borderRadius={4} />
              <Skeleton width={26} height={12} borderRadius={4} />
            </View>
            <Skeleton width="100%" height={6} borderRadius={9999} style={{ marginTop: 6 }} />
          </View>

          {/* Card Footer */}
          <View style={[styles.cardFooter, { borderTopColor: colors.border }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Skeleton width={13} height={13} borderRadius={6} />
              <Skeleton width={90} height={12} borderRadius={4} style={{ marginLeft: 6 }} />
            </View>
            <Skeleton width={50} height={14} borderRadius={4} />
          </View>
        </SkeletonCard>
      ))}
    </ScrollView>
  );
}

/**
 * 4. Territory Detail Screen Skeleton
 */
export function TerritoryDetailSkeleton() {
  const insets = useSafeAreaInsets();
  const { spacing, colors } = useTheme();

  return (
    <ScrollView
      contentContainerStyle={[
        styles.scrollContent,
        {
          padding: spacing.md,
          paddingBottom: insets.bottom + spacing.xxl,
        },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* Mini Map Card Preview */}
      <SkeletonCard style={{ padding: 0, overflow: 'hidden', height: 160 }}>
        <Skeleton width="100%" height={160} borderRadius={0} />
      </SkeletonCard>

      {/* Territory Overview Header */}
      <SkeletonCard style={[styles.sectionCard, { marginTop: spacing.md }]}>
        <View style={styles.titleRow}>
          <View style={{ flex: 1 }}>
            <Skeleton width="60%" height={20} borderRadius={4} />
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
              <Skeleton width={13} height={13} borderRadius={6} />
              <Skeleton width="30%" height={12} borderRadius={4} style={{ marginLeft: 4 }} />
            </View>
          </View>
          <Skeleton width={64} height={22} borderRadius={9999} />
        </View>

        {/* Quick Stats Grid (2x2) */}
        <View style={styles.statsGrid}>
          {Array.from({ length: 4 }).map((_, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: Static placeholder list
            <View key={i} style={[styles.statBox, { backgroundColor: `${colors.muted}35` }]}>
              <Skeleton width={16} height={16} borderRadius={8} />
              <Skeleton width={32} height={20} borderRadius={4} style={{ marginTop: 6 }} />
              <Skeleton width={60} height={11} borderRadius={4} style={{ marginTop: 4 }} />
            </View>
          ))}
        </View>
      </SkeletonCard>

      {/* Action Buttons Row */}
      <SkeletonCard style={[styles.sectionCard, { marginTop: spacing.md }]}>
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <Skeleton width="48%" height={38} borderRadius={8} />
          <Skeleton width="48%" height={38} borderRadius={8} />
        </View>
      </SkeletonCard>

      {/* Households List Skeleton */}
      <View style={{ marginTop: spacing.lg }}>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            marginBottom: spacing.sm,
          }}
        >
          <Skeleton width={140} height={16} borderRadius={4} />
          <Skeleton width={70} height={16} borderRadius={4} />
        </View>

        {Array.from({ length: 3 }).map((_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: Static placeholder list
          <SkeletonCard key={i} style={{ padding: 12, marginBottom: spacing.sm }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Skeleton width={10} height={10} borderRadius={5} />
              <View style={{ flex: 1, marginLeft: spacing.sm }}>
                <Skeleton width="50%" height={14} borderRadius={4} />
                <Skeleton width="30%" height={11} borderRadius={4} style={{ marginTop: 4 }} />
              </View>
              <Skeleton width={50} height={18} borderRadius={9999} />
            </View>
          </SkeletonCard>
        ))}
      </View>
    </ScrollView>
  );
}

/**
 * 5. Territory History Modal Skeleton
 */
export function TerritoryHistorySkeleton() {
  const { spacing, colors } = useTheme();

  return (
    <View style={{ gap: spacing.sm, marginVertical: 8 }}>
      {Array.from({ length: 3 }).map((_, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: Static placeholder list
        <View
          key={i}
          style={{
            padding: 12,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: colors.border,
            gap: 6,
          }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Skeleton width={100} height={14} borderRadius={4} />
            <Skeleton width={50} height={18} borderRadius={9999} />
          </View>
          <Skeleton width={140} height={11} borderRadius={4} />
        </View>
      ))}
    </View>
  );
}

/**
 * 6. Records Households Tab Skeleton
 */
export function RecordsHouseholdsSkeleton() {
  const insets = useSafeAreaInsets();
  const { spacing } = useTheme();

  return (
    <ScrollView
      contentContainerStyle={[
        styles.scrollContent,
        {
          padding: spacing.md,
          paddingBottom: insets.bottom + spacing.xxl,
        },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {Array.from({ length: 4 }).map((_, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: Static placeholder list
        <SkeletonCard key={i} style={[styles.assignmentCard, { marginBottom: spacing.md }]}>
          <View style={styles.cardHeader}>
            <Skeleton width={36} height={36} borderRadius={8} />
            <View style={{ flex: 1, marginLeft: spacing.sm }}>
              <Skeleton width="60%" height={15} borderRadius={4} />
              <Skeleton width="40%" height={11} borderRadius={4} style={{ marginTop: 4 }} />
            </View>
            <Skeleton width={55} height={18} borderRadius={9999} />
          </View>
          <Skeleton width="85%" height={12} borderRadius={4} style={{ marginTop: 10 }} />
          <View style={[styles.cardFooter, { marginTop: 10, paddingTop: 8 }]}>
            <Skeleton width={110} height={11} borderRadius={4} />
            <Skeleton width={60} height={11} borderRadius={4} />
          </View>
        </SkeletonCard>
      ))}
    </ScrollView>
  );
}

/**
 * 7. Records Visits Tab Skeleton
 */
export function RecordsVisitsSkeleton() {
  const insets = useSafeAreaInsets();
  const { spacing } = useTheme();

  return (
    <ScrollView
      contentContainerStyle={[
        styles.scrollContent,
        {
          padding: spacing.md,
          paddingBottom: insets.bottom + spacing.xxl,
        },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {Array.from({ length: 4 }).map((_, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: Static placeholder list
        <SkeletonCard key={i} style={[styles.assignmentCard, { marginBottom: spacing.md }]}>
          <View style={styles.cardHeader}>
            <View style={{ flex: 1 }}>
              <Skeleton width="55%" height={14} borderRadius={4} />
              <Skeleton width="70%" height={12} borderRadius={4} style={{ marginTop: 4 }} />
            </View>
            <Skeleton width={65} height={20} borderRadius={9999} />
          </View>
          <Skeleton width="90%" height={12} borderRadius={4} style={{ marginTop: 8 }} />
          <Skeleton width="60%" height={11} borderRadius={4} style={{ marginTop: 4 }} />
        </SkeletonCard>
      ))}
    </ScrollView>
  );
}

/**
 * 8. Records Encounters Tab Skeleton
 */
export function RecordsEncountersSkeleton() {
  const insets = useSafeAreaInsets();
  const { spacing } = useTheme();

  return (
    <ScrollView
      contentContainerStyle={[
        styles.scrollContent,
        {
          padding: spacing.md,
          paddingBottom: insets.bottom + spacing.xxl,
        },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {Array.from({ length: 4 }).map((_, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: Static placeholder list
        <SkeletonCard key={i} style={[styles.assignmentCard, { marginBottom: spacing.md }]}>
          <View style={styles.cardHeader}>
            <SkeletonCircle size={32} />
            <View style={{ flex: 1, marginLeft: spacing.sm }}>
              <Skeleton width="50%" height={14} borderRadius={4} />
              <Skeleton width="35%" height={11} borderRadius={4} style={{ marginTop: 4 }} />
            </View>
            <Skeleton width={60} height={18} borderRadius={9999} />
          </View>
          <Skeleton width="80%" height={12} borderRadius={4} style={{ marginTop: 8 }} />
        </SkeletonCard>
      ))}
    </ScrollView>
  );
}

/**
 * 9. Household Detail Screen Skeleton
 */
export function HouseholdDetailSkeleton() {
  const insets = useSafeAreaInsets();
  const { spacing } = useTheme();

  return (
    <ScrollView
      contentContainerStyle={[
        styles.scrollContent,
        {
          padding: spacing.md,
          paddingBottom: insets.bottom + spacing.xxl,
        },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* Main Household Card */}
      <SkeletonCard style={{ padding: 16 }}>
        <View style={styles.cardHeader}>
          <Skeleton width={44} height={44} borderRadius={12} />
          <View style={{ flex: 1, marginLeft: spacing.md }}>
            <Skeleton width="60%" height={18} borderRadius={4} />
            <Skeleton width="40%" height={12} borderRadius={4} style={{ marginTop: 4 }} />
          </View>
          <Skeleton width={60} height={22} borderRadius={9999} />
        </View>

        <Skeleton width="100%" height={40} borderRadius={8} style={{ marginTop: 14 }} />

        <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
          <Skeleton width="31%" height={36} borderRadius={8} />
          <Skeleton width="31%" height={36} borderRadius={8} />
          <Skeleton width="31%" height={36} borderRadius={8} />
        </View>
      </SkeletonCard>

      {/* Visits Section */}
      <View style={{ marginTop: spacing.lg }}>
        <Skeleton width={130} height={16} borderRadius={4} style={{ marginBottom: spacing.sm }} />
        {Array.from({ length: 2 }).map((_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: Static placeholder list
          <SkeletonCard key={i} style={{ padding: 14, marginBottom: spacing.sm }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Skeleton width="50%" height={13} borderRadius={4} />
              <Skeleton width={55} height={18} borderRadius={9999} />
            </View>
            <Skeleton width="75%" height={12} borderRadius={4} style={{ marginTop: 8 }} />
          </SkeletonCard>
        ))}
      </View>
    </ScrollView>
  );
}

/**
 * 10. Household Visits Sub-Skeleton
 */
export function HouseholdVisitsSkeleton() {
  const { spacing } = useTheme();

  return (
    <View style={{ marginVertical: 8 }}>
      {Array.from({ length: 2 }).map((_, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: Static placeholder list
        <SkeletonCard key={i} style={{ padding: 14, marginBottom: spacing.sm }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Skeleton width="50%" height={13} borderRadius={4} />
            <Skeleton width={55} height={18} borderRadius={9999} />
          </View>
          <Skeleton width="80%" height={12} borderRadius={4} style={{ marginTop: 8 }} />
        </SkeletonCard>
      ))}
    </View>
  );
}

/**
 * 11. Notifications Screen Skeleton
 */
export function NotificationsSkeleton() {
  const insets = useSafeAreaInsets();
  const { spacing } = useTheme();

  return (
    <ScrollView
      contentContainerStyle={[
        styles.scrollContent,
        {
          padding: spacing.md,
          paddingBottom: insets.bottom + spacing.xxl,
        },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {Array.from({ length: 5 }).map((_, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: Static placeholder list
        <SkeletonCard key={i} style={[styles.notifCard, { marginBottom: spacing.sm }]}>
          <View style={styles.notifHeader}>
            <SkeletonCircle size={32} />
            <View style={{ flex: 1, marginLeft: spacing.sm }}>
              <Skeleton width="60%" height={14} borderRadius={4} />
              <Skeleton width={70} height={10} borderRadius={4} style={{ marginTop: 4 }} />
            </View>
            <Skeleton width={8} height={8} borderRadius={4} />
          </View>
          <SkeletonText
            lines={2}
            lineHeight={12}
            spacing={6}
            widths={['95%', '70%']}
            style={{ marginTop: 8 }}
          />
        </SkeletonCard>
      ))}
    </ScrollView>
  );
}

/**
 * 12. Groups Screen Skeleton
 */
export function GroupsSkeleton() {
  const insets = useSafeAreaInsets();
  const { spacing, colors } = useTheme();

  return (
    <ScrollView
      contentContainerStyle={[
        styles.scrollContent,
        {
          padding: spacing.md,
          paddingBottom: insets.bottom + spacing.xxl,
        },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <Skeleton width={140} height={12} borderRadius={4} style={{ marginBottom: spacing.sm }} />
      {/* My Group Card Skeleton */}
      <SkeletonCard
        style={[
          styles.groupBanner,
          {
            backgroundColor: `${colors.primary}12`,
            borderColor: `${colors.primary}30`,
            marginBottom: spacing.md,
          },
        ]}
      >
        <View style={styles.groupBannerRow}>
          <Skeleton width={40} height={40} borderRadius={10} />
          <View style={{ flex: 1, marginLeft: spacing.sm }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Skeleton width={110} height={16} borderRadius={4} />
              <Skeleton width={70} height={18} borderRadius={9999} />
            </View>
            <Skeleton width={150} height={11} borderRadius={4} style={{ marginTop: 6 }} />
          </View>
          <Skeleton width={16} height={16} borderRadius={8} />
        </View>
      </SkeletonCard>

      <Skeleton
        width={160}
        height={12}
        borderRadius={4}
        style={{ marginTop: spacing.sm, marginBottom: spacing.sm }}
      />

      {/* All Groups List */}
      {Array.from({ length: 3 }).map((_, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: Static placeholder list
        <SkeletonCard key={i} style={[styles.assignmentCard, { marginBottom: spacing.md }]}>
          <View style={styles.cardHeader}>
            <Skeleton width={36} height={36} borderRadius={10} />
            <View style={{ flex: 1, marginLeft: spacing.sm }}>
              <Skeleton width="50%" height={15} borderRadius={4} />
              <Skeleton width="40%" height={11} borderRadius={4} style={{ marginTop: 4 }} />
            </View>
            <Skeleton width={60} height={18} borderRadius={9999} />
          </View>
        </SkeletonCard>
      ))}
    </ScrollView>
  );
}

/**
 * 13. Members Screen Skeleton
 */
export function MembersSkeleton() {
  const insets = useSafeAreaInsets();
  const { spacing } = useTheme();

  return (
    <ScrollView
      contentContainerStyle={[
        styles.scrollContent,
        {
          padding: spacing.md,
          paddingBottom: insets.bottom + spacing.xxl,
        },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {Array.from({ length: 5 }).map((_, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: Static placeholder list
        <SkeletonCard key={i} style={[styles.congCard, { marginBottom: spacing.sm, padding: 12 }]}>
          <View style={styles.congCardContent}>
            <SkeletonCircle size={40} />
            <View style={{ flex: 1, marginLeft: spacing.md }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Skeleton width={110} height={15} borderRadius={4} />
                <Skeleton width={60} height={16} borderRadius={9999} />
              </View>
              <Skeleton width={130} height={11} borderRadius={4} style={{ marginTop: 5 }} />
            </View>
            <Skeleton width={28} height={28} borderRadius={14} />
          </View>
        </SkeletonCard>
      ))}
    </ScrollView>
  );
}

/**
 * 14. Reports Overview Skeleton
 */
export function ReportsOverviewSkeleton() {
  const insets = useSafeAreaInsets();
  const { spacing, colors } = useTheme();

  return (
    <ScrollView
      contentContainerStyle={[
        styles.scrollContent,
        {
          padding: spacing.md,
          paddingBottom: insets.bottom + spacing.xxl,
        },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* Top 2 KPI Cards */}
      <View style={{ flexDirection: 'row', gap: spacing.md }}>
        <SkeletonCard style={{ flex: 1, padding: 14 }}>
          <Skeleton width={18} height={18} borderRadius={9} />
          <Skeleton width={48} height={22} borderRadius={4} style={{ marginTop: 8 }} />
          <Skeleton width={80} height={11} borderRadius={4} style={{ marginTop: 4 }} />
        </SkeletonCard>
        <SkeletonCard style={{ flex: 1, padding: 14 }}>
          <Skeleton width={18} height={18} borderRadius={9} />
          <Skeleton width={48} height={22} borderRadius={4} style={{ marginTop: 8 }} />
          <Skeleton width={80} height={11} borderRadius={4} style={{ marginTop: 4 }} />
        </SkeletonCard>
      </View>

      {/* Territory Distribution Breakdown */}
      <SkeletonCard style={{ marginTop: spacing.md, padding: 16 }}>
        <Skeleton width={140} height={16} borderRadius={4} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginTop: 14 }}>
          <View style={{ alignItems: 'center', gap: 4 }}>
            <Skeleton width={55} height={18} borderRadius={9999} />
            <Skeleton width={24} height={18} borderRadius={4} />
          </View>
          <View style={{ alignItems: 'center', gap: 4 }}>
            <Skeleton width={55} height={18} borderRadius={9999} />
            <Skeleton width={24} height={18} borderRadius={4} />
          </View>
          <View style={{ alignItems: 'center', gap: 4 }}>
            <Skeleton width={55} height={18} borderRadius={9999} />
            <Skeleton width={24} height={18} borderRadius={4} />
          </View>
        </View>
      </SkeletonCard>

      {/* Export Card */}
      <SkeletonCard
        style={{
          marginTop: spacing.md,
          padding: 16,
          backgroundColor: `${colors.primary}10`,
          borderColor: `${colors.primary}25`,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Skeleton width={28} height={28} borderRadius={8} />
          <View style={{ flex: 1, marginLeft: spacing.sm }}>
            <Skeleton width={140} height={15} borderRadius={4} />
            <Skeleton width={200} height={11} borderRadius={4} style={{ marginTop: 4 }} />
          </View>
        </View>
        <Skeleton width="100%" height={40} borderRadius={10} style={{ marginTop: spacing.md }} />
      </SkeletonCard>
    </ScrollView>
  );
}

/**
 * 15. Reports S13 Table Skeleton
 */
export function ReportsS13Skeleton() {
  const insets = useSafeAreaInsets();
  const { spacing } = useTheme();

  return (
    <ScrollView
      contentContainerStyle={[
        styles.scrollContent,
        {
          padding: spacing.md,
          paddingBottom: insets.bottom + spacing.xxl,
        },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {Array.from({ length: 5 }).map((_, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: Static placeholder list
        <SkeletonCard
          key={i}
          style={[styles.assignmentCard, { marginBottom: spacing.sm, padding: 12 }]}
        >
          <View
            style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Skeleton width={32} height={20} borderRadius={6} />
              <Skeleton width={120} height={14} borderRadius={4} />
            </View>
            <Skeleton width={50} height={18} borderRadius={9999} />
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
            <Skeleton width={90} height={11} borderRadius={4} />
            <Skeleton width={70} height={11} borderRadius={4} />
          </View>
        </SkeletonCard>
      ))}
    </ScrollView>
  );
}

/**
 * 16. Splash / Redirect Loader Skeleton
 */
export function SplashLoaderSkeleton() {
  const { colors, spacing } = useTheme();

  return (
    <View style={styles.splashContainer}>
      <Skeleton width={160} height={32} borderRadius={8} />
      <Skeleton width={190} height={14} borderRadius={4} style={{ marginTop: spacing.xs }} />
      <Skeleton
        width={100}
        height={5}
        borderRadius={9999}
        style={{ marginTop: spacing.xl, backgroundColor: colors.primary }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
  },
  congCard: {
    padding: 14,
  },
  congCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  groupBanner: {
    padding: 12,
  },
  groupBannerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  assignmentCard: {
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressContainer: {
    marginTop: 14,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: 14,
    paddingTop: 10,
  },
  sectionCard: {
    padding: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14,
  },
  statBox: {
    flex: 1,
    minWidth: '46%',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  notifCard: {
    padding: 14,
  },
  notifHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  splashContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
