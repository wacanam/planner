'use client';

import {
  BookOpen,
  Calendar,
  Clock,
  Home,
  Pencil,
  Search,
  Trash2,
  UserPlus,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { AddEncounterForm } from '@/components/households/add-encounter-form';
import { EditVisitForm } from '@/components/households/edit-visit-form';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { ResponsiveDialog } from '@/components/shared/responsive-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  useCongregationGroups,
  useCongregationMembers,
  useCurrentUser,
  useGroupMateUserIds,
  useKeyboardShortcuts,
  useMyEncounters,
  useMyVisits,
} from '@/hooks';
import {
  canDeleteVisit,
  canEditVisit,
  canLogVisitOrEncounter,
  canViewAllCongregationRecords,
} from '@/lib/permissions';
import { formatDate } from '@/lib/date-utils';
import { deleteVisitRecord, saveEncounterRecord, updateVisitRecord } from '@/lib/record-writes';
import { normalizeVisitOutcome } from '@/lib/status-rules';
import { timeAgo } from '@/lib/time-ago';
import type { Encounter, Visit } from '@/types/api';

const outcomeColors: Record<string, string> = {
  answered: 'text-green-700 border-green-200 bg-green-50 dark:bg-green-950/40 dark:text-green-400',
  not_home: 'text-amber-700 border-amber-200 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-400',
  busy: 'text-orange-700 border-orange-200 bg-orange-50 dark:bg-orange-950/40 dark:text-orange-400',
  return_visit:
    'text-blue-700 border-blue-200 bg-blue-50 dark:bg-blue-950/40 dark:text-blue-400',
  return_visit_completed:
    'text-blue-700 border-blue-200 bg-blue-50 dark:bg-blue-950/40 dark:text-blue-400',
  return_visit_missed:
    'text-amber-700 border-amber-200 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-400',
  study_conducted:
    'text-violet-700 border-violet-200 bg-violet-50 dark:bg-violet-950/40 dark:text-violet-400',
  study_offered:
    'text-purple-700 border-purple-200 bg-purple-50 dark:bg-purple-950/40 dark:text-purple-400',
  study_missed:
    'text-pink-700 border-pink-200 bg-pink-50 dark:bg-pink-950/40 dark:text-pink-400',
  literature_placed:
    'text-teal-700 border-teal-200 bg-teal-50 dark:bg-teal-950/40 dark:text-teal-400',
  minor_only:
    'text-indigo-700 border-indigo-200 bg-indigo-50 dark:bg-indigo-950/40 dark:text-indigo-400',
  foreign_language:
    'text-cyan-700 border-cyan-200 bg-cyan-50 dark:bg-cyan-950/40 dark:text-cyan-400',
  inaccessible:
    'text-stone-700 border-stone-200 bg-stone-50 dark:bg-stone-950/40 dark:text-stone-400',
  vacant: 'text-slate-700 border-slate-200 bg-slate-50 dark:bg-slate-950/40 dark:text-slate-400',
  do_not_visit: 'text-red-700 border-red-200 bg-red-50 dark:bg-red-950/40 dark:text-red-400',
  moved: 'text-muted-foreground border-border bg-muted/30',
  other: 'text-muted-foreground border-border bg-muted/30',
};

const responseColors: Record<string, string> = {
  receptive: 'text-green-700 border-green-200 bg-green-50 dark:bg-green-950/40 dark:text-green-400',
  study_accepted:
    'text-violet-700 border-violet-200 bg-violet-50 dark:bg-violet-950/40 dark:text-violet-400',
  neutral: 'text-blue-700 border-blue-200 bg-blue-50 dark:bg-blue-950/40 dark:text-blue-400',
  busy: 'text-orange-700 border-orange-200 bg-orange-50 dark:bg-orange-950/40 dark:text-orange-400',
  foreign_language:
    'text-cyan-700 border-cyan-200 bg-cyan-50 dark:bg-cyan-950/40 dark:text-cyan-400',
  not_interested:
    'text-amber-700 border-amber-200 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-400',
  hostile: 'text-red-700 border-red-200 bg-red-50 dark:bg-red-950/40 dark:text-red-400',
  do_not_visit: 'text-red-700 border-red-200 bg-red-50 dark:bg-red-950/40 dark:text-red-400',
  moved: 'text-muted-foreground border-border bg-muted/30',
};

