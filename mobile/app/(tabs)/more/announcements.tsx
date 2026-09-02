// mobile/app/(tabs)/more/announcements.tsx
import { useRouter } from 'expo-router';
import {
  AlertCircle,
  Bell,
  Building2,
  Calendar,
  ChevronDown,
  ExternalLink,
  Flame,
  Globe,
  Link,
  Plus,
  Search,
  Sparkles,
  Users,
  Wrench,
  X,
} from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AnnouncementCard } from '@/components/AnnouncementCard';
import { ServiceYearAnnouncementSuggestion } from '@/components/ServiceYearAnnouncementSuggestion';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Header } from '@/components/ui/Header';
import { Input } from '@/components/ui/Input';
import { MarkdownRenderer } from '@/components/ui/MarkdownRenderer';
import { MarkdownToolbar } from '@/components/ui/MarkdownToolbar';
import { NotificationsSkeleton } from '@/components/ui/ScreenSkeletons';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useAnnouncements, useServiceYearAnnouncementSuggestions } from '@/hooks/useAnnouncements';
import { useCongregation } from '@/hooks/useCongregations';
import { useCongregationGroups } from '@/hooks/useCongregationGroups';
import {
  canPostCongregationAnnouncement,
  canPostServiceGroupAnnouncement,
  canPostSystemAnnouncement,
  isSystemAdmin,
} from '@/lib/permissions';
import { triggerHaptic } from '@/lib/sound';
import type {
  Announcement,
  AnnouncementCategory,
  AnnouncementPriority,
  AnnouncementScope,
  ServiceYearSuggestion,
} from '@/types/api';

type TabFilter = 'all' | 'congregation' | 'service_group' | 'system';

