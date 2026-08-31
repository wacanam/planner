// mobile/app/(tabs)/more/reports.tsx
import { BarChart2, BookOpen, Calendar, CheckCircle2, Download, FileText, Home, Sparkles, Users } from 'lucide-react-native';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ServiceYearCountdown } from '@/components/ServiceYearCountdown';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Header } from '@/components/ui/Header';
import { ReportsOverviewSkeleton, ReportsS13Skeleton } from '@/components/ui/ScreenSkeletons';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useCongregation } from '@/hooks/useCongregations';
import { useCoverageReport, useS13Report, useTeachingAnalyticsReport } from '@/hooks/useReports';
import { exportS13Pdf } from '@/lib/pdf-export';
import { formatDate } from '@/lib/date-utils';
import { getServiceYear } from '@/lib/service-year';
import { triggerHaptic } from '@/lib/sound';

export default function ReportsScreen() {
  const _router = useRouter();
  const insets = useSafeAreaInsets();
  const { activeCongregationId } = useAuth();
  const { congregation } = useCongregation(activeCongregationId);
  const { colors, typography, spacing, radius } = useTheme();

  const currentSY = getServiceYear();
  const [selectedServiceYear, setSelectedServiceYear] = useState<number | 'all'>('all');
  const [activeSegment, setActiveSegment] = useState<'overview' | 's13' | 'teaching'>('overview');
  const [isExporting, setIsExporting] = useState(false);

  const { data: coverageData, isLoading: coverageLoading } = useCoverageReport(
    activeCongregationId,
    {
      serviceYear: selectedServiceYear,
    }
  );
  const { data: s13Records = [], isLoading: s13Loading } = useS13Report(activeCongregationId, {
    serviceYear: selectedServiceYear,
  });
  const { data: teachingData, isLoading: teachingLoading } = useTeachingAnalyticsReport(
    activeCongregationId,
    {
      serviceYear: selectedServiceYear,
    }
  );

  const congregationName = congregation?.name || 'Congregation';

  const handleExportS13Pdf = async () => {
    if (s13Records.length === 0) {
      Alert.alert('No Records', 'There are no assignment records to export.');
      return;
    }

    setIsExporting(true);
    try {
      await triggerHaptic('medium');
      await exportS13Pdf(s13Records, congregationName, selectedServiceYear);
    } catch (err: any) {
      Alert.alert('Export Error', err.message || 'Failed to generate S-13 PDF report');
    } finally {
      setIsExporting(false);
    }
  };

  const availableYears = coverageData?.availableServiceYears || [currentSY];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header
        showBack
        title="Congregation Reports"
        subtitle="S-13 Assignment record & coverage analytics"
        rightAction={
          <TouchableOpacity
            onPress={handleExportS13Pdf}
            disabled={isExporting}
            style={styles.exportBtn}
          >
            {isExporting ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Download size={20} color={colors.primary} />
            )}
          </TouchableOpacity>
        }
      />

      {/* Service Year Filter Chips Row */}
      <View style={[styles.syChipsContainer, { borderBottomColor: colors.border }]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: spacing.md, gap: 8, paddingVertical: 8 }}
        >
          <TouchableOpacity
            onPress={() => {
              triggerHaptic('light');
              setSelectedServiceYear('all');
            }}
            style={[
              styles.syChip,
              {
                backgroundColor: selectedServiceYear === 'all' ? colors.primary : colors.card,
                borderColor: selectedServiceYear === 'all' ? colors.primary : colors.border,
              },
            ]}
          >
            <Text
              style={{
                color:
                  selectedServiceYear === 'all' ? colors.primaryForeground : colors.mutedForeground,
                fontSize: typography.xs,
                fontWeight: selectedServiceYear === 'all' ? '700' : '500',
              }}
            >
              All Years
            </Text>
          </TouchableOpacity>

          {availableYears.map((sy) => {
            const isSelected = selectedServiceYear === sy;
            const isCurrent = sy === currentSY;
            return (
              <TouchableOpacity
                key={sy}
                onPress={() => {
                  triggerHaptic('light');
                  setSelectedServiceYear(sy);
                }}
                style={[
                  styles.syChip,
                  {
                    backgroundColor: isSelected ? colors.primary : colors.card,
                    borderColor: isSelected ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text
                  style={{
                    color: isSelected ? colors.primaryForeground : colors.mutedForeground,
                    fontSize: typography.xs,
                    fontWeight: isSelected ? '700' : '500',
                  }}
                >
                  SY {sy} {isCurrent ? '(Current)' : ''}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Segment Switcher */}
      <View
        style={[
          styles.segmentContainer,
          { backgroundColor: colors.card, borderBottomColor: colors.border },
        ]}
      >
        <TouchableOpacity
          onPress={() => {
            triggerHaptic('light');
            setActiveSegment('overview');
          }}
          style={[
            styles.segmentItem,
            activeSegment === 'overview' && {
              borderBottomColor: colors.primary,
              borderBottomWidth: 2.5,
            },
          ]}
        >
          <Text
            style={{
              color: activeSegment === 'overview' ? colors.primary : colors.mutedForeground,
              fontWeight: activeSegment === 'overview' ? '700' : '500',
              fontSize: typography.sm,
            }}
          >
            Coverage Overview
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => {
            triggerHaptic('light');
            setActiveSegment('teaching');
          }}
          style={[
            styles.segmentItem,
            activeSegment === 'teaching' && {
              borderBottomColor: colors.primary,
              borderBottomWidth: 2.5,
            },
          ]}
        >
          <Text
            style={{
              color: activeSegment === 'teaching' ? colors.primary : colors.mutedForeground,
              fontWeight: activeSegment === 'teaching' ? '700' : '500',
              fontSize: typography.sm,
            }}
          >
            Teaching &amp; RVs
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => {
            triggerHaptic('light');
            setActiveSegment('s13');
          }}
          style={[
            styles.segmentItem,
            activeSegment === 's13' && {
              borderBottomColor: colors.primary,
              borderBottomWidth: 2.5,
            },
          ]}
        >
          <Text
            style={{
              color: activeSegment === 's13' ? colors.primary : colors.mutedForeground,
              fontWeight: activeSegment === 's13' ? '700' : '500',
              fontSize: typography.sm,
            }}
          >
            S-13 Record ({s13Records.length})
          </Text>
        </TouchableOpacity>
      </View>

      {activeSegment === 'overview' ? (
        /* Coverage Overview */
        coverageLoading ? (
          <ReportsOverviewSkeleton />
        ) : (
          <ScrollView
            contentContainerStyle={{
              padding: spacing.md,
              paddingBottom: insets.bottom + spacing.xxl,
            }}
          >
            {/* Service Year Countdown & Pacing Banner */}
            <ServiceYearCountdown
              variant="full"
              serviceYear={selectedServiceYear}
              coveragePercent={coverageData.avgCoveragePercent}
              workedCount={coverageData.workedInCurrentSYCount}
              totalCount={coverageData.totalTerritories}
              unworkedCount={coverageData.unworkedInCurrentSYCount}
            />

            {/* Top KPI Cards */}
            <View style={[styles.kpiGrid, { marginTop: spacing.md }]}>
              <Card style={[styles.kpiCard, { flex: 1 }]}>
                <BarChart2 size={18} color={colors.primary} />
                <Text
                  style={[styles.kpiVal, { color: colors.foreground, fontSize: typography.xl }]}
                >
                  {coverageData.avgCoveragePercent}%
                </Text>
                <Text style={{ color: colors.mutedForeground, fontSize: typography.xs }}>
                  Average Coverage
                </Text>
              </Card>

              <Card style={[styles.kpiCard, { flex: 1 }]}>
                <Home size={18} color={colors.success} />
                <Text
                  style={[styles.kpiVal, { color: colors.foreground, fontSize: typography.xl }]}
                >
                  {coverageData.workedDoors}/{coverageData.totalDoors}
                </Text>
                <Text style={{ color: colors.mutedForeground, fontSize: typography.xs }}>
                  Worked Doors
                </Text>
              </Card>
            </View>

            {/* Status Breakdown Card */}
            <Card style={[styles.sectionCard, { marginTop: spacing.md }]}>
              <Text
                style={[styles.cardTitle, { color: colors.foreground, fontSize: typography.base }]}
              >
                Territory Distribution
              </Text>

              <View style={styles.breakdownGrid}>
                <View style={styles.breakdownItem}>
                  <Badge label="Available" variant="success" size="sm" />
                  <Text
                    style={[
                      styles.breakdownVal,
                      { color: colors.foreground, fontSize: typography.lg },
                    ]}
                  >
                    {coverageData.byStatus.available}
                  </Text>
                </View>

                <View style={styles.breakdownItem}>
                  <Badge label="Assigned" variant="primary" size="sm" />
                  <Text
                    style={[
                      styles.breakdownVal,
                      { color: colors.foreground, fontSize: typography.lg },
                    ]}
                  >
                    {coverageData.byStatus.assigned}
                  </Text>
                </View>

                <View style={styles.breakdownItem}>
                  <Badge label="Completed" variant="secondary" size="sm" />
                  <Text
                    style={[
                      styles.breakdownVal,
                      { color: colors.foreground, fontSize: typography.lg },
                    ]}
                  >
                    {coverageData.byStatus.completed}
                  </Text>
                </View>
              </View>
            </Card>

            {/* S-13 PDF Download Action Card */}
            <Card
              style={[
                styles.sectionCard,
                {
                  marginTop: spacing.md,
                  backgroundColor: `${colors.primary}12`,
                  borderColor: `${colors.primary}35`,
                },
              ]}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <FileText size={28} color={colors.primary} />
                <View style={{ flex: 1, marginLeft: spacing.sm }}>
                  <Text
                    style={{
                      fontWeight: '700',
                      color: colors.foreground,
                      fontSize: typography.base,
                    }}
                  >
                    Export Form S-13 (8/19)
                  </Text>
                  <Text style={{ color: colors.mutedForeground, fontSize: typography.xs }}>
                    Generate official congregation territory assignment PDF
                  </Text>
                </View>
              </View>
              <Button
                title="Generate & Share S-13 PDF"
                onPress={handleExportS13Pdf}
                loading={isExporting}
                style={{ marginTop: spacing.md }}
              />
            </Card>
          </ScrollView>
        )
      ) : s13Loading ? (
        <ReportsS13Skeleton />
      ) : (
        /* S-13 Assignment Records Table / List */
        <FlatList
          data={s13Records}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{
            padding: spacing.md,
            paddingBottom: insets.bottom + spacing.xxl,
          }}
          renderItem={({ item }) => (
            <Card style={[styles.s13Card, { marginBottom: spacing.sm }]}>
              <View style={styles.s13Header}>
                <View style={styles.numberBox}>
                  <Text
                    style={{ fontWeight: '800', color: colors.primary, fontSize: typography.base }}
                  >
                    #{item.territoryNumber}
                  </Text>
                </View>
                <View style={{ flex: 1, marginLeft: spacing.sm }}>
                  <Text
                    style={{
                      fontWeight: '700',
                      color: colors.foreground,
                      fontSize: typography.sm + 1,
                    }}
                  >
                    {item.territoryName}
                  </Text>
                  <Text style={{ color: colors.mutedForeground, fontSize: typography.xs }}>
                    {item.assigneeName} {item.isGroupAssignment ? '(Group)' : ''}
                  </Text>
                </View>
                <Badge
                  label={item.returnedAt ? 'Completed' : 'Active'}
                  variant={item.returnedAt ? 'success' : 'primary'}
                  size="sm"
                />
              </View>

              <View style={[styles.s13DatesRow, { borderTopColor: colors.border }]}>
                <View>
                  <Text style={{ color: colors.mutedForeground, fontSize: typography.xs - 1 }}>
                    ASSIGNED
                  </Text>
                  <Text
                    style={{ color: colors.foreground, fontSize: typography.xs, fontWeight: '600' }}
                  >
                    {item.assignedAt ? formatDate(item.assignedAt) : '—'}
                  </Text>
                </View>

                <View>
                  <Text style={{ color: colors.mutedForeground, fontSize: typography.xs - 1 }}>
                    RETURNED
                  </Text>
                  <Text
                    style={{ color: colors.foreground, fontSize: typography.xs, fontWeight: '600' }}
                  >
                    {item.returnedAt ? formatDate(item.returnedAt) : 'In Field'}
                  </Text>
                </View>

                <View>
                  <Text style={{ color: colors.mutedForeground, fontSize: typography.xs - 1 }}>
                    DURATION
                  </Text>
                  <Text
                    style={{ color: colors.foreground, fontSize: typography.xs, fontWeight: '600' }}
                  >
                    {item.durationDays !== null ? `${item.durationDays}d` : '—'}
                  </Text>
                </View>

                <View>
                  <Text style={{ color: colors.mutedForeground, fontSize: typography.xs - 1 }}>
                    COVERAGE
                  </Text>
                  <Text
                    style={{ color: colors.foreground, fontSize: typography.xs, fontWeight: '700' }}
                  >
                    {Math.round(item.coverageAtReturn)}%
                  </Text>
                </View>
              </View>
            </Card>
          )}
        />
      ) : (
        /* Teaching & RVs Analytics */
        teachingLoading ? (
          <ReportsOverviewSkeleton />
        ) : (
          <ScrollView
            contentContainerStyle={{
              padding: spacing.md,
              paddingBottom: insets.bottom + spacing.xxl,
            }}
          >
            {/* 4 Teaching KPI Cards */}
            <View style={styles.kpiGrid}>
              <Card style={[styles.kpiCard, { flex: 1 }]}>
                <Sparkles size={18} color="#10b981" />
                <Text
                  style={[styles.kpiVal, { color: colors.foreground, fontSize: typography.xl }]}
                >
                  {teachingData?.totals.interestedContacts.total ?? 0}
                </Text>
                <Text style={{ color: colors.mutedForeground, fontSize: typography.xs }}>
                  Interested Contacts
                </Text>
                <Text style={{ color: '#10b981', fontSize: 10, marginTop: 2, fontWeight: '600' }}>
                  {teachingData?.totals.interestedContacts.studyInterested ?? 0} study interests
                </Text>
              </Card>

              <Card style={[styles.kpiCard, { flex: 1 }]}>
                <CheckCircle2 size={18} color="#3b82f6" />
                <Text
                  style={[styles.kpiVal, { color: colors.foreground, fontSize: typography.xl }]}
                >
                  {teachingData?.totals.returnVisits.visited ?? 0}
                </Text>
                <Text style={{ color: colors.mutedForeground, fontSize: typography.xs }}>
                  RVs Completed
                </Text>
                <Text style={{ color: '#f59e0b', fontSize: 10, marginTop: 2, fontWeight: '600' }}>
                  {teachingData?.totals.returnVisits.missed ?? 0} missed
                </Text>
              </Card>
            </View>

            <View style={[styles.kpiGrid, { marginTop: spacing.sm }]}>
              <Card style={[styles.kpiCard, { flex: 1 }]}>
                <BookOpen size={18} color="#8b5cf6" />
                <Text
                  style={[styles.kpiVal, { color: colors.foreground, fontSize: typography.xl }]}
                >
                  {teachingData?.totals.bibleStudies.conducted ?? 0}
                </Text>
                <Text style={{ color: colors.mutedForeground, fontSize: typography.xs }}>
                  Studies Conducted
                </Text>
                <Text style={{ color: '#8b5cf6', fontSize: 10, marginTop: 2, fontWeight: '600' }}>
                  {teachingData?.totals.bibleStudies.offered ?? 0} offered
                </Text>
              </Card>

              <Card style={[styles.kpiCard, { flex: 1 }]}>
                <Users size={18} color="#ec4899" />
                <Text
                  style={[styles.kpiVal, { color: '#ec4899', fontSize: typography.xl }]}
                >
                  {teachingData?.totals.bibleStudies.activeCount ?? 0}
                </Text>
                <Text style={{ color: colors.mutedForeground, fontSize: typography.xs }}>
                  Active Studies
                </Text>
                <Text style={{ color: colors.mutedForeground, fontSize: 10, marginTop: 2 }}>
                  Live pipeline
                </Text>
              </Card>
            </View>

            {/* Service Groups Teaching Breakdown */}
            <Card style={[styles.sectionCard, { marginTop: spacing.md }]}>
              <Text style={[styles.cardTitle, { color: colors.foreground, fontSize: typography.base }]}>
                Service Groups Breakdown ({teachingData?.byGroup?.length ?? 0})
              </Text>
              {(teachingData?.byGroup || []).map((g) => (
                <View
                  key={g.groupId}
                  style={{
                    borderTopWidth: StyleSheet.hairlineWidth,
                    borderTopColor: colors.border,
                    paddingVertical: 10,
                  }}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ color: colors.foreground, fontWeight: '700', fontSize: typography.sm }}>
                      {g.name}
                    </Text>
                    <Badge
                      label={`${g.metrics.bibleStudies.activeCount} active`}
                      variant={g.metrics.bibleStudies.activeCount > 0 ? 'primary' : 'secondary'}
                      size="sm"
                    />
                  </View>
                  <Text style={{ color: colors.mutedForeground, fontSize: typography.xs, marginTop: 2 }}>
                    Overseer: {g.overseerName || 'Unassigned'}
                  </Text>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, backgroundColor: `${colors.muted}40`, padding: 8, borderRadius: 8 }}>
                    <Text style={{ color: colors.foreground, fontSize: typography.xs }}>
                      Interested: <Text style={{ fontWeight: '700' }}>{g.metrics.interestedContacts.total}</Text>
                    </Text>
                    <Text style={{ color: '#3b82f6', fontSize: typography.xs }}>
                      RVs: <Text style={{ fontWeight: '700' }}>{g.metrics.returnVisits.visited}</Text> ({g.metrics.returnVisits.missed} msd)
                    </Text>
                    <Text style={{ color: '#8b5cf6', fontSize: typography.xs }}>
                      Studies: <Text style={{ fontWeight: '700' }}>{g.metrics.bibleStudies.conducted}</Text>
                    </Text>
                  </View>
                </View>
              ))}
            </Card>

            {/* Top Publishers Teaching Activity */}
            <Card style={[styles.sectionCard, { marginTop: spacing.md }]}>
              <Text style={[styles.cardTitle, { color: colors.foreground, fontSize: typography.base }]}>
                Publishers Activity ({(teachingData?.byPublisher || []).length})
              </Text>
              {(teachingData?.byPublisher || []).slice(0, 15).map((p) => (
                <View
                  key={p.userId}
                  style={{
                    borderTopWidth: StyleSheet.hairlineWidth,
                    borderTopColor: colors.border,
                    paddingVertical: 8,
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.foreground, fontWeight: '600', fontSize: typography.xs }}>
                      {p.name}
                    </Text>
                    <Text style={{ color: colors.mutedForeground, fontSize: 10 }}>
                      {p.groupName || 'No group'} • {p.metrics.interestedContacts.total} contacts
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ color: '#8b5cf6', fontWeight: '700', fontSize: typography.xs }}>
                      {p.metrics.bibleStudies.conducted} studies
                    </Text>
                    <Text style={{ color: colors.mutedForeground, fontSize: 10 }}>
                      {p.metrics.returnVisits.visited} RVs ({p.metrics.returnVisits.missed} missed)
                    </Text>
                  </View>
                </View>
              ))}
            </Card>
          </ScrollView>
        )
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  exportBtn: {
    padding: 6,
  },
  segmentContainer: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  segmentItem: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  kpiGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  kpiCard: {
    padding: 14,
  },
  kpiVal: {
    fontWeight: '800',
    marginTop: 6,
  },
  sectionCard: {
    padding: 16,
  },
  cardTitle: {
    fontWeight: '700',
    marginBottom: 12,
  },
  breakdownGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 6,
  },
  breakdownItem: {
    alignItems: 'center',
  },
  breakdownVal: {
    fontWeight: '800',
    marginTop: 6,
  },
  s13Card: {
    padding: 14,
  },
  s13Header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  numberBox: {
    minWidth: 36,
  },
  s13DatesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: 10,
    paddingTop: 8,
  },
  syChipsContainer: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  syChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