export default function VisitsClient() {
  const params = useParams();
  const congregationId = (params?.id as string) || '';
  const { user } = useCurrentUser();
  const { groups = [] } = useCongregationGroups(congregationId);
  const { data: members = [] } = useCongregationMembers(congregationId);
  const groupMateUserIds = useGroupMateUserIds(
    congregationId,
    user,
    user?.role,
    user?.congregationRole,
    members
  );

  type RecordScope = 'mine' | 'group' | 'congregation';
  const [recordScope, setRecordScope] = useState<RecordScope>('mine');
  const [publisherFilter, setPublisherFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [outcomeFilter, setOutcomeFilter] = useState<string>('all');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [addEncounterVisit, setAddEncounterVisit] = useState<Visit | null>(null);
  const [savingEncounter, setSavingEncounter] = useState(false);
  const [editVisit, setEditVisit] = useState<Visit | null>(null);
  const [editingVisit, setEditingVisit] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const canViewCongregation = useMemo(() => {
    return canViewAllCongregationRecords(user?.role, user?.congregationRole);
  }, [user?.role, user?.congregationRole]);

  const hasGroup = useMemo(() => {
    return Boolean(groupMateUserIds && groupMateUserIds.size > 0);
  }, [groupMateUserIds]);

  const availableScopes: { id: RecordScope; label: string; icon: string }[] = useMemo(() => {
    const list: { id: RecordScope; label: string; icon: string }[] = [
      { id: 'mine', label: 'My Visits', icon: '★' },
    ];
    if (hasGroup || canViewCongregation) {
      list.push({ id: 'group', label: 'My Group', icon: '👥' });
    }
    if (canViewCongregation) {
      list.push({ id: 'congregation', label: 'All Congregation', icon: '🏛️' });
    }
    return list;
  }, [hasGroup, canViewCongregation]);

  const {
    visits = [],
    households = [],
    isLoading,
  } = useMyVisits({
    congregationId,
    userId: user?.id,
    userRole: user?.role,
    congregationRole: user?.congregationRole,
    scope: recordScope,
    publisherId: publisherFilter !== 'all' ? publisherFilter : null,
    groupMateUserIds,
  });

  const availablePublishers = useMemo(() => {
    const map = new Map<string, string>();

    // 1. From members
    for (const m of members) {
      const uid = m.userId || m.id;
      if (!uid) continue;
      if (recordScope === 'group' && !groupMateUserIds.has(uid)) continue;
      const name = m.user?.name || m.user?.email || 'Publisher';
      map.set(uid, name);
    }

    // 2. From groups if group scope
    if (recordScope === 'group') {
      for (const g of groups) {
        if (g.overseerId && groupMateUserIds.has(g.overseerId) && !map.has(g.overseerId)) {
          map.set(g.overseerId, g.overseerName || 'Group Overseer');
        }
        if (
          g.assistantOverseerId &&
          groupMateUserIds.has(g.assistantOverseerId) &&
          !map.has(g.assistantOverseerId)
        ) {
          map.set(g.assistantOverseerId, g.assistantOverseerName || 'Assistant Overseer');
        }
        for (const gm of g.members || []) {
          const uid = gm.userId || gm.id;
          if (uid && groupMateUserIds.has(uid) && !map.has(uid)) {
            map.set(uid, gm.user?.name || gm.user?.email || 'Publisher');
          }
        }
      }
    }

    // Ensure current user is in map if in group scope or congregation scope
    if (user?.id && !map.has(user.id)) {
      if (recordScope !== 'group' || groupMateUserIds.has(user.id)) {
        map.set(user.id, user.name || 'You');
      }
    }

    return Array.from(map.entries())
      .map(([id, name]) => ({
        id,
        name: id === user?.id ? `${name} (You)` : name,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [members, groups, recordScope, groupMateUserIds, user]);

  const { encounters = [] } = useMyEncounters({
    congregationId,
    userId: user?.id,
    userRole: user?.role,
    congregationRole: user?.congregationRole,
    scope: recordScope,
    publisherId: publisherFilter !== 'all' ? publisherFilter : null,
    groupMateUserIds,
  });

  // Group encounters by visitId
  const encountersByVisit = useMemo(() => {
    const map = new Map<string, Encounter[]>();
    for (const enc of encounters) {
      if (enc.visitId) {
        const list = map.get(enc.visitId) ?? [];
        list.push(enc);
        map.set(enc.visitId, list);
      }
    }
    return map;
  }, [encounters]);

  const filtered = useMemo(() => {
    let list = visits;
    if (outcomeFilter !== 'all') {
      const normFilter = normalizeVisitOutcome(outcomeFilter);
      list = list.filter((v) => normalizeVisitOutcome(v.outcome) === normFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (v) =>
          v.householdAddress?.toLowerCase().includes(q) ||
          v.householdCity?.toLowerCase().includes(q) ||
          v.streetName?.toLowerCase().includes(q) ||
          v.notes?.toLowerCase().includes(q) ||
          v.bibleTopicDiscussed?.toLowerCase().includes(q) ||
          v.literaturePlaced?.toLowerCase().includes(q) ||
          v.literatureLeft?.toLowerCase().includes(q) ||
          v.publisherName?.toLowerCase().includes(q)
      );
    }

    return [...list].sort((a, b) => {
      const aMine = a.userId === user?.id;
      const bMine = b.userId === user?.id;
      if (aMine && !bMine) return -1;
      if (!aMine && bMine) return 1;
      return b.visitDate.localeCompare(a.visitDate);
    });
  }, [visits, outcomeFilter, search, user?.id]);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteVisitRecord(id);
      setDeleteConfirmId(null);
      toast.success('Visit record deleted');
    } catch (_err) {
      toast.error('Failed to delete visit');
    } finally {
      setDeletingId(null);
    }
  };

  const handleUpdateVisit = async (values: any) => {
    if (!editVisit) return;
    setEditingVisit(true);
    try {
      await updateVisitRecord(editVisit.id, values);
      setEditVisit(null);
      toast.success('Visit record updated');
    } catch (_err) {
      toast.error('Failed to update visit');
    } finally {
      setEditingVisit(false);
    }
  };

  const handleCreateEncounter = async (values: any) => {
    if (!addEncounterVisit) return;
    setSavingEncounter(true);
    try {
      await saveEncounterRecord({
        ...values,
        congregationId,
        visitId: addEncounterVisit.id,
        householdId: addEncounterVisit.householdId,
        userId: user?.id || null,
      });
      setAddEncounterVisit(null);
      toast.success('Encounter logged');
    } catch (_err) {
      toast.error('Failed to log encounter');
    } finally {
      setSavingEncounter(false);
    }
  };

  const selectedVisit =
    selectedIndex >= 0 && selectedIndex < filtered.length ? filtered[selectedIndex] : null;

  useKeyboardShortcuts([
    {
      key: ['m', 'M'],
      handler: () => {
        setRecordScope('mine');
        setPublisherFilter('all');
      },
    },
    {
      key: ['g', 'G'],
      handler: () => {
        if (availableScopes.some((s) => s.id === 'group')) {
          setRecordScope('group');
          setPublisherFilter('all');
        }
      },
    },
    {
      key: ['c', 'C'],
      handler: () => {
        if (availableScopes.some((s) => s.id === 'congregation')) {
          setRecordScope('congregation');
          setPublisherFilter('all');
        }
      },
    },
    {
      key: ['/', 'Mod+k'],
      handler: () => {
        searchInputRef.current?.focus();
      },
    },
    {
      key: ['j', 'J', 'ArrowDown'],
      handler: () => {
        setSelectedIndex((prev) => Math.min(filtered.length - 1, prev + 1));
      },
    },
    {
      key: ['k', 'K', 'ArrowUp'],
      handler: () => {
        setSelectedIndex((prev) => Math.max(0, prev - 1));
      },
    },
    {
      key: ['e', 'E', 'Enter'],
      handler: () => {
        if (selectedVisit) {
          const household = households.find((h) => h.id === selectedVisit.householdId);
          if (canEditVisit(user, selectedVisit, household)) {
            setEditVisit(selectedVisit);
          }
        }
      },
    },
    {
      key: ['n', 'N', '+'],
      handler: () => {
        if (selectedVisit) {
          const household = households.find((h) => h.id === selectedVisit.householdId);
          if (canLogVisitOrEncounter(user, household)) {
            setAddEncounterVisit(selectedVisit);
          }
        }
      },
    },
    {
      key: ['Delete', 'Backspace'],
      handler: () => {
        if (selectedVisit) {
          const household = households.find((h) => h.id === selectedVisit.householdId);
          if (canDeleteVisit(user, selectedVisit, household)) {
            setDeleteConfirmId(selectedVisit.id);
          }
        }
      },
    },
    {
      key: 'Escape',
      handler: () => {
        if (search) setSearch('');
        searchInputRef.current?.blur();
        setSelectedIndex(-1);
      },
    },
  ]);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 min-w-0 w-full">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-foreground">
          {recordScope === 'mine'
            ? 'My Visits History'
            : recordScope === 'group'
              ? 'Group Visits History'
              : 'Congregation Visits History'}
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          {recordScope === 'mine'
            ? 'Your personal conversation logs and field ministry visits'
            : recordScope === 'group'
              ? 'Visits logged across your service group'
              : 'Chronological door-to-door conversation logs and returns'}
        </p>
      </div>

      {/* Role-Aware Scope Switcher Pills */}
      {availableScopes.length > 1 && (
        <div className="flex items-center gap-2 border-b border-border pb-3 flex-wrap">
          {availableScopes.map((scope) => {
            const isSelected = recordScope === scope.id;
            return (
              <button
                key={scope.id}
                type="button"
                onClick={() => {
                  setRecordScope(scope.id);
                  setPublisherFilter('all');
                }}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                  isSelected
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground border border-border'
                }`}
              >
                <span>{scope.icon}</span>
                <span>{scope.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Search & Filters */}
      <div className="flex gap-2 flex-wrap items-center">
        <div className="relative flex-1 min-w-[220px]">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            ref={searchInputRef}
            placeholder="Search by address, street, city, notes, topic, publisher… (/)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-9 rounded-xl text-xs bg-card"
          />
        </div>

        {recordScope !== 'mine' && (
          <select
            value={publisherFilter}
            onChange={(e) => setPublisherFilter(e.target.value)}
            className="rounded-xl border border-input bg-background px-3 py-2 text-xs text-foreground h-9 font-medium"
          >
            <option value="all">All Publishers</option>
            {availablePublishers.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        )}

        <select
          value={outcomeFilter}
          onChange={(e) => setOutcomeFilter(e.target.value)}
          className="rounded-xl border border-input bg-background px-3 py-2 text-xs text-foreground h-9 font-medium"
        >
          <option value="all">All Outcomes</option>
          <option value="answered">Answered / Conversation</option>
          <option value="return_visit_completed">Return Visit (Visited / Completed)</option>
          <option value="return_visit_missed">Return Visit Missed</option>
          <option value="study_conducted">Bible Study Conducted</option>
          <option value="study_offered">Bible Study Offered</option>
          <option value="study_missed">Bible Study Missed</option>
          <option value="literature_placed">Literature Placed</option>
          <option value="not_home">Not Home</option>
          <option value="busy">Busy / Call Back</option>
          <option value="minor_only">Minor / Youth Only</option>
          <option value="foreign_language">Foreign Language</option>
          <option value="inaccessible">Inaccessible / Gated</option>
          <option value="vacant">Vacant / Unoccupied</option>
          <option value="do_not_visit">Do Not Visit</option>
          <option value="moved">Moved Away</option>
          <option value="other">Other Outcome</option>
        </select>
      </div>

      {/* Visits List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-muted animate-pulse rounded-2xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center bg-card border border-border rounded-3xl p-6">
          <Clock size={40} className="text-muted-foreground/30 mb-3" />
          <p className="text-sm font-semibold text-foreground">No visits logged</p>
          <p className="text-xs text-muted-foreground mt-1">
            Visits logged from households will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((v, idx) => {
            const linkedEncounters = encountersByVisit.get(v.id) ?? [];
            const household = households.find((h) => h.id === v.householdId);
            const isFocused = selectedIndex === idx;

            return (
              <Card
                key={v.id}
                onClick={() => setSelectedIndex(idx)}
                className={`bg-card border-border shadow-xs hover:border-primary/40 transition-all ${
                  isFocused
                    ? 'ring-2 ring-primary border-primary bg-primary/5 dark:bg-primary/10'
                    : ''
                }`}
              >
                <CardContent className="p-4 sm:p-5 flex flex-col justify-between gap-3.5">
                  <div className="min-w-0 flex-1 space-y-1.5">
                    {/* Household Details */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link
                        href={
                          v.householdId
                            ? `/congregation/${congregationId}/records/households/${v.householdId}`
                            : `/congregation/${congregationId}/records/households?search=${encodeURIComponent(v.streetName || household?.streetName || v.householdAddress || '')}`
                        }
                        className="font-bold text-sm text-foreground hover:text-primary transition-colors flex items-center gap-1.5"
                      >
                        <Home size={14} className="text-primary shrink-0" />
                        <span>
                          {v.houseNumber ? `#${v.houseNumber} ` : ''}
                          {v.streetName ||
                            household?.streetName ||
                            v.householdAddress ||
                            'Household Record'}
                          {v.unitNumber ? ` (Unit ${v.unitNumber})` : ''}
                        </span>
                      </Link>
                      {v.householdCity && (
                        <span className="text-xs text-muted-foreground">· {v.householdCity}</span>
                      )}
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-bold capitalize py-0 ${outcomeColors[v.outcome] ?? ''}`}
                      >
                        {v.outcome.replace(/_/g, ' ')}
                      </Badge>

                      {/* Ownership Badge */}
                      {v.userId === user?.id ? (
                        <Badge
                          variant="outline"
                          className="border-primary/40 text-primary bg-primary/10 text-[10px] py-0 font-bold"
                        >
                          👤 My Visit
                        </Badge>
                      ) : v.userId && groupMateUserIds.has(v.userId) ? (
                        <Badge
                          variant="outline"
                          className="border-indigo-300 text-indigo-700 bg-indigo-50 dark:bg-indigo-950/40 text-[10px] py-0 font-bold"
                        >
                          👥 {v.publisherName || 'Group'}
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="border-slate-300 text-slate-700 bg-slate-50 dark:bg-slate-950/40 text-[10px] py-0 font-bold"
                        >
                          🏛️ {v.publisherName || 'Congregation'}
                        </Badge>
                      )}
                    </div>

                    {/* Visit Date & Relative time */}
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground flex-wrap">
                      <Calendar size={12} className="shrink-0" />
                      <span>
                        {new Date(v.visitDate).toLocaleString()} · {timeAgo(v.visitDate)}
                      </span>
                      {v.userId !== user?.id && (household?.creatorName || v.publisherName) && (
                        <span className="text-foreground/80 font-medium">
                          · Logged by {v.publisherName || household?.creatorName}
                        </span>
                      )}
                    </div>

                    {/* Topic & Literature */}
                    {(v.bibleTopicDiscussed || v.literaturePlaced || v.literatureLeft) && (
                      <div className="flex items-center gap-3 flex-wrap text-xs text-foreground">
                        {v.bibleTopicDiscussed && (
                          <div className="flex items-center gap-1 font-medium text-foreground">
                            <BookOpen size={12} className="text-primary shrink-0" />
                            <span>Scripture/Topic: {v.bibleTopicDiscussed}</span>
                          </div>
                        )}
                        {(v.literaturePlaced || v.literatureLeft) && (
                          <span className="text-primary font-medium">
                            Literature: {v.literaturePlaced || v.literatureLeft}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Return Visit Planned */}
                    {v.returnVisitPlanned && v.nextVisitDate && (
                      <p className="text-xs font-semibold text-purple-700 dark:text-purple-300">
                        📅 Return Visit Scheduled: {formatDate(v.nextVisitDate)}
                        {v.nextVisitTime ? ` at ${v.nextVisitTime}` : ''}
                      </p>
                    )}

                    {/* Visit Notes */}
                    {v.notes && (
                      <p className="text-xs text-muted-foreground/90 italic line-clamp-2">
                        &ldquo;{v.notes}&rdquo;
                      </p>
                    )}

                    {/* Linked Encounters / People Met */}
                    {linkedEncounters.length > 0 && (
                      <div className="pt-2 border-t border-border/60 space-y-1.5">
                        <p className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                          <Users size={11} className="text-primary" />
                          <span>People Met during Visit ({linkedEncounters.length}):</span>
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {linkedEncounters.map((enc) => (
                            <div
                              key={enc.id}
                              className="flex items-center gap-1.5 bg-muted/40 border border-border px-2 py-1 rounded-lg text-xs"
                            >
                              <span className="font-semibold text-foreground">{enc.name}</span>
                              <Badge
                                variant="outline"
                                className={`text-[9px] capitalize py-0 ${responseColors[enc.response] ?? ''}`}
                              >
                                {enc.response.replace(/_/g, ' ')}
                              </Badge>
                              {enc.returnVisitRequested && (
                                <span className="text-[10px] text-purple-600 dark:text-purple-400 font-semibold">
                                  · 📅 Next Visit
                                </span>
                              )}
                              {enc.bibleStudyInterest && (
                                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                                  · 📖 Study
                                </span>
                              )}
                              {(enc.literatureAccepted || enc.literatureOffered) && (
                                <span className="text-[10px] text-primary">
                                  · {enc.literatureAccepted || enc.literatureOffered}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Bottom Action Bar: Management icons on left, Primary actions on right */}
                  <div className="pt-3 border-t border-border/50 flex items-center justify-between gap-2 flex-wrap w-full">
                    {/* Management / Record actions */}
                    <div className="flex items-center gap-1">
                      {canEditVisit(user, v, household) && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 rounded-xl p-0 text-muted-foreground hover:text-foreground"
                          onClick={() => setEditVisit(v)}
                          title="Edit visit record"
                        >
                          <Pencil size={14} />
                        </Button>
                      )}

                      {canDeleteVisit(user, v, household) && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 rounded-xl p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => setDeleteConfirmId(v.id)}
                          disabled={deletingId === v.id}
                          title="Delete visit record"
                        >
                          <Trash2 size={14} />
                        </Button>
                      )}
                    </div>

                    {/* Primary actions: Add Person Met */}
                    <div className="flex items-center gap-2 ml-auto">
                      {(canLogVisitOrEncounter(user, household) || v.userId === user?.id) && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-xl text-xs gap-1.5 h-8 font-semibold hover:text-primary hover:border-primary/50"
                          onClick={() => setAddEncounterVisit(v)}
                          title="Record person met during this visit"
                        >
                          <UserPlus size={13} />
                          <span>+ Person Met</span>
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Edit Visit Modal */}
      <ResponsiveDialog
        open={!!editVisit}
        onOpenChange={(op) => !op && setEditVisit(null)}
        title="Edit Visit Record"
        description={
          editVisit
            ? `Update visit details for ${editVisit.householdAddress || 'household'}`
            : 'Update visit details'
        }
      >
        {editVisit && (
          <EditVisitForm
            visit={editVisit}
            onSubmit={handleUpdateVisit}
            loading={editingVisit}
            onCancel={() => setEditVisit(null)}
          />
        )}
      </ResponsiveDialog>

      {/* Add Encounter to Visit Modal */}
      <ResponsiveDialog
        open={!!addEncounterVisit}
        onOpenChange={(op) => !op && setAddEncounterVisit(null)}
        title="Record Person Encounter"
        description={
          addEncounterVisit
            ? `Person met during visit to ${addEncounterVisit.householdAddress || 'household'}`
            : 'Conversation details'
        }
      >
        {addEncounterVisit && (
          <AddEncounterForm
            defaultHouseholdId={addEncounterVisit.householdId}
            initialValues={{
              visitId: addEncounterVisit.id,
              householdId: addEncounterVisit.householdId,
            }}
            onSubmit={handleCreateEncounter}
            loading={savingEncounter}
            onCancel={() => setAddEncounterVisit(null)}
          />
        )}
      </ResponsiveDialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={!!deleteConfirmId}
        onOpenChange={(op) => !op && setDeleteConfirmId(null)}
        title="Delete Visit Record"
        description="Are you sure you want to delete this visit record? This action cannot be undone."
        confirmLabel="Delete Visit"
        variant="destructive"
        onConfirm={() => {
          if (deleteConfirmId) void handleDelete(deleteConfirmId);
        }}
        loading={!!deletingId}
      />
    </div>
  );
}
