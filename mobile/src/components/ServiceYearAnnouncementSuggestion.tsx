// mobile/src/components/ServiceYearAnnouncementSuggestion.tsx
import {
  Calendar,
  ChevronRight,
  Flame,
  Lightbulb,
  Sparkles,
  X,
} from 'lucide-react-native';
import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useTheme } from '@/context/ThemeContext';
import { triggerHaptic } from '@/lib/sound';
import type { ServiceYearSuggestion } from '@/types/api';

export interface ServiceYearAnnouncementSuggestionProps {
  suggestion: ServiceYearSuggestion;
  onUseSuggestion: (suggestion: ServiceYearSuggestion) => void;
  onDismiss?: () => void;
}

export function ServiceYearAnnouncementSuggestion({
  suggestion,
  onUseSuggestion,
  onDismiss,
}: ServiceYearAnnouncementSuggestionProps) {
  const { colors, typography, spacing, radius } = useTheme();
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const handleDismiss = () => {
    triggerHaptic('light');
    setDismissed(true);
    onDismiss?.();
  };

  const handleUse = () => {
    triggerHaptic('medium');
    onUseSuggestion(suggestion);
  };

  const getMilestoneIcon = () => {
    switch (suggestion.milestone) {
      case 'kickoff':
        return <Sparkles size={18} color={colors.primary} />;
      case 'campaign':
        return <Flame size={18} color="#f97316" />;
      case 'closing':
        return <Calendar size={18} color={colors.destructive} />;
      default:
        return <Lightbulb size={18} color={colors.warning} />;
    }
  };

  return (
    <Card
      style={[
        styles.card,
        {
          backgroundColor: `${colors.primary}0c`,
          borderColor: `${colors.primary}35`,
          borderWidth: 1.2,
        },
      ]}
    >
      <View style={styles.headerRow}>
        <View style={[styles.iconBox, { backgroundColor: `${colors.primary}18` }]}>
          {getMilestoneIcon()}
        </View>

        <View style={{ flex: 1, marginLeft: spacing.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <Text
              style={[
                styles.title,
                { color: colors.foreground, fontSize: typography.sm + 1 },
              ]}
            >
              {suggestion.title}
            </Text>
            <Badge label={suggestion.badgeLabel} variant="primary" size="sm" />
          </View>
          <Text
            style={[
              styles.subtitle,
              { color: colors.mutedForeground, fontSize: typography.xs, marginTop: 2 },
            ]}
          >
            Periodic Service Year Suggestion
          </Text>
        </View>

        <TouchableOpacity
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          onPress={handleDismiss}
          style={styles.dismissBtn}
        >
          <X size={16} color={colors.mutedForeground} />
        </TouchableOpacity>
      </View>

      <Text
        style={[
          styles.reason,
          { color: colors.foreground, fontSize: typography.xs, marginTop: 8, lineHeight: 18 },
        ]}
      >
        {suggestion.reason}
      </Text>

      {/* Suggested Preview Box */}
      <View
        style={[
          styles.previewBox,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
            marginTop: 10,
          },
        ]}
      >
        <Text
          numberOfLines={1}
          style={[styles.previewTitle, { color: colors.primary, fontSize: typography.xs }]}
        >
          Draft: {suggestion.suggestedTitle}
        </Text>
        <Text
          numberOfLines={2}
          style={[
            styles.previewBody,
            { color: colors.mutedForeground, fontSize: typography.xs - 1, marginTop: 2 },
          ]}
        >
          {suggestion.suggestedContent}
        </Text>
      </View>

      <View style={{ marginTop: 12, flexDirection: 'row', justifyContent: 'flex-end', gap: 8 }}>
        <Button
          title="Dismiss"
          variant="ghost"
          size="sm"
          onPress={handleDismiss}
        />
        <Button
          title="Use Template & Post"
          variant="primary"
          size="sm"
          icon={<ChevronRight size={14} color="#ffffff" />}
          onPress={handleUse}
        />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 14,
    borderRadius: 14,
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontWeight: '800',
  },
  subtitle: {
    fontWeight: '500',
  },
  dismissBtn: {
    padding: 4,
  },
  reason: {},
  previewBox: {
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  previewTitle: {
    fontWeight: '700',
  },
  previewBody: {},
});
