// mobile/src/components/ServiceYearCountdown.tsx
import { Calendar, CheckCircle2, Clock, Flame } from 'lucide-react-native';
import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { useTheme } from '@/context/ThemeContext';
import {
  getServiceYear,
  getServiceYearCountdown,
  getServiceYearRange,
  type ServiceYearCountdownInfo,
} from '@/lib/service-year';

export interface ServiceYearCountdownProps {
  variant?: 'compact' | 'full';
  serviceYear?: number | 'all';
  coveragePercent?: number;
  workedCount?: number;
  totalCount?: number;
  unworkedCount?: number;
  onPressUnworked?: () => void;
}

export function ServiceYearCountdown({
  variant = 'compact',
  serviceYear,
  coveragePercent,
  workedCount,
  totalCount,
  unworkedCount,
  onPressUnworked,
}: ServiceYearCountdownProps) {
  const { colors, typography, spacing, radius } = useTheme();
  const currentSY = getServiceYear();
  const activeSY = serviceYear === 'all' || !serviceYear ? currentSY : serviceYear;
  const range = useMemo(() => getServiceYearRange(activeSY), [activeSY]);

  const countdown: ServiceYearCountdownInfo = useMemo(() => {
    return getServiceYearCountdown(new Date(), activeSY);
  }, [activeSY]);

  if (variant === 'compact') {
    if (countdown.isPastServiceYear) {
      return (
        <Badge
          label={`${range.shortLabel} Concluded`}
          variant="secondary"
          size="sm"
        />
      );
    }

    return (
      <View
        style={[
          styles.compactPill,
          {
            backgroundColor: `${colors.primary}15`,
            borderColor: `${colors.primary}35`,
          },
        ]}
      >
        <Clock size={12} color={colors.primary} />
        <Text style={[styles.compactText, { color: colors.primary, fontSize: typography.xs - 1 }]}>
          {countdown.daysRemaining}d left in {range.shortLabel}
        </Text>
      </View>
    );
  }

  // Full Card Variant
  return (
    <Card
      style={[
        styles.fullCard,
        {
          backgroundColor: colors.card,
          borderColor: `${colors.primary}30`,
          padding: spacing.md,
        },
      ]}
    >
      <View style={styles.headerRow}>
        <View
          style={[
            styles.iconBox,
            { backgroundColor: `${colors.primary}15`, borderRadius: radius.md },
          ]}
        >
          <Calendar size={20} color={colors.primary} />
        </View>

        <View style={{ flex: 1, marginLeft: spacing.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
            <Text
              style={{
                color: colors.foreground,
                fontSize: typography.base,
                fontWeight: '700',
              }}
            >
              {range.label}
            </Text>
            <Badge
              label={countdown.phaseTitle}
              variant="primary"
              size="sm"
            />
          </View>

          <Text style={{ color: colors.mutedForeground, fontSize: typography.xs, marginTop: 2 }}>
            {countdown.daysRemaining} days left • Ends {countdown.endDateFormatted}
          </Text>
        </View>
      </View>

      {/* Progress Bar */}
      <View style={{ marginTop: spacing.md }}>
        <View style={styles.progressLabelRow}>
          <Text style={{ color: colors.mutedForeground, fontSize: typography.xs }}>
            Year Timeline Elapsed
          </Text>
          <Text style={{ color: colors.foreground, fontSize: typography.xs, fontWeight: '700' }}>
            {countdown.percentYearElapsed}%
          </Text>
        </View>

        <View style={[styles.progressBarTrack, { backgroundColor: colors.border }]}>
          <View
            style={[
              styles.progressBarFill,
              {
                backgroundColor: colors.primary,
                width: `${countdown.percentYearElapsed}%`,
              },
            ]}
          />
        </View>
      </View>

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        <View style={[styles.statBox, { borderColor: colors.border }]}>
          <Text style={{ color: colors.mutedForeground, fontSize: typography.xs - 2 }}>
            TIME REMAINING
          </Text>
          <Text style={[styles.statValue, { color: colors.foreground, fontSize: typography.sm }]}>
            {countdown.monthsRemaining} mo ({countdown.daysRemaining}d)
          </Text>
        </View>

        <View style={[styles.statBox, { borderColor: colors.border }]}>
          <Text style={{ color: colors.mutedForeground, fontSize: typography.xs - 2 }}>
            SY COVERAGE
          </Text>
          <Text style={[styles.statValue, { color: colors.foreground, fontSize: typography.sm }]}>
            {typeof coveragePercent === 'number' ? `${coveragePercent}%` : '—'}
          </Text>
        </View>

        <TouchableOpacity
          onPress={onPressUnworked}
          disabled={!onPressUnworked}
          style={[styles.statBox, { borderColor: colors.border }]}
        >
          <Text style={{ color: colors.mutedForeground, fontSize: typography.xs - 2 }}>
            UNWORKED SY
          </Text>
          <Text
            style={[
              styles.statValue,
              {
                color: typeof unworkedCount === 'number' && unworkedCount > 0 ? colors.warning || '#f59e0b' : colors.foreground,
                fontSize: typography.sm,
              },
            ]}
          >
            {typeof unworkedCount === 'number' ? unworkedCount : '—'}
          </Text>
        </TouchableOpacity>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  compactPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
  },
  compactText: {
    fontWeight: '700',
  },
  fullCard: {
    borderWidth: 1,
    borderRadius: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBox: {
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  progressBarTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  statBox: {
    flex: 1,
    padding: 8,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  statValue: {
    fontWeight: '800',
    marginTop: 2,
  },
});