export default function AnnouncementsScreen() {
  const _router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, activeCongregationId } = useAuth();
  const { congregation } = useCongregation(activeCongregationId);
  const { groups } = useCongregationGroups(activeCongregationId);
  const { colors, typography, spacing, radius } = useTheme();

  const {
    announcements,
    congregationAnnouncements,
    serviceGroupAnnouncements,
    systemAnnouncements,
    isLoading,
    createAnnouncement,
    updateAnnouncement,
    deleteAnnouncement,
    togglePin,
  } = useAnnouncements(activeCongregationId);

  const { suggestions, primarySuggestion } = useServiceYearAnnouncementSuggestions(
    activeCongregationId,
    announcements
  );

  const [activeTab, setActiveTab] = useState<TabFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [formScope, setFormScope] = useState<AnnouncementScope>('congregation');
  const [formServiceGroupId, setFormServiceGroupId] = useState<string>('');
  const [formCategory, setFormCategory] = useState<AnnouncementCategory>('general');
  const [formPriority, setFormPriority] = useState<AnnouncementPriority>('normal');
  const [formTitle, setFormTitle] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formIsPinned, setFormIsPinned] = useState(false);
  const [formActionUrl, setFormActionUrl] = useState('');
  const [composerTab, setComposerTab] = useState<'write' | 'preview'>('write');

  const canPostCong = canPostCongregationAnnouncement(user?.role, user?.congregationRole);
  const canPostSys = canPostSystemAnnouncement(user?.role);
  const canPostAny = canPostCong || canPostSys;

  const filteredAnnouncements = useMemo(() => {
    let list = announcements;

    if (activeTab === 'congregation') {
      list = congregationAnnouncements;
    } else if (activeTab === 'service_group') {
      list = serviceGroupAnnouncements;
    } else if (activeTab === 'system') {
      list = systemAnnouncements;
    }

    if (categoryFilter !== 'all') {
      list = list.filter((a) => a.category === categoryFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          a.content.toLowerCase().includes(q) ||
          a.authorName.toLowerCase().includes(q) ||
          (a.serviceGroupName && a.serviceGroupName.toLowerCase().includes(q))
      );
    }

    return list;
  }, [
    announcements,
    congregationAnnouncements,
    serviceGroupAnnouncements,
    systemAnnouncements,
    activeTab,
    categoryFilter,
    searchQuery,
  ]);

  const handleOpenCreateModal = (prefillSuggestion?: ServiceYearSuggestion) => {
    setEditingAnnouncement(null);
    if (prefillSuggestion) {
      setFormScope('congregation');
      setFormServiceGroupId('');
      setFormCategory(prefillSuggestion.suggestedCategory);
      setFormPriority(prefillSuggestion.suggestedPriority);
      setFormTitle(prefillSuggestion.suggestedTitle);
      setFormContent(prefillSuggestion.suggestedContent);
      setFormIsPinned(true);
      setFormActionUrl('');
    } else {
      setFormScope(canPostSys && !canPostCong ? 'system' : 'congregation');
      setFormServiceGroupId(groups[0]?.id || '');
      setFormCategory('general');
      setFormPriority('normal');
      setFormTitle('');
      setFormContent('');
      setFormIsPinned(false);
      setFormActionUrl('');
    }
    setModalVisible(true);
  };

  const handleOpenEditModal = (announcement: Announcement) => {
    setEditingAnnouncement(announcement);
    setFormScope(announcement.scope);
    setFormServiceGroupId(announcement.serviceGroupId || '');
    setFormCategory(announcement.category);
    setFormPriority(announcement.priority);
    setFormTitle(announcement.title);
    setFormContent(announcement.content);
    setFormIsPinned(announcement.isPinned);
    setFormActionUrl(announcement.actionUrl || '');
    setModalVisible(true);
  };

  const handleApplyTemplate = (type: string) => {
    triggerHaptic('light');
    switch (type) {
      case 'sy_kickoff':
        setFormScope('congregation');
        setFormCategory('service_year');
        setFormPriority('important');
        setFormTitle('Welcome to the New Service Year!');
        setFormContent(
          'Dear brothers and sisters, as we begin the new service year, let us set enthusiastic spiritual goals for our territory coverage.\n\n• Please review your active territory assignments.\n• Regular service group arrangements are scheduled.\n• Auxiliary pioneer applications are available from the Service Overseer.'
        );
        break;
      case 'sy_closing':
        setFormScope('congregation');
        setFormCategory('service_year');
        setFormPriority('urgent');
        setFormTitle('Year-End Service Year Wrap-Up (August 31)');
        setFormContent(
          'As our service year draws to a close on August 31, please return all completed territory assignments and update household notes so that congregation S-13 registers can be finalized.'
        );
        break;
      case 'campaign':
        setFormScope('congregation');
        setFormCategory('campaign');
        setFormPriority('important');
        setFormTitle('Special Campaign Ministry Announcement');
        setFormContent(
          'During our upcoming special campaign, we will have increased group witnessing arrangements and territory coverage drives. Contact your group overseer for details!'
        );
        break;
      case 'group_meeting':
        setFormScope('service_group');
        if (!formServiceGroupId && groups.length > 0) {
          setFormServiceGroupId(groups[0].id);
        }
        setFormCategory('general');
        setFormPriority('normal');
        setFormTitle('Saturday Field Service Meeting Arrangement');
        setFormContent(
          'Hi brothers and sisters,\n\n• **Meeting Location**: We will meet at the designated group location at 9:00 AM.\n• **Territories**: We will work the assigned group residential maps.\n• **Car Arrangements**: Please let us know if you need or can provide transportation!'
        );
        break;
      case 'feature_update':
        setFormScope('system');
        setFormCategory('feature_update');
        setFormPriority('normal');
        setFormTitle('New App Features & Improvements Available');
        setFormContent(
          'We have updated the Kanataran platform with new enhancements! Explore the latest tools including audio feedback, offline sync, map boundary annotations, and territory reporting.'
        );
        break;
      case 'maintenance':
        setFormScope('system');
        setFormCategory('maintenance');
        setFormPriority('important');
        setFormTitle('Scheduled System Maintenance Notice');
        setFormContent(
          'Please note that system maintenance is scheduled to optimize server performance and cloud backups. The app will remain available in offline mode during this window.'
        );
        break;
      case 'bug_fix':
        setFormScope('system');
        setFormCategory('bug_fix');
        setFormPriority('normal');
        setFormTitle('Resolved Issue / System Update');
        setFormContent(
          'A recently reported issue affecting territory map loading and household note updates has been resolved. Thank you for your feedback!'
        );
        break;
    }
  };

  const handleSaveAnnouncement = async () => {
    if (!formTitle.trim()) {
      Alert.alert('Required Field', 'Please enter an announcement title.');
      return;
    }
    if (!formContent.trim()) {
      Alert.alert('Required Field', 'Please enter the announcement message content.');
      return;
    }
    if (formScope === 'service_group' && !formServiceGroupId && groups.length > 0) {
      Alert.alert('Required Field', 'Please select a Field Service Group.');
      return;
    }

    try {
      setIsSubmitting(true);
      const selectedGroup = groups.find((g) => g.id === formServiceGroupId);

      if (editingAnnouncement) {
        await updateAnnouncement(editingAnnouncement.id, {
          scope: formScope,
          serviceGroupId: formScope === 'service_group' ? formServiceGroupId || null : null,
          serviceGroupName: formScope === 'service_group' ? selectedGroup?.name || null : null,
          category: formCategory,
          priority: formPriority,
          title: formTitle.trim(),
          content: formContent.trim(),
          isPinned: formIsPinned,
          actionUrl: formActionUrl.trim() || null,
        });
        await triggerHaptic('success');
      } else {
        await createAnnouncement({
          scope: formScope,
          congregationId: formScope === 'system' ? null : activeCongregationId,
          congregationName: formScope === 'system' ? null : congregation?.name || null,
          serviceGroupId: formScope === 'service_group' ? formServiceGroupId || null : null,
          serviceGroupName: formScope === 'service_group' ? selectedGroup?.name || null : null,
          title: formTitle.trim(),
          content: formContent.trim(),
          category: formCategory,
          priority: formPriority,
          isPinned: formIsPinned,
          actionUrl: formActionUrl.trim() || null,
        });
        await triggerHaptic('success');
      }
      setModalVisible(false);
    } catch (e: any) {
      triggerHaptic('error');
      Alert.alert('Error', e.message || 'Failed to save announcement.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const categories: { label: string; value: string }[] = [
    { label: 'All', value: 'all' },
    { label: 'Service Year', value: 'service_year' },
    { label: 'Feature Updates', value: 'feature_update' },
    { label: 'Campaigns', value: 'campaign' },
    { label: 'Maintenance', value: 'maintenance' },
    { label: 'Bug Fixes', value: 'bug_fix' },
    { label: 'General', value: 'general' },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header
        showBack
        title="Announcements"
        subtitle={
          congregation
            ? `${congregation.name} • ${announcements.length} notices`
            : `${announcements.length} notices`
        }
        rightAction={
          canPostAny ? (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => handleOpenCreateModal()}
              style={[
                styles.headerAddBtn,
                { backgroundColor: colors.primary },
              ]}
            >
              <Plus size={18} color="#ffffff" />
              <Text style={styles.headerAddText}>Post</Text>
            </TouchableOpacity>
          ) : null
        }
      />

      {/* Main Tabs (All / Congregation / System) */}
      <View style={[styles.tabsContainer, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsRow}>
          {[
            { key: 'all', label: 'All Notices', count: announcements.length },
            { key: 'congregation', label: 'Congregation', count: congregationAnnouncements.length },
            { key: 'service_group', label: 'Service Groups', count: serviceGroupAnnouncements.length },
            { key: 'system', label: 'System Wide', count: systemAnnouncements.length },
          ].map((tab) => {
            const isSelected = activeTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                onPress={() => {
                  triggerHaptic('light');
                  setActiveTab(tab.key as TabFilter);
                }}
                style={[
                  styles.tabButton,
                  isSelected && { borderBottomColor: colors.primary, borderBottomWidth: 2.5 },
                ]}
              >
                <Text
                  style={[
                    styles.tabButtonText,
                    {
                      color: isSelected ? colors.primary : colors.mutedForeground,
                      fontWeight: isSelected ? '700' : '500',
                      fontSize: typography.xs + 1,
                    },
                  ]}
                >
                  {tab.label}
                </Text>
                {tab.count > 0 && (
                  <View
                    style={[
                      styles.tabBadge,
                      { backgroundColor: isSelected ? `${colors.primary}20` : colors.muted },
                    ]}
                  >
                    <Text
                      style={[
                        styles.tabBadgeText,
                        { color: isSelected ? colors.primary : colors.mutedForeground },
                      ]}
                    >
                      {tab.count}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Search & Category Filter Pills */}
        <View style={{ paddingHorizontal: spacing.md, paddingBottom: spacing.sm }}>
          <View style={[styles.searchBox, { backgroundColor: colors.muted, borderRadius: radius.md }]}>
            <Search size={16} color={colors.mutedForeground} />
            <TextInput
              placeholder="Search announcements..."
              placeholderTextColor={colors.mutedForeground}
              value={searchQuery}
              onChangeText={setSearchQuery}
              style={[styles.searchInput, { color: colors.foreground, fontSize: typography.xs + 1 }]}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <X size={16} color={colors.mutedForeground} />
              </TouchableOpacity>
            )}
          </View>

          {/* Horizontal Category Scroll */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 6, paddingTop: 8 }}
          >
            {categories.map((c) => {
              const isSelected = categoryFilter === c.value;
              return (
                <TouchableOpacity
                  key={c.value}
                  onPress={() => {
                    triggerHaptic('light');
                    setCategoryFilter(c.value);
                  }}
                  style={[
                    styles.categoryChip,
                    {
                      backgroundColor: isSelected ? colors.primary : colors.card,
                      borderColor: isSelected ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <Text
                    style={{
                      color: isSelected ? '#ffffff' : colors.foreground,
                      fontSize: 11,
                      fontWeight: isSelected ? '700' : '500',
                    }}
                  >
                    {c.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </View>

      {/* Announcements List */}
      {isLoading ? (
        <NotificationsSkeleton />
      ) : filteredAnnouncements.length === 0 ? (
        <ScrollView
          contentContainerStyle={{
            padding: spacing.md,
            paddingBottom: insets.bottom + spacing.xxl,
          }}
        >
          {/* Show service year suggestion if applicable */}
          {canPostCong && primarySuggestion && (
            <ServiceYearAnnouncementSuggestion
              suggestion={primarySuggestion}
              onUseSuggestion={handleOpenCreateModal}
            />
          )}

          <EmptyState
            icon={<Bell size={44} color={colors.mutedForeground} />}
            title="No Announcements Found"
            description="There are currently no active announcements matching your selected filters."
            actionTitle={canPostAny ? 'Create Announcement' : undefined}
            onActionPress={canPostAny ? () => handleOpenCreateModal() : undefined}
          />
        </ScrollView>
      ) : (
        <FlatList
          data={filteredAnnouncements}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{
            padding: spacing.md,
            paddingBottom: insets.bottom + spacing.xxl,
          }}
          ListHeaderComponent={() => (
            <>
              {/* Show service year suggestion banner for Overseers & Secretaries */}
              {canPostCong && primarySuggestion && (
                <ServiceYearAnnouncementSuggestion
                  suggestion={primarySuggestion}
                  onUseSuggestion={handleOpenCreateModal}
                />
              )}
            </>
          )}
          renderItem={({ item }) => (
            <View style={{ marginBottom: spacing.md }}>
              <AnnouncementCard
                announcement={item}
                onEdit={handleOpenEditModal}
                onDelete={deleteAnnouncement}
                onTogglePin={togglePin}
              />
            </View>
          )}
        />
      )}

      {/* Create / Edit Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <Card style={[styles.modalCard, { width: '92%', maxHeight: '88%' }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text
                  style={[
                    styles.modalTitle,
                    { color: colors.foreground, fontSize: typography.lg },
                  ]}
                >
                  {editingAnnouncement ? 'Edit Announcement' : 'New Announcement'}
                </Text>
                <Text style={{ color: colors.mutedForeground, fontSize: typography.xs, marginTop: 2 }}>
                  Post an official notice for the congregation or system
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <X size={20} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingVertical: spacing.sm }}
            >
              {/* Scope Selector */}
              <Text style={[styles.inputLabel, { color: colors.foreground, fontSize: typography.xs }]}>
                TARGET AUDIENCE & SCOPE *
              </Text>
              <View style={{ flexDirection: 'row', gap: 6, marginBottom: spacing.md }}>
                <TouchableOpacity
                  onPress={() => {
                    triggerHaptic('light');
                    setFormScope('congregation');
                  }}
                  style={[
                    styles.scopeButton,
                    {
                      borderColor: formScope === 'congregation' ? colors.primary : colors.border,
                      backgroundColor:
                        formScope === 'congregation' ? `${colors.primary}15` : colors.card,
                    },
                  ]}
                >
                  <Building2
                    size={14}
                    color={formScope === 'congregation' ? colors.primary : colors.mutedForeground}
                  />
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: formScope === 'congregation' ? '700' : '500',
                      color: formScope === 'congregation' ? colors.primary : colors.foreground,
                    }}
                  >
                    Congregation
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    triggerHaptic('light');
                    setFormScope('service_group');
                    if (!formServiceGroupId && groups.length > 0) {
                      setFormServiceGroupId(groups[0].id);
                    }
                  }}
                  style={[
                    styles.scopeButton,
                    {
                      borderColor: formScope === 'service_group' ? '#10b981' : colors.border,
                      backgroundColor:
                        formScope === 'service_group' ? '#10b98118' : colors.card,
                    },
                  ]}
                >
                  <Users
                    size={14}
                    color={formScope === 'service_group' ? '#10b981' : colors.mutedForeground}
                  />
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: formScope === 'service_group' ? '700' : '500',
                      color: formScope === 'service_group' ? '#10b981' : colors.foreground,
                    }}
                  >
                    Service Group
                  </Text>
                </TouchableOpacity>

                {canPostSys && (
                  <TouchableOpacity
                    onPress={() => {
                      triggerHaptic('light');
                      setFormScope('system');
                    }}
                    style={[
                      styles.scopeButton,
                      {
                        borderColor: formScope === 'system' ? '#8b5cf6' : colors.border,
                        backgroundColor:
                          formScope === 'system' ? '#8b5cf618' : colors.card,
                      },
                    ]}
                  >
                    <Globe
                      size={14}
                      color={formScope === 'system' ? '#8b5cf6' : colors.mutedForeground}
                    />
                    <Text
                      style={{
                        fontSize: 11,
                        fontWeight: formScope === 'system' ? '700' : '500',
                        color: formScope === 'system' ? '#8b5cf6' : colors.foreground,
                      }}
                    >
                      System
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Service Group Picker when scope is service_group */}
              {formScope === 'service_group' && (
                <View
                  style={{
                    marginBottom: spacing.md,
                    padding: spacing.sm,
                    backgroundColor: '#10b98110',
                    borderRadius: radius.md,
                    borderWidth: 1,
                    borderColor: '#10b98135',
                  }}
                >
                  <Text
                    style={{
                      fontSize: typography.xs - 1,
                      fontWeight: '800',
                      color: '#10b981',
                      marginBottom: 6,
                      textTransform: 'uppercase',
                    }}
                  >
                    Select Service Group *
                  </Text>
                  {groups.length > 0 ? (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                      {groups.map((g) => {
                        const isSel = formServiceGroupId === g.id;
                        return (
                          <TouchableOpacity
                            key={g.id}
                            onPress={() => {
                              triggerHaptic('light');
                              setFormServiceGroupId(g.id);
                            }}
                            style={{
                              paddingHorizontal: 12,
                              paddingVertical: 7,
                              borderRadius: 8,
                              borderWidth: 1.2,
                              borderColor: isSel ? '#10b981' : colors.border,
                              backgroundColor: isSel ? '#10b981' : colors.card,
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 11,
                                fontWeight: '700',
                                color: isSel ? '#ffffff' : colors.foreground,
                              }}
                            >
                              {g.name}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  ) : (
                    <Text
                      style={{
                        fontSize: typography.xs,
                        color: colors.mutedForeground,
                        fontStyle: 'italic',
                      }}
                    >
                      No service groups found in this congregation.
                    </Text>
                  )}
                </View>
              )}

              {/* Template Quick Actions (for new announcements) */}
              {!editingAnnouncement && (
                <View style={{ marginBottom: spacing.md }}>
                  <Text
                    style={[
                      styles.inputLabel,
                      { color: colors.mutedForeground, fontSize: typography.xs - 1 },
                    ]}
                  >
                    QUICK TEMPLATES (OPTIONAL)
                  </Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ gap: 6, marginTop: 4 }}
                  >
                    <TouchableOpacity
                      onPress={() => handleApplyTemplate('sy_kickoff')}
                      style={[styles.templateChip, { borderColor: `${colors.primary}40`, backgroundColor: `${colors.primary}10` }]}
                    >
                      <Sparkles size={11} color={colors.primary} />
                      <Text style={{ fontSize: 11, fontWeight: '700', color: colors.primary }}>
                        SY Kickoff
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => handleApplyTemplate('sy_closing')}
                      style={[styles.templateChip, { borderColor: `${colors.destructive}40`, backgroundColor: `${colors.destructive}10` }]}
                    >
                      <Calendar size={11} color={colors.destructive} />
                      <Text style={{ fontSize: 11, fontWeight: '700', color: colors.destructive }}>
                        Year-End Closing
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => handleApplyTemplate('campaign')}
                      style={[styles.templateChip, { borderColor: '#f9731640', backgroundColor: '#f9731610' }]}
                    >
                      <Flame size={11} color="#f97316" />
                      <Text style={{ fontSize: 11, fontWeight: '700', color: '#f97316' }}>
                        Special Campaign
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => handleApplyTemplate('group_meeting')}
                      style={[styles.templateChip, { borderColor: '#10b98140', backgroundColor: '#10b98115' }]}
                    >
                      <Users size={11} color="#10b981" />
                      <Text style={{ fontSize: 11, fontWeight: '700', color: '#10b981' }}>
                        Group Meeting
                      </Text>
                    </TouchableOpacity>

                    {canPostSys && (
                      <>
                        <TouchableOpacity
                          onPress={() => handleApplyTemplate('feature_update')}
                          style={[styles.templateChip, { borderColor: '#8b5cf640', backgroundColor: '#8b5cf610' }]}
                        >
                          <Sparkles size={11} color="#8b5cf6" />
                          <Text style={{ fontSize: 11, fontWeight: '700', color: '#8b5cf6' }}>
                            Feature Update
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          onPress={() => handleApplyTemplate('maintenance')}
                          style={[styles.templateChip, { borderColor: `${colors.warning}40`, backgroundColor: `${colors.warning}10` }]}
                        >
                          <Wrench size={11} color={colors.warning} />
                          <Text style={{ fontSize: 11, fontWeight: '700', color: colors.warning }}>
                            Maintenance
                          </Text>
                        </TouchableOpacity>
                      </>
                    )}
                  </ScrollView>
                </View>
              )}

              {/* Category Selector */}
              <Text style={[styles.inputLabel, { color: colors.foreground, fontSize: typography.xs }]}>
                CATEGORY *
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 6, marginBottom: spacing.md }}
              >
                {(
                  [
                    'general',
                    'service_year',
                    'campaign',
                    'feature_update',
                    'maintenance',
                    'bug_fix',
                    'urgent',
                  ] as AnnouncementCategory[]
                ).map((cat) => {
                  const isSelected = formCategory === cat;
                  return (
                    <TouchableOpacity
                      key={cat}
                      onPress={() => {
                        triggerHaptic('light');
                        setFormCategory(cat);
                      }}
                      style={[
                        styles.categorySelectChip,
                        {
                          borderColor: isSelected ? colors.primary : colors.border,
                          backgroundColor: isSelected ? `${colors.primary}18` : colors.card,
                        },
                      ]}
                    >
                      <Text
                        style={{
                          fontSize: 11,
                          fontWeight: isSelected ? '700' : '500',
                          color: isSelected ? colors.primary : colors.foreground,
                          textTransform: 'capitalize',
                        }}
                      >
                        {cat.replace('_', ' ')}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Priority Selector */}
              <Text style={[styles.inputLabel, { color: colors.foreground, fontSize: typography.xs }]}>
                PRIORITY *
              </Text>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: spacing.md }}>
                {(['normal', 'important', 'urgent'] as AnnouncementPriority[]).map((p) => {
                  const isSelected = formPriority === p;
                  const activeColor =
                    p === 'urgent' ? colors.destructive : p === 'important' ? colors.warning : colors.primary;
                  return (
                    <TouchableOpacity
                      key={p}
                      onPress={() => {
                        triggerHaptic('light');
                        setFormPriority(p);
                      }}
                      style={[
                        styles.priorityPill,
                        {
                          borderColor: isSelected ? activeColor : colors.border,
                          backgroundColor: isSelected ? `${activeColor}18` : colors.card,
                        },
                      ]}
                    >
                      <Text
                        style={{
                          fontSize: 11,
                          fontWeight: isSelected ? '700' : '500',
                          color: isSelected ? activeColor : colors.foreground,
                          textTransform: 'capitalize',
                        }}
                      >
                        {p}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Title Input */}
              <Input
                label="Announcement Title *"
                placeholder="e.g. Welcome to the 2026–2027 Service Year"
                value={formTitle}
                onChangeText={setFormTitle}
              />

              {/* Message Content with Markdown & Rich Text Tools */}
              <Text
                style={[
                  styles.inputLabel,
                  { color: colors.foreground, fontSize: typography.xs, marginTop: spacing.sm },
                ]}
              >
                ANNOUNCEMENT MESSAGE (MARKDOWN READY) *
              </Text>

              <MarkdownToolbar
                value={formContent}
                onChange={setFormContent}
                activeTab={composerTab}
                onTabChange={setComposerTab}
              />

              {composerTab === 'write' ? (
                <TextInput
                  multiline
                  numberOfLines={6}
                  placeholder="Write the details, instructions, or goals using markdown (**bold**, • lists, # headings)..."
                  placeholderTextColor={colors.mutedForeground}
                  value={formContent}
                  onChangeText={setFormContent}
                  style={[
                    styles.textArea,
                    {
                      color: colors.foreground,
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                      fontSize: typography.sm,
                    },
                  ]}
                />
              ) : (
                <View
                  style={{
                    minHeight: 120,
                    padding: spacing.sm,
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: colors.border,
                    backgroundColor: `${colors.primary}05`,
                  }}
                >
                  {formContent.trim() ? (
                    <MarkdownRenderer content={formContent} />
                  ) : (
                    <Text
                      style={{
                        color: colors.mutedForeground,
                        fontStyle: 'italic',
                        fontSize: typography.xs,
                        textAlign: 'center',
                        marginTop: spacing.md,
                      }}
                    >
                      Nothing to preview yet. Switch to Write tab to add content.
                    </Text>
                  )}
                </View>
              )}

              {/* Optional Link URL */}
              <View style={{ marginTop: spacing.sm }}>
                <Input
                  label="Action Link (Optional URL)"
                  placeholder="https://example.com/details"
                  autoCapitalize="none"
                  keyboardType="url"
                  value={formActionUrl}
                  onChangeText={setFormActionUrl}
                  icon={<Link size={16} color={colors.mutedForeground} />}
                />
              </View>

              {/* Pin Switch */}
              <View style={[styles.switchRow, { borderColor: colors.border, marginTop: spacing.sm }]}>
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <Text style={{ fontWeight: '700', color: colors.foreground, fontSize: typography.sm }}>
                    Pin to Top of Notices
                  </Text>
                  <Text style={{ color: colors.mutedForeground, fontSize: typography.xs, marginTop: 2 }}>
                    Displays this announcement at the top of publishers' feeds
                  </Text>
                </View>
                <Switch
                  value={formIsPinned}
                  onValueChange={(val) => {
                    triggerHaptic('light');
                    setFormIsPinned(val);
                  }}
                  trackColor={{ false: colors.muted, true: colors.primary }}
                />
              </View>
            </ScrollView>

            {/* Fixed Action Footer */}
            <View
              style={{
                flexDirection: 'row',
                gap: 10,
                paddingTop: spacing.sm,
                borderTopWidth: 1,
                borderTopColor: colors.border,
                backgroundColor: colors.card,
              }}
            >
              <Button
                title="Cancel"
                variant="ghost"
                onPress={() => setModalVisible(false)}
                style={{ flex: 1 }}
              />
              <Button
                title={editingAnnouncement ? 'Update Announcement' : 'Publish Notice'}
                variant="primary"
                loading={isSubmitting}
                onPress={handleSaveAnnouncement}
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
  headerAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  headerAddText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 12,
  },
  tabsContainer: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tabsRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 10,
    marginRight: 6,
    gap: 6,
  },
  tabButtonText: {},
  tabBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
  },
  tabBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    height: 36,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 0,
  },
  categoryChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCard: {
    padding: 18,
    borderRadius: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#88888830',
    paddingBottom: 10,
    marginBottom: 6,
  },
  modalTitle: {
    fontWeight: '800',
  },
  inputLabel: {
    fontWeight: '700',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  scopeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.2,
    gap: 6,
  },
  templateChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
  },
  categorySelectChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  priorityPill: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    minHeight: 110,
    textAlignVertical: 'top',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
