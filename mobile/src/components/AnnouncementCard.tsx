// mobile/src/components/AnnouncementCard.tsx
import {
  AlertCircle,
  Building2,
  Calendar,
  Clock,
  ExternalLink,
  Flame,
  Globe,
  MoreVertical,
  Pin,
  Sparkles,
  Trash2,
  Wrench,
} from 'lucide-react-native';
import React, { useState } from 'react';
import {
  Alert,
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { MarkdownRenderer } from '@/components/ui/MarkdownRenderer';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { formatDate } from '@/lib/date-utils';
import { canManageAnnouncement } from '@/lib/permissions';
import { triggerHaptic } from '@/lib/sound';
import type { Announcement, AnnouncementCategory } from '@/types/api';

export interface AnnouncementCardProps {
  announcement: Announcement;
  onEdit?: (announcement: Announcement) => void;
  onDelete?: (announcementId: string) => void;
  onTogglePin?: (announcementId: string, currentPin: boolean) => void;
  showActions?: boolean;
}

export function AnnouncementCard({
  announcement,
  onEdit,
  onDelete,
  onTogglePin,
  showActions = true,
}: AnnouncementCardProps) {
  const { user } = useAuth();
  const { colors, typography, spacing, radius } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);

  const canManage = canManageAnnouncement(user, announcement);

  const getCategoryConfig = (category: AnnouncementCategory) => {
    switch (category) {
      case 'service_year':
        return {
          label: 'Service Year',
          icon: <Calendar size={12} color={colors.primary} />,
          variant: 'primary' as const,
        };
      case 'feature_update':
        return {
          label: 'Feature Update',
          icon: <Sparkles size={12} color="#8b5cf6" />,
          variant: 'secondary' as const,
        };
      case 'maintenance':
        return {
          label: 'Maintenance',
          icon: <Wrench size={12} color={colors.warning} />,
          variant: 'warning' as const,
        };
      case 'bug_fix':
        return {
          label: 'Bug Fix / Resolved',
          icon: <Wrench size={12} color={colors.success} />,
          variant: 'success' as const,
        };
      case 'campaign':
        return {
          label: 'Campaign',
          icon: <Flame size={12} color="#f97316" />,
          variant: 'outline' as const,
        };
      case 'urgent':
        return {
          label: 'Urgent',
          icon: <AlertCircle size={12} color={colors.destructive} />,
          variant: 'destructive' as const,
        };
      default:
        return {
          label: 'General',
          icon: <Building2 size={12} color={colors.mutedForeground} />,
          variant: 'outline' as const,
        };
    }
  };

  const catConfig = getCategoryConfig(announcement.category);

  const handleDelete = () => {
    setMenuOpen(false);
    Alert.alert(
      'Delete Announcement',
      'Are you sure you want to remove this announcement? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await triggerHaptic('medium');
            onDelete?.(announcement.id);
          },
        },
      ]
    );
  };

  const handleOpenLink = async (url: string) => {
    try {
      await triggerHaptic('light');
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      }
    } catch {}
  };

  const isSystem = announcement.scope === 'system';
  const isUrgent = announcement.priority === 'urgent';
  const isImportant = announcement.priority === 'important';

  return (
    <Card
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: isUrgent
            ? colors.destructive
            : isImportant
            ? colors.warning
            : announcement.isPinned
            ? `${colors.primary}60`
            : colors.border,
          borderWidth: isUrgent || announcement.isPinned ? 1.5 : 1,
        },
      ]}
    >
      {/* Header Chips & Status */}
      <View style={styles.topRow}>
        <View style={styles.badgesRow}>
          {/* Scope Badge */}
          {isSystem ? (
            <Badge
              label="System Wide"
              variant="secondary"
              size="sm"
            />
          ) : announcement.scope === 'service_group' ? (
            <Badge
              label={announcement.serviceGroupName || 'Service Group'}
              variant="success"
              size="sm"
            />
          ) : (
            <Badge
              label={announcement.congregationName || 'Congregation'}
              variant="outline"
              size="sm"
            />
          )}

          {/* Category Badge */}
          <Badge
            label={catConfig.label}
            variant={catConfig.variant}
            size="sm"
          />

          {/* Priority Badge if Urgent or Important */}
          {isUrgent && (
            <Badge label="Urgent" variant="destructive" size="sm" />
          )}
          {isImportant && (
            <Badge label="Important" variant="warning" size="sm" />
          )}

          {/* Pinned Pill */}
          {announcement.isPinned && (
            <View
              style={[
                styles.pinnedPill,
                { backgroundColor: `${colors.primary}15`, borderColor: `${colors.primary}40` },
              ]}
            >
              <Pin size={10} color={colors.primary} />
              <Text style={[styles.pinnedText, { color: colors.primary, fontSize: 10 }]}>
                Pinned
              </Text>
            </View>
          )}
        </View>

        {/* Action button menu */}
        {showActions && canManage && (
          <TouchableOpacity
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            onPress={() => {
              triggerHaptic('light');
              setMenuOpen(!menuOpen);
            }}
            style={styles.menuTrigger}
          >
            <MoreVertical size={16} color={colors.mutedForeground} />
          </TouchableOpacity>
        )}
      </View>

      {/* Action Dropdown Menu */}
      {menuOpen && canManage && (
        <View
          style={[
            styles.actionDropdown,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          {onTogglePin && (
            <TouchableOpacity
              style={styles.dropdownItem}
              onPress={() => {
                setMenuOpen(false);
                triggerHaptic('light');
                onTogglePin(announcement.id, announcement.isPinned);
              }}
            >
              <Pin size={14} color={colors.foreground} />
              <Text style={[styles.dropdownText, { color: colors.foreground }]}>
                {announcement.isPinned ? 'Unpin from Top' : 'Pin to Top'}
              </Text>
            </TouchableOpacity>
          )}

          {onEdit && (
            <TouchableOpacity
              style={styles.dropdownItem}
              onPress={() => {
                setMenuOpen(false);
                triggerHaptic('light');
                onEdit(announcement);
              }}
            >
              <Sparkles size={14} color={colors.foreground} />
              <Text style={[styles.dropdownText, { color: colors.foreground }]}>
                Edit Announcement
              </Text>
            </TouchableOpacity>
          )}

          {onDelete && (
            <TouchableOpacity
              style={[styles.dropdownItem, { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }]}
              onPress={handleDelete}
            >
              <Trash2 size={14} color={colors.destructive} />
              <Text style={[styles.dropdownText, { color: colors.destructive }]}>
                Delete
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Announcement Title */}
      <Text
        style={[
          styles.title,
          {
            color: colors.foreground,
            fontSize: typography.base + 1,
            marginTop: spacing.xs,
          },
        ]}
      >
        {announcement.title}
      </Text>

      {/* Content Markdown */}
      <MarkdownRenderer content={announcement.content} style={{ marginTop: 6 }} />

      {/* Optional action URL button */}
      {announcement.actionUrl && (
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => handleOpenLink(announcement.actionUrl!)}
          style={[
            styles.actionUrlButton,
            { backgroundColor: `${colors.primary}12`, borderColor: `${colors.primary}30` },
          ]}
        >
          <ExternalLink size={13} color={colors.primary} />
          <Text
            numberOfLines={1}
            style={[styles.actionUrlText, { color: colors.primary, fontSize: typography.xs }]}
          >
            Learn more / View link
          </Text>
        </TouchableOpacity>
      )}

      {/* Footer Author & Date */}
      <View
        style={[
          styles.footer,
          { borderTopColor: colors.border, marginTop: spacing.md, paddingTop: spacing.xs },
        ]}
      >
        <View style={styles.authorRow}>
          <Text
            style={[
              styles.authorText,
              { color: colors.mutedForeground, fontSize: typography.xs },
            ]}
          >
            Posted by{' '}
            <Text style={{ fontWeight: '700', color: colors.foreground }}>
              {announcement.authorName}
            </Text>
            {announcement.authorRole ? ` (${announcement.authorRole})` : ''}
          </Text>
        </View>

        <View style={styles.dateRow}>
          <Clock size={11} color={colors.mutedForeground} />
          <Text
            style={[
              styles.dateText,
              { color: colors.mutedForeground, fontSize: typography.xs - 1, marginLeft: 4 },
            ]}
          >
            {formatDate(announcement.createdAt)}
          </Text>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderRadius: 14,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    flex: 1,
  },
  pinnedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    gap: 3,
  },
  pinnedText: {
    fontWeight: '700',
  },
  menuTrigger: {
    padding: 4,
  },
  actionDropdown: {
    marginTop: 8,
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 4,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 8,
  },
  dropdownText: {
    fontSize: 12,
    fontWeight: '600',
  },
  title: {
    fontWeight: '800',
  },
  content: {
    fontWeight: '400',
  },
  actionUrlButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
    marginTop: 10,
  },
  actionUrlText: {
    fontWeight: '700',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: StyleSheet.hairlineWidth,
    flexWrap: 'wrap',
    gap: 6,
  },
  authorRow: {
    flex: 1,
    minWidth: 150,
  },
  authorText: {},
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateText: {},
});
