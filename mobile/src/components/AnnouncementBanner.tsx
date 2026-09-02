// mobile/src/components/AnnouncementBanner.tsx
import { useRouter } from 'expo-router';
import {
  AlertCircle,
  Bell,
  ChevronRight,
  Pin,
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
import { Card } from '@/components/ui/Card';
import { useTheme } from '@/context/ThemeContext';
import { triggerHaptic } from '@/lib/sound';
import type { Announcement } from '@/types/api';

export interface AnnouncementBannerProps {
  announcement?: Announcement | null;
  totalCount?: number;
  onPress?: () => void;
}

export function AnnouncementBanner({
  announcement,
  totalCount = 1,
  onPress,
}: AnnouncementBannerProps) {
  const router = useRouter();
  const { colors, typography, spacing, radius } = useTheme();
  const [dismissed, setDismissed] = useState(false);

  if (!announcement || dismissed) return null;

  const handlePress = () => {
    triggerHaptic('light');
    if (onPress) {
      onPress();
    } else {
      router.push('/(tabs)/more/announcements');
    }
  };

  const isUrgent = announcement.priority === 'urgent';
  const isImportant = announcement.priority === 'important';

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={handlePress}
      style={{ marginBottom: spacing.md }}
    >
      <Card
        style={[
          styles.card,
          {
            backgroundColor: isUrgent
              ? `${colors.destructive}12`
              : isImportant
              ? `${colors.warning}14`
              : `${colors.primary}10`,
            borderColor: isUrgent
              ? colors.destructive
              : isImportant
              ? colors.warning
              : `${colors.primary}40`,
            borderWidth: 1.2,
          },
        ]}
      >
        <View style={styles.contentRow}>
          <View
            style={[
              styles.iconBox,
              {
                backgroundColor: isUrgent
                  ? colors.destructive
                  : isImportant
                  ? colors.warning
                  : colors.primary,
              },
            ]}
          >
            {announcement.isPinned ? (
              <Pin size={16} color="#ffffff" />
            ) : isUrgent ? (
              <AlertCircle size={16} color="#ffffff" />
            ) : (
              <Bell size={16} color="#ffffff" />
            )}
          </View>

          <View style={{ flex: 1, marginLeft: spacing.sm }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              {isUrgent && <Badge label="Urgent Notice" variant="destructive" size="sm" />}
              {announcement.isPinned && !isUrgent && (
                <Badge label="Pinned" variant="primary" size="sm" />
              )}
              {announcement.scope === 'system' && (
                <Badge label="System Update" variant="secondary" size="sm" />
              )}
              {announcement.scope === 'service_group' && (
                <Badge label={announcement.serviceGroupName || 'Service Group'} variant="success" size="sm" />
              )}
              {totalCount > 1 && (
                <Badge label={`${totalCount} Active`} variant="outline" size="sm" />
              )}
            </View>

            <Text
              numberOfLines={1}
              style={[
                styles.title,
                { color: colors.foreground, fontSize: typography.sm, marginTop: 4 },
              ]}
            >
              {announcement.title}
            </Text>

            <Text
              numberOfLines={1}
              style={[
                styles.preview,
                { color: colors.mutedForeground, fontSize: typography.xs, marginTop: 1 },
              ]}
            >
              {announcement.content.replace(/\n+/g, ' ')}
            </Text>
          </View>

          <ChevronRight size={16} color={colors.mutedForeground} style={{ marginLeft: 6 }} />
        </View>
      </Card>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 12,
    borderRadius: 14,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontWeight: '800',
  },
  preview: {},
});
