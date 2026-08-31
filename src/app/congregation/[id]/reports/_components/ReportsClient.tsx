'use client';

import {
  Activity,
  AlertTriangle,
  BarChart2,
  BookOpen,
  Building,
  Calendar,
  CheckCircle2,
  ChevronDown,
  Clock,
  Crown,
  Download,
  FileSpreadsheet,
  FileText,
  FolderOpen,
  Globe,
  Home,
  Layers,
  Lock,
  Pencil,
  PhoneCall,
  RefreshCw,
  Search,
  Shield,
  Sparkles,
  TrendingUp,
  Trash2,
  Users,
} from 'lucide-react';
import { useParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { BottomTabBar } from '@/components/bottom-tab-bar';
import { DashboardHeader } from '@/components/dashboard-header';
import { ProtectedPage } from '@/components/protected-page';
import { ResponsiveDialog } from '@/components/shared/responsive-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ServiceYearCountdown } from '@/components/service-year-countdown';
import {
  useActivityReport,
  useCongregation,
  useCoverageReport,
  useCurrentUser,
  useDeleteAssignment,
  useDoorAnalyticsReport,
  useGroupsReport,
  usePublishersReport,
  useS13Report,
  useTeachingAnalyticsReport,
  useUpdateAssignment,
} from '@/hooks';
import { exportFullCongregationReportPDF } from '@/lib/full-report-pdf-export';
import { formatDate } from '@/lib/date-utils';
import { canAdjustAssignmentDates, canDeleteAssignment } from '@/lib/permissions';
import {
  exportCoverageToCSV,
  exportGroupsToCSV,
  exportPublishersToCSV,
  exportS13ToCSV,
  exportTeachingAnalyticsToCSV,
} from '@/lib/reports-csv-export';
import { UserRole } from '@/lib/roles';
import { exportS13ToPDF } from '@/lib/s13-pdf-export';
import { getServiceYear } from '@/lib/service-year';
import type { S13AssignmentRecord } from '@/types/api';

type Tab = 'overview' | 's13' | 'teaching' | 'groups-publishers' | 'doors' | 'activity';

export default function ReportsClient() {
  const params = useParams();
  const congregationId = (params?.id as string) || '';

  const { user } = useCurrentUser();
  const { congregation } = useCongregation(congregationId);
  const [tab, setTab] = useState<Tab>('overview');

  // Service Year State
  const currentSY = getServiceYear();
  const [selectedServiceYear, setSelectedServiceYear] = useState<number | 'all'>('all');

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [healthFilter, setHealthFilter] = useState<string>('all');
  const [s13Filter, setS13Filter] = useState<string>('all');
  const [teachingGroupFilter, setTeachingGroupFilter] = useState<string>('all');

  // S-13 Date Adjustment state
  const [editingS13Record, setEditingS13Record] = useState<S13AssignmentRecord | null>(null);
  const [deletingS13Record, setDeletingS13Record] = useState<S13AssignmentRecord | null>(null);
  const [editStatus, setEditStatus] = useState<string>('active');
  const [editAssignedAt, setEditAssignedAt] = useState('');
  const [editReturnedAt, setEditReturnedAt] = useState('');
  const [editDueAt, setEditDueAt] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const { update: updateAssignment, isPending: isUpdatingAssignment } = useUpdateAssignment();
  const { remove: deleteAssignment, isPending: isDeletingAssignment } = useDeleteAssignment();
  const canAdjust = canAdjustAssignmentDates(user?.role, user?.congregationRole);
  const canDelete = canDeleteAssignment(user?.role, user?.congregationRole);

  // Hooks for reports with Service Year filtering
  const { data: coverageData, isLoading: coverageLoading } = useCoverageReport(congregationId, {
    serviceYear: selectedServiceYear,
  });
  const { data: s13Records = [], isLoading: s13Loading } = useS13Report(congregationId, {
    serviceYear: selectedServiceYear,
  });
  const { data: teachingData, isLoading: teachingLoading } = useTeachingAnalyticsReport(
    congregationId,
    { serviceYear: selectedServiceYear }
  );
  const { data: groupsData = [], isLoading: groupsLoading } = useGroupsReport(congregationId, {
    serviceYear: selectedServiceYear,
  });
  const { data: publishersData, isLoading: publishersLoading } = usePublishersReport(
    congregationId,
    { serviceYear: selectedServiceYear }
  );
  const { data: doorData, isLoading: doorLoading } = useDoorAnalyticsReport(congregationId, {
    serviceYear: selectedServiceYear,
  });
  const { data: activityData, isLoading: activityLoading } = useActivityReport(congregationId);

  const congregationName = congregation?.name || 'Congregation';

  const handleOpenEditS13 = (rec: S13AssignmentRecord) => {
    setEditingS13Record(rec);
    setEditStatus(rec.status || (rec.returnedAt ? 'completed' : 'active'));
    setEditAssignedAt(rec.assignedAt ? rec.assignedAt.slice(0, 10) : '');
    setEditReturnedAt(rec.returnedAt ? rec.returnedAt.slice(0, 10) : '');
    setEditDueAt(rec.dueAt ? rec.dueAt.slice(0, 10) : '');
    setEditNotes('');
  };

  const handleDeleteS13Record = async () => {
    if (!deletingS13Record) return;
    try {
      await deleteAssignment(deletingS13Record.id);
      toast.success('Assignment record deleted from S-13 history');
      if (editingS13Record?.id === deletingS13Record.id) {
        setEditingS13Record(null);
      }
      setDeletingS13Record(null);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to delete assignment record');
    }
  };

  const handleSaveS13Dates = async () => {
    if (!editingS13Record) return;
    try {
      await updateAssignment({
        id: editingS13Record.id,
        status: editStatus,
        assignedAt: editAssignedAt
          ? new Date(`${editAssignedAt}T12:00:00.000Z`).toISOString()
          : editingS13Record.assignedAt,
        returnedAt: editReturnedAt
          ? new Date(`${editReturnedAt}T12:00:00.000Z`).toISOString()
          : null,
        dueAt: editDueAt ? new Date(`${editDueAt}T12:00:00.000Z`).toISOString() : null,
        notes: editNotes.trim() || undefined,
      });
      toast.success('Assignment details updated successfully');
      setEditingS13Record(null);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update assignment details');
    }
  };

  // Filtered Territories for Overview
  const filteredTerritories = useMemo(() => {
    if (!coverageData?.territories) return [];
    return coverageData.territories.filter((t) => {
      const matchesSearch =
        !searchQuery.trim() ||
        t.number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.publisherName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.groupName?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === 'all'
          ? true
          : statusFilter === 'unworked_sy'
            ? !t.isWorkedInServiceYear
            : statusFilter === 'worked_sy'
              ? Boolean(t.isWorkedInServiceYear)
              : t.status === statusFilter;
      const matchesHealth = healthFilter === 'all' || t.healthStatus === healthFilter;

      return matchesSearch && matchesStatus && matchesHealth;
    });
  }, [coverageData?.territories, searchQuery, statusFilter, healthFilter]);

  // Filtered S-13 Records
  const filteredS13 = useMemo(() => {
    return s13Records.filter((rec) => {
      const matchesSearch =
        !searchQuery.trim() ||
        rec.territoryNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rec.territoryName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rec.assigneeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rec.groupName?.toLowerCase().includes(searchQuery.toLowerCase());

      if (s13Filter === 'active') return matchesSearch && !rec.returnedAt;
      if (s13Filter === 'returned') return matchesSearch && Boolean(rec.returnedAt);
      if (s13Filter === 'group') return matchesSearch && rec.isGroupAssignment;
      if (s13Filter === 'personal') return matchesSearch && !rec.isGroupAssignment;
      return matchesSearch;
    });
  }, [s13Records, searchQuery, s13Filter]);

  // Filtered Publishers
  const filteredPublishers = useMemo(() => {
    if (!publishersData?.publishers) return [];
    return publishersData.publishers.filter((p) => {
      return (
        !searchQuery.trim() ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.groupName?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    });
  }, [publishersData?.publishers, searchQuery]);

  return (
    <ProtectedPage
      congregationId={congregationId}
      allowedRoles={[
        UserRole.SUPER_ADMIN,
        UserRole.ADMIN,
        UserRole.SERVICE_OVERSEER,
        UserRole.SECRETARY,
        UserRole.TERRITORY_SERVANT,
        UserRole.CIRCUIT_OVERSEER,
      ]}
    >
      <DashboardHeader />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 pb-28 lg:pb-12 w-full min-w-0">
        {/* Header Title & Actions */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl font-bold text-foreground tracking-tight">
                Congregation Reports & Analytics
              </h1>
              <Badge
                variant="outline"
                className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200 shrink-0 whitespace-nowrap gap-1.5 py-0.5 px-2"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Live Data</span>
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Executive ministry intelligence, official S-13 territory records, and publisher
              activity
            </p>
          </div>

          {/* Service Year Selector & Export Actions */}
          <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2 w-full lg:w-auto shrink-0">
            <Select
              value={String(selectedServiceYear)}
              onValueChange={(val) => setSelectedServiceYear(val === 'all' ? 'all' : Number(val))}
            >
              <SelectTrigger className="w-full sm:w-[185px] h-9 text-xs rounded-xl font-semibold bg-card border-border shadow-2xs">
                <Calendar size={13} className="mr-1.5 text-primary shrink-0" />
                <SelectValue placeholder="Service Year" />
              </SelectTrigger>
              <SelectContent className="rounded-xl text-xs">
                <SelectItem value="all">All Service Years</SelectItem>
                {(coverageData?.availableServiceYears || [currentSY]).map((sy) => (
                  <SelectItem key={sy} value={String(sy)}>
                    {sy === currentSY
                      ? `${sy - 1}–${sy} (Current SY)`
                      : `${sy - 1}–${sy} Service Year`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                exportFullCongregationReportPDF({
                  congregationName,
                  coverageData,
                  s13Records,
                  groupsData,
                  publishersData: publishersData?.publishers,
                  doorData,
                  activityData,
                })
              }
              className="w-full sm:w-auto rounded-xl text-xs gap-1.5 h-9 font-semibold text-primary border-primary/30 hover:bg-primary/5 justify-center"
              title="Direct Download Full Multi-Page PDF Report"
            >
              <FileText size={13} className="text-primary shrink-0" />
              <span>Download Full Report (PDF)</span>
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="w-full sm:w-auto rounded-xl text-xs font-semibold gap-1.5 h-9 px-3.5 shadow-xs justify-center">
                  <Download size={13} className="shrink-0" />
                  <span>Export &amp; Download</span>
                  <ChevronDown size={12} className="opacity-70 shrink-0" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60 rounded-xl text-xs">
                <DropdownMenuItem
                  onClick={() =>
                    exportFullCongregationReportPDF({
                      congregationName,
                      coverageData,
                      s13Records,
                      groupsData,
                      publishersData: publishersData?.publishers,
                      teachingData,
                      doorData,
                      activityData,
                    })
                  }
                  className="cursor-pointer gap-2 py-2 font-bold text-primary"
                >
                  <FileText size={14} className="text-primary" />
                  <span>Download Full Report (PDF)</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => exportS13ToPDF(s13Records, congregationName, selectedServiceYear)}
                  className="cursor-pointer gap-2 py-2 font-semibold text-blue-600 dark:text-blue-400"
                >
                  <FileSpreadsheet size={14} className="text-blue-600" />
                  <span>Download S-13 Record (PDF)</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() =>
                    exportTeachingAnalyticsToCSV(
                      teachingData || { totals: {}, byGroup: [], byPublisher: [] },
                      congregationName,
                      selectedServiceYear
                    )
                  }
                  className="cursor-pointer gap-2 py-2 font-semibold text-purple-600 dark:text-purple-400"
                >
                  <BookOpen size={14} className="text-purple-600" />
                  <span>Export Teaching Analytics (CSV)</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => exportS13ToCSV(s13Records, congregationName, selectedServiceYear)}
                  className="cursor-pointer gap-2 py-2"
                >
                  <FileSpreadsheet size={14} className="text-primary" />
                  <span>Export S-13 Record (CSV)</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() =>
                    exportCoverageToCSV(
                      coverageData?.territories || [],
                      congregationName,
                      selectedServiceYear
                    )
                  }
                  className="cursor-pointer gap-2 py-2"
                >
                  <BarChart2 size={14} className="text-primary" />
                  <span>Export Coverage Data (CSV)</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() =>
                    exportPublishersToCSV(publishersData?.publishers || [], congregationName)
                  }
                  className="cursor-pointer gap-2 py-2"
                >
                  <Users size={14} className="text-primary" />
                  <span>Export Publishers Summary (CSV)</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => exportGroupsToCSV(groupsData, congregationName)}
                  className="cursor-pointer gap-2 py-2"
                >
                  <FolderOpen size={14} className="text-primary" />
                  <span>Export Service Groups (CSV)</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Executive KPI Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* KPI 1: Live Congregation Coverage */}
          <Card className="bg-card border-border shadow-xs">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Total Coverage
                </span>
                <TrendingUp size={15} className="text-primary" />
              </div>
              <div className="flex items-baseline justify-between">
                <p className="text-2xl font-black text-foreground">
                  {coverageData?.avgCoveragePercent ?? 0}%
                </p>
                <span className="text-xs text-muted-foreground font-medium">
                  {coverageData?.workedDoors ?? 0} / {coverageData?.totalDoors ?? 0} doors
                </span>
              </div>
              <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(coverageData?.avgCoveragePercent ?? 0, 100)}%` }}
                />
              </div>
            </CardContent>
          </Card>

          {/* KPI 2: Active Assignment Rate */}
          <Card className="bg-card border-border shadow-xs">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Active Rotation Rate
                </span>
                <Layers size={15} className="text-blue-500" />
              </div>
              <div className="flex items-baseline justify-between">
                <p className="text-2xl font-black text-foreground">
                  {coverageData?.activeAssignmentRate ?? 0}%
                </p>
                <span className="text-xs text-muted-foreground font-medium">
                  {coverageData?.byStatus.assigned ?? 0} assigned
                </span>
              </div>
              <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(coverageData?.activeAssignmentRate ?? 0, 100)}%` }}
                />
              </div>
            </CardContent>
          </Card>

          {/* KPI 3: Average Turnaround Duration */}
          <Card className="bg-card border-border shadow-xs">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Avg Turnaround
                </span>
                <Clock size={15} className="text-amber-500" />
              </div>
              <div className="flex items-baseline justify-between">
                <p className="text-2xl font-black text-foreground">
                  {coverageData?.avgTurnaroundDays ?? 45}{' '}
                  <span className="text-sm font-normal text-muted-foreground">days</span>
                </p>
                <span className="text-xs text-muted-foreground font-medium">per territory</span>
              </div>
              <p className="text-[10px] text-muted-foreground">
                Target cycle: ~60–90 days rotation
              </p>
            </CardContent>
          </Card>

          {/* KPI 4: Territory Health Recency Index */}
          <Card className="bg-card border-border shadow-xs">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Territory Health
                </span>
                <Sparkles size={15} className="text-emerald-500" />
              </div>
              <div className="flex items-center gap-1.5 text-xs font-semibold">
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                  {coverageData?.byHealth.fresh ?? 0} Fresh
                </span>
                <span className="text-muted-foreground">•</span>
                <span className="text-blue-600 dark:text-blue-400 font-bold">
                  {coverageData?.byHealth.active ?? 0} Active
                </span>
                <span className="text-muted-foreground">•</span>
                <span className="text-rose-600 dark:text-rose-400 font-bold">
                  {coverageData?.byHealth.stale ?? 0} Stale
                </span>
              </div>
              <div className="flex h-1.5 w-full bg-muted rounded-full overflow-hidden gap-0.5">
                <div
                  className="h-full bg-emerald-500"
                  style={{
                    width: `${((coverageData?.byHealth.fresh ?? 0) / Math.max(1, coverageData?.totalTerritories ?? 1)) * 100}%`,
                  }}
                  title="Fresh (< 30 days)"
                />
                <div
                  className="h-full bg-blue-500"
                  style={{
                    width: `${((coverageData?.byHealth.active ?? 0) / Math.max(1, coverageData?.totalTerritories ?? 1)) * 100}%`,
                  }}
                  title="Active (30-90 days)"
                />
                <div
                  className="h-full bg-amber-500"
                  style={{
                    width: `${((coverageData?.byHealth.dormant ?? 0) / Math.max(1, coverageData?.totalTerritories ?? 1)) * 100}%`,
                  }}
                  title="Dormant (90-180 days)"
                />
                <div
                  className="h-full bg-rose-500"
                  style={{
                    width: `${((coverageData?.byHealth.stale ?? 0) / Math.max(1, coverageData?.totalTerritories ?? 1)) * 100}%`,
                  }}
                  title="Stale (> 180 days)"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tab Navigation Menu */}
        <div className="w-full overflow-x-auto scrollbar-none pb-1">
          <div className="inline-flex items-center gap-1.5 p-1 bg-muted/40 rounded-2xl border border-border min-w-max">
            <button
              type="button"
              onClick={() => {
                setTab('overview');
                setSearchQuery('');
              }}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-all cursor-pointer ${
                tab === 'overview'
                  ? 'bg-card text-primary shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <BarChart2 size={14} />
              <span>Executive Overview</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setTab('s13');
                setSearchQuery('');
              }}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-all cursor-pointer ${
                tab === 's13'
                  ? 'bg-card text-primary shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <FileSpreadsheet size={14} />
              <span>S-13 Territory Record</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setTab('teaching');
                setSearchQuery('');
              }}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-all cursor-pointer ${
                tab === 'teaching'
                  ? 'bg-card text-purple-600 dark:text-purple-400 shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <BookOpen size={14} />
              <span>Teaching & Follow-ups</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setTab('groups-publishers');
                setSearchQuery('');
              }}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-all cursor-pointer ${
                tab === 'groups-publishers'
                  ? 'bg-card text-primary shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Users size={14} />
              <span>Groups & Publishers</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setTab('doors');
                setSearchQuery('');
              }}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-all cursor-pointer ${
                tab === 'doors'
                  ? 'bg-card text-primary shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Home size={14} />
              <span>Door Demographics</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setTab('activity');
                setSearchQuery('');
              }}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-all cursor-pointer ${
                tab === 'activity'
                  ? 'bg-card text-primary shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Activity size={14} />
              <span>Audit Timeline</span>
            </button>
          </div>
        </div>

        {/* ───────────────────────────────────────────────────────────────────────── */}
        {/* TAB 1: EXECUTIVE OVERVIEW */}
        {/* ───────────────────────────────────────────────────────────────────────── */}
        {tab === 'overview' && (
          <div className="space-y-6 w-full min-w-0 max-w-full">
            {/* Service Year Countdown & Pacing Banner */}
            <ServiceYearCountdown
              variant="banner"
              serviceYear={selectedServiceYear}
              coveragePercent={coverageData?.avgCoveragePercent}
              workedTerritoriesCount={coverageData?.workedInCurrentSYCount}
              totalTerritoriesCount={coverageData?.totalTerritories}
              unworkedTerritoriesCount={coverageData?.unworkedInCurrentSYCount}
              onFilterUnworked={() => setStatusFilter('unworked_sy')}
            />

            {/* Status Breakdown & Health Matrix */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              <Card className="bg-card border-border shadow-xs">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] uppercase font-bold text-muted-foreground">
                      Available
                    </p>
                    <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                      {coverageData?.byStatus.available ?? 0}
                    </p>
                    <p className="text-[10px] text-muted-foreground">Ready for assignment</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600">
                    <CheckCircle2 size={20} />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card border-border shadow-xs">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] uppercase font-bold text-muted-foreground">
                      Assigned
                    </p>
                    <p className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">
                      {coverageData?.byStatus.assigned ?? 0}
                    </p>
                    <p className="text-[10px] text-muted-foreground">Currently in ministry</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600">
                    <Layers size={20} />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card border-border shadow-xs">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] uppercase font-bold text-muted-foreground">
                      Completed
                    </p>
                    <p className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-1">
                      {coverageData?.byStatus.completed ?? 0}
                    </p>
                    <p className="text-[10px] text-muted-foreground">100% worked cycle</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-600">
                    <Sparkles size={20} />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card border-border shadow-xs">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] uppercase font-bold text-muted-foreground">
                      Stale / Overdue
                    </p>
                    <p className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">
                      {coverageData?.byHealth.stale ?? 0}
                    </p>
                    <p className="text-[10px] text-muted-foreground">&gt; 180 days idle</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-600">
                    <AlertTriangle size={20} />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Territory Completion Matrix & Search */}
            <Card className="bg-card border-border shadow-xs">
              <CardHeader className="pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base font-bold">
                    Territory Completion & Recency Matrix
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Live coverage percentage, door count, and last worked recency
                  </p>
                </div>

                {/* Filters */}
                <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2 w-full sm:w-auto">
                  <div className="relative w-full sm:w-56">
                    <Search
                      size={13}
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                    />
                    <Input
                      placeholder="Search territories or assignees…"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="h-8 pl-8 text-xs w-full rounded-xl"
                    />
                  </div>

                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="h-8 text-xs bg-muted/40 border border-border rounded-xl px-2.5 text-foreground cursor-pointer focus:outline-none w-full sm:w-auto"
                  >
                    <option value="all">All Statuses</option>
                    <option value="unworked_sy">
                      🔥 Unworked in SY ({coverageData?.unworkedInCurrentSYCount ?? 0})
                    </option>
                    <option value="worked_sy">
                      ✓ Worked in SY ({coverageData?.workedInCurrentSYCount ?? 0})
                    </option>
                    <option value="available">Available</option>
                    <option value="assigned">Assigned</option>
                    <option value="completed">Completed</option>
                  </select>

                  <select
                    value={healthFilter}
                    onChange={(e) => setHealthFilter(e.target.value)}
                    className="h-8 text-xs bg-muted/40 border border-border rounded-xl px-2.5 text-foreground cursor-pointer focus:outline-none w-full sm:w-auto"
                  >
                    <option value="all">All Health</option>
                    <option value="fresh">Fresh (&lt; 30d)</option>
                    <option value="active">Active (30-90d)</option>
                    <option value="dormant">Dormant (90-180d)</option>
                    <option value="stale">Stale (&gt; 180d)</option>
                  </select>
                </div>
              </CardHeader>
              <CardContent>
                {filteredTerritories.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-8">
                    No territories match the selected filters.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {filteredTerritories.map((t) => {
                      const healthBadgeColor =
                        t.healthStatus === 'fresh'
                          ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
                          : t.healthStatus === 'active'
                            ? 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30'
                            : t.healthStatus === 'dormant'
                              ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30'
                              : 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30';

                      return (
                        <div
                          key={t.id}
                          className="p-3.5 rounded-2xl border border-border bg-background hover:border-primary/40 transition-all space-y-2.5"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="font-extrabold text-xs text-primary">
                                #{t.number}
                              </span>
                              <span className="font-bold text-xs text-foreground truncate">
                                {t.name}
                              </span>
                              <Badge
                                variant="outline"
                                className="text-[10px] uppercase font-semibold"
                              >
                                {t.status}
                              </Badge>
                              <Badge
                                className={`text-[9px] font-bold uppercase ${healthBadgeColor}`}
                              >
                                {t.healthStatus}
                              </Badge>
                            </div>

                            <div className="flex items-center gap-3 text-xs font-semibold text-muted-foreground shrink-0">
                              <span>
                                {t.workedDoors} / {t.householdsCount} doors
                              </span>
                              <span className="font-black text-foreground">
                                {Math.round(t.coveragePercent)}%
                              </span>
                            </div>
                          </div>

                          {/* Progress bar */}
                          <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full transition-all duration-300"
                              style={{ width: `${Math.min(t.coveragePercent, 100)}%` }}
                            />
                          </div>

                          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground pt-1">
                            <div className="flex items-center gap-2">
                              {t.publisherName && (
                                <span className="flex items-center gap-1 font-medium text-foreground">
                                  <Users size={11} className="text-primary" /> Assigned to{' '}
                                  {t.publisherName}
                                </span>
                              )}
                              {t.groupName && (
                                <span className="bg-muted px-2 py-0.5 rounded-md font-medium">
                                  {t.groupName}
                                </span>
                              )}
                            </div>

                            <span>
                              {t.daysSinceWorked !== null
                                ? `Worked ${t.daysSinceWorked} day${t.daysSinceWorked === 1 ? '' : 's'} ago`
                                : 'No visits recorded yet'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* ───────────────────────────────────────────────────────────────────────── */}
        {/* TAB 2: OFFICIAL S-13 CONGREGATION TERRITORY RECORD */}
        {/* ───────────────────────────────────────────────────────────────────────── */}
        {tab === 's13' && (
          <div className="space-y-6 w-full min-w-0 max-w-full">
            <ServiceYearCountdown
              variant="banner"
              serviceYear={selectedServiceYear}
              coveragePercent={coverageData?.avgCoveragePercent}
              workedTerritoriesCount={coverageData?.workedInCurrentSYCount}
              totalTerritoriesCount={coverageData?.totalTerritories}
              unworkedTerritoriesCount={coverageData?.unworkedInCurrentSYCount}
            />

            <Card className="bg-card border-border shadow-xs overflow-hidden w-full min-w-0 max-w-full">
              <CardHeader className="p-4 sm:p-6 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 min-w-0">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <CardTitle className="text-sm sm:text-base font-bold">
                      Official S-13 Congregation Territory Record
                    </CardTitle>
                    <Badge
                      variant="outline"
                      className="text-[10px] font-mono font-bold bg-muted/60 shrink-0"
                    >
                      S-13 (8/19)
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Complete territory assignment history, turnaround duration, and return coverage
                    %
                  </p>
                </div>

                {/* S-13 Search & Filter Controls */}
                <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2 w-full sm:w-auto shrink-0">
                  <div className="relative w-full sm:w-56">
                    <Search
                      size={13}
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                    />
                    <Input
                      placeholder="Search S-13 records…"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="h-8 pl-8 text-xs w-full rounded-xl"
                    />
                  </div>

                  <select
                    value={s13Filter}
                    onChange={(e) => setS13Filter(e.target.value)}
                    className="h-8 text-xs bg-muted/40 border border-border rounded-xl px-2.5 text-foreground cursor-pointer focus:outline-none w-full sm:w-auto"
                  >
                    <option value="all">All Assignments</option>
                    <option value="active">Active Only</option>
                    <option value="returned">Returned / Completed</option>
                    <option value="group">Service Groups</option>
                    <option value="personal">Personal Publishers</option>
                  </select>

                  <Button
                    size="sm"
                    onClick={() =>
                      exportS13ToPDF(filteredS13, congregationName, selectedServiceYear)
                    }
                    className="w-full sm:w-auto h-8 rounded-xl text-xs gap-1.5 font-semibold bg-primary text-primary-foreground shadow-xs justify-center"
                  >
                    <FileText size={12} className="shrink-0" />
                    <span>Download S-13 PDF</span>
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      exportS13ToCSV(filteredS13, congregationName, selectedServiceYear)
                    }
                    className="w-full sm:w-auto h-8 rounded-xl text-xs gap-1.5 font-semibold justify-center"
                  >
                    <Download size={12} className="shrink-0" />
                    <span>CSV</span>
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 pt-0 w-full min-w-0 max-w-full">
                {filteredS13.length === 0 ? (
                  <div className="text-center py-12 space-y-2">
                    <FileSpreadsheet size={36} className="text-muted-foreground/40 mx-auto" />
                    <p className="text-sm font-semibold text-foreground">
                      No assignment records found
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Assignments and completions will automatically populate the S-13 record.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* 1. Mobile Cards View (< md) */}
                    <div className="space-y-3 block md:hidden min-w-0">
                      {filteredS13.map((rec) => {
                        const isReturned = Boolean(rec.returnedAt);
                        return (
                          <div
                            key={rec.id}
                            className="p-3.5 rounded-2xl border border-border bg-background space-y-2.5 shadow-2xs min-w-0"
                          >
                            <div className="flex items-start justify-between gap-2 min-w-0">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                                  <span className="font-extrabold text-xs text-primary shrink-0">
                                    #{rec.territoryNumber}
                                  </span>
                                  <span className="font-bold text-xs text-foreground truncate">
                                    {rec.territoryName}
                                  </span>
                                </div>
                                <div className="mt-1 min-w-0">
                                  {rec.isGroupAssignment ? (
                                    <Badge
                                      variant="outline"
                                      className="text-[9px] bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 shrink-0"
                                    >
                                      👥 {rec.groupName || rec.assigneeName}
                                    </Badge>
                                  ) : (
                                    <span className="text-xs font-semibold text-foreground truncate block">
                                      👤 {rec.assigneeName}
                                    </span>
                                  )}
                                </div>
                              </div>

                              <Badge
                                variant="outline"
                                className={`text-[9px] uppercase font-bold shrink-0 ${
                                  rec.status === 'completed' || isReturned
                                    ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
                                    : 'bg-primary/10 text-primary border-primary/30'
                                }`}
                              >
                                {rec.status === 'completed' || isReturned
                                  ? 'Returned'
                                  : 'Active In Field'}
                              </Badge>
                            </div>

                            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/60 text-[11px] text-muted-foreground">
                              <div>
                                <span className="text-[10px] uppercase font-bold tracking-wider block text-muted-foreground">
                                  Assigned
                                </span>
                                <span className="font-medium text-foreground">
                                  {rec.assignedAt ? formatDate(rec.assignedAt) : '—'}
                                </span>
                              </div>
                              <div>
                                <span className="text-[10px] uppercase font-bold tracking-wider block text-muted-foreground">
                                  Returned
                                </span>
                                <span className="font-medium text-foreground">
                                  {isReturned ? formatDate(rec.returnedAt) : '—'}
                                </span>
                              </div>
                              <div>
                                <span className="text-[10px] uppercase font-bold tracking-wider block text-muted-foreground">
                                  Duration
                                </span>
                                <span className="font-medium text-foreground">
                                  {rec.durationDays !== null ? `${rec.durationDays} days` : '—'}
                                </span>
                              </div>
                              <div>
                                <span className="text-[10px] uppercase font-bold tracking-wider block text-muted-foreground">
                                  Coverage
                                </span>
                                <span className="font-bold text-foreground">
                                  {Math.round(rec.coverageAtReturn)}%
                                </span>
                              </div>
                            </div>

                            {(canAdjust || canDelete) && (
                              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
                                {canDelete && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 text-xs text-destructive hover:bg-destructive/10 px-2 gap-1 rounded-xl"
                                    onClick={() => setDeletingS13Record(rec)}
                                  >
                                    <Trash2 size={12} />
                                    <span>Delete</span>
                                  </Button>
                                )}
                                {canAdjust && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 text-xs text-foreground hover:bg-muted px-2.5 gap-1 rounded-xl"
                                    onClick={() => handleOpenEditS13(rec)}
                                  >
                                    <Pencil size={12} />
                                    <span>Adjust Dates</span>
                                  </Button>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* 2. Desktop Table View (>= md) */}
                    <div className="hidden md:block overflow-x-auto rounded-2xl border border-border w-full min-w-0 max-w-full">
                      <table className="w-full text-left text-xs border-collapse min-w-[650px]">
                        <thead>
                          <tr className="bg-muted/40 border-b border-border text-muted-foreground font-semibold">
                            <th className="py-2.5 px-3">Territory</th>
                            <th className="py-2.5 px-3">Assigned To</th>
                            <th className="py-2.5 px-3">Date Assigned</th>
                            <th className="py-2.5 px-3">Date Returned</th>
                            <th className="py-2.5 px-3 text-center">Duration</th>
                            <th className="py-2.5 px-3 text-center">Coverage</th>
                            <th className="py-2.5 px-3 text-right">Status</th>
                            {canAdjust && <th className="py-2.5 px-3 text-right">Actions</th>}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/60">
                          {filteredS13.map((rec) => {
                            const isReturned = Boolean(rec.returnedAt);
                            return (
                              <tr key={rec.id} className="hover:bg-muted/20 transition-colors">
                                <td className="py-2.5 px-3 font-semibold text-foreground whitespace-nowrap">
                                  <span className="text-primary font-bold mr-1">
                                    #{rec.territoryNumber}
                                  </span>
                                  <span>{rec.territoryName}</span>
                                </td>
                                <td className="py-2.5 px-3 whitespace-nowrap">
                                  <div className="flex items-center gap-1.5">
                                    {rec.isGroupAssignment ? (
                                      <Badge
                                        variant="outline"
                                        className="text-[9px] bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200"
                                      >
                                        👥 {rec.groupName || rec.assigneeName}
                                      </Badge>
                                    ) : (
                                      <span className="font-medium text-foreground">
                                        {rec.assigneeName}
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="py-2.5 px-3 whitespace-nowrap text-muted-foreground">
                                  {rec.assignedAt ? formatDate(rec.assignedAt) : '—'}
                                </td>
                                <td className="py-2.5 px-3 whitespace-nowrap">
                                  {isReturned ? (
                                    <span className="text-foreground font-medium">
                                      {formatDate(rec.returnedAt)}
                                    </span>
                                  ) : (
                                    <Badge className="text-[9px] bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30">
                                      Active In Field
                                    </Badge>
                                  )}
                                </td>
                                <td className="py-2.5 px-3 text-center whitespace-nowrap text-muted-foreground">
                                  {rec.durationDays !== null ? `${rec.durationDays} days` : '—'}
                                </td>
                                <td className="py-2.5 px-3 text-center whitespace-nowrap font-bold text-foreground">
                                  {Math.round(rec.coverageAtReturn)}%
                                </td>
                                <td className="py-2.5 px-3 text-right whitespace-nowrap">
                                  <Badge
                                    variant="outline"
                                    className={`text-[9px] uppercase font-bold ${
                                      rec.status === 'completed' || isReturned
                                        ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
                                        : 'bg-primary/10 text-primary border-primary/30'
                                    }`}
                                  >
                                    {rec.status}
                                  </Badge>
                                </td>
                                {(canAdjust || canDelete) && (
                                  <td className="py-2.5 px-3 text-right whitespace-nowrap">
                                    <div className="flex items-center justify-end gap-1">
                                      {canDelete && (
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          className="h-7 w-7 p-0 rounded-lg text-destructive hover:text-destructive hover:bg-destructive/10"
                                          onClick={() => setDeletingS13Record(rec)}
                                          title="Delete accidental/wrong assignment record"
                                        >
                                          <Trash2 size={12} />
                                          <span className="sr-only">Delete Record</span>
                                        </Button>
                                      )}
                                      {canAdjust && (
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          className="h-7 w-7 p-0 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
                                          onClick={() => handleOpenEditS13(rec)}
                                          title="Adjust assignment / return dates"
                                        >
                                          <Pencil size={12} />
                                          <span className="sr-only">Edit Dates</span>
                                        </Button>
                                      )}
                                    </div>
                                  </td>
                                )}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* S-13 Adjust Dates Dialog */}
        <ResponsiveDialog
          open={Boolean(editingS13Record)}
          onOpenChange={(op) => !op && setEditingS13Record(null)}
          title={
            editingS13Record
              ? `Adjust S-13 Dates — Territory #${editingS13Record.territoryNumber}`
              : 'Adjust Assignment Dates'
          }
          description={
            editingS13Record
              ? `${editingS13Record.territoryName} (${editingS13Record.assigneeName || 'Publisher'})`
              : ''
          }
        >
          {editingS13Record && (
            <div className="space-y-4">
              <p className="text-xs text-muted-foreground">
                Service Overseers and Territory Servants can adjust the official assignment, return,
                or due dates.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Assignment Status *</Label>
                  <Select
                    value={editStatus}
                    onValueChange={(val) => {
                      setEditStatus(val);
                      const today = new Date().toISOString().slice(0, 10);
                      if ((val === 'completed' || val === 'returned') && !editReturnedAt) {
                        setEditReturnedAt(today);
                      } else if (val === 'active' || val === 'pending_approval') {
                        setEditReturnedAt('');
                      }
                    }}
                  >
                    <SelectTrigger className="h-9 rounded-xl text-xs">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active in Field</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="returned">Returned</SelectItem>
                      <SelectItem value="pending_approval">Pending Approval</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Date Assigned *</Label>
                  <Input
                    type="date"
                    value={editAssignedAt}
                    onChange={(e) => setEditAssignedAt(e.target.value)}
                    className="h-9 rounded-xl text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Date Returned / Revoked</Label>
                  <Input
                    type="date"
                    value={editReturnedAt}
                    onChange={(e) => setEditReturnedAt(e.target.value)}
                    className="h-9 rounded-xl text-xs"
                    placeholder="Leave empty if active"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Due Date (Optional)</Label>
                  <Input
                    type="date"
                    value={editDueAt}
                    onChange={(e) => setEditDueAt(e.target.value)}
                    className="h-9 rounded-xl text-xs"
                  />
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <Label className="text-xs font-semibold">Notes (Optional)</Label>
                  <Input
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    placeholder="Reason for adjustment / notes"
                    className="h-9 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 pt-2 border-t border-border">
                {canDelete ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="rounded-xl text-xs text-destructive hover:bg-destructive/10 hover:text-destructive gap-1"
                    onClick={() => {
                      setDeletingS13Record(editingS13Record);
                    }}
                  >
                    <Trash2 size={12} />
                    <span>Delete Record</span>
                  </Button>
                ) : (
                  <div />
                )}
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-xl text-xs"
                    onClick={() => setEditingS13Record(null)}
                    disabled={isUpdatingAssignment}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    className="rounded-xl text-xs font-semibold"
                    onClick={handleSaveS13Dates}
                    disabled={isUpdatingAssignment || !editAssignedAt}
                  >
                    {isUpdatingAssignment ? 'Saving…' : 'Save Changes'}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </ResponsiveDialog>

        {/* Delete S-13 Record Confirmation Dialog */}
        <ResponsiveDialog
          open={Boolean(deletingS13Record)}
          onOpenChange={(op) => !op && setDeletingS13Record(null)}
          title="Delete Assignment Record"
          description="Permanently delete this accidental or wrong assignment record"
        >
          <div className="space-y-3 pt-1 text-xs">
            <p className="text-muted-foreground leading-relaxed">
              Are you sure you want to permanently delete this assignment history record? This will
              remove the entry from the territory history and S-13 reports.
            </p>
            <div className="p-2.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-[11px]">
              ⚠️ If this is the currently active assignment, the parent territory will automatically
              be marked available for checkout.
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                size="sm"
                variant="ghost"
                className="rounded-xl text-xs"
                onClick={() => setDeletingS13Record(null)}
                disabled={isDeletingAssignment}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                variant="destructive"
                className="rounded-xl text-xs font-semibold"
                onClick={handleDeleteS13Record}
                disabled={isDeletingAssignment}
              >
                {isDeletingAssignment ? 'Deleting…' : 'Delete Record'}
              </Button>
            </div>
          </div>
        </ResponsiveDialog>

        {/* ───────────────────────────────────────────────────────────────────────── */}
        {/* TAB: TEACHING & FOLLOW-UP ANALYTICS */}
        {/* ───────────────────────────────────────────────────────────────────────── */}
        {tab === 'teaching' && (
          <div className="space-y-6 w-full min-w-0 max-w-full">
            {/* Teaching KPI Header Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {/* KPI 1: Interested Contacts */}
              <Card className="bg-card border-border shadow-xs">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      Interested Contacts
                    </span>
                    <Sparkles size={15} className="text-emerald-500" />
                  </div>
                  <div className="flex items-baseline justify-between">
                    <p className="text-2xl font-black text-foreground">
                      {teachingData?.totals.interestedContacts.total ?? 0}
                    </p>
                    <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                      {teachingData?.totals.interestedContacts.studyInterested ?? 0} study interests
                    </span>
                  </div>
                  <div className="text-[11px] text-muted-foreground flex items-center justify-between pt-1 border-t border-border/50">
                    <span>{teachingData?.totals.interestedContacts.receptive ?? 0} receptive</span>
                    <span>{teachingData?.totals.interestedContacts.returnVisitRequested ?? 0} requested RV</span>
                  </div>
                </CardContent>
              </Card>

              {/* KPI 2: Return Visits */}
              <Card className="bg-card border-border shadow-xs">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      Return Visits Made
                    </span>
                    <CheckCircle2 size={15} className="text-blue-500" />
                  </div>
                  <div className="flex items-baseline justify-between">
                    <p className="text-2xl font-black text-foreground">
                      {teachingData?.totals.returnVisits.visited ?? 0}
                    </p>
                    <span className="text-xs text-amber-600 dark:text-amber-400 font-semibold">
                      {teachingData?.totals.returnVisits.missed ?? 0} missed
                    </span>
                  </div>
                  <div className="text-[11px] text-muted-foreground flex items-center justify-between pt-1 border-t border-border/50">
                    <span>{teachingData?.totals.returnVisits.upcoming ?? 0} upcoming</span>
                    <span className="font-semibold text-blue-600 dark:text-blue-400">
                      {((teachingData?.totals.returnVisits.visited ?? 0) + (teachingData?.totals.returnVisits.missed ?? 0)) > 0
                        ? Math.round(
                            ((teachingData?.totals.returnVisits.visited ?? 0) /
                              ((teachingData?.totals.returnVisits.visited ?? 0) +
                                (teachingData?.totals.returnVisits.missed ?? 0))) *
                              100
                          )
                        : 100}
                      % completed
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* KPI 3: Bible Studies Conducted & Offered */}
              <Card className="bg-card border-border shadow-xs">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      Studies Conducted
                    </span>
                    <BookOpen size={15} className="text-purple-500" />
                  </div>
                  <div className="flex items-baseline justify-between">
                    <p className="text-2xl font-black text-foreground">
                      {teachingData?.totals.bibleStudies.conducted ?? 0}
                    </p>
                    <span className="text-xs text-purple-600 dark:text-purple-400 font-semibold">
                      {teachingData?.totals.bibleStudies.offered ?? 0} offered
                    </span>
                  </div>
                  <div className="text-[11px] text-muted-foreground flex items-center justify-between pt-1 border-t border-border/50">
                    <span>{teachingData?.totals.bibleStudies.missed ?? 0} missed</span>
                    <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 border-purple-300 text-purple-700 dark:text-purple-300">
                      Active Teaching
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {/* KPI 4: Active Bible Studies Pipeline */}
              <Card className="bg-card border-border shadow-xs">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      Active Studies Pipeline
                    </span>
                    <Users size={15} className="text-violet-500" />
                  </div>
                  <div className="flex items-baseline justify-between">
                    <p className="text-2xl font-black text-violet-600 dark:text-violet-400">
                      {teachingData?.totals.bibleStudies.activeCount ?? 0}
                    </p>
                    <span className="text-xs text-muted-foreground font-medium">
                      Ongoing studies
                    </span>
                  </div>
                  <div className="text-[11px] text-muted-foreground flex items-center justify-between pt-1 border-t border-border/50">
                    <span>Across all groups</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">Live Pipeline</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Filter & Search Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-3 rounded-2xl border border-border shadow-2xs">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <div className="relative flex-1 min-w-0">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search publisher or group name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 h-9 text-xs rounded-xl bg-background"
                  />
                </div>
                <Select value={teachingGroupFilter} onValueChange={setTeachingGroupFilter}>
                  <SelectTrigger className="h-9 w-40 rounded-xl text-xs bg-background shrink-0">
                    <SelectValue placeholder="All Groups" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border text-xs">
                    <SelectItem value="all">All Groups</SelectItem>
                    {(groupsData || []).map((g) => (
                      <SelectItem key={g.groupId} value={g.groupId}>
                        {g.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  exportTeachingAnalyticsToCSV(
                    teachingData || { totals: {}, byGroup: [], byPublisher: [] },
                    congregationName,
                    selectedServiceYear
                  )
                }
                className="rounded-xl text-xs gap-1.5 h-9 shrink-0 text-purple-600 dark:text-purple-400 hover:text-purple-700"
              >
                <Download size={13} />
                <span>Export Teaching CSV</span>
              </Button>
            </div>

            {/* Service Groups Teaching Breakdown */}
            <div className="space-y-3 w-full min-w-0">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-foreground">Service Groups Teaching &amp; Follow-up Stats</h2>
                <Badge variant="secondary" className="text-xs">
                  {teachingData?.byGroup?.length ?? 0} Groups
                </Badge>
              </div>

              {(teachingData?.byGroup || []).length === 0 ? (
                <p className="text-xs text-muted-foreground italic">No service groups available.</p>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 min-w-0">
                  {(teachingData?.byGroup || [])
                    .filter((g) => teachingGroupFilter === 'all' || g.groupId === teachingGroupFilter)
                    .map((g) => (
                      <Card key={g.groupId} className="bg-card border-border shadow-xs overflow-hidden min-w-0">
                        <CardContent className="p-4 space-y-3 min-w-0">
                          <div className="flex items-start justify-between gap-2 min-w-0">
                            <div className="min-w-0">
                              <h3 className="font-bold text-sm text-foreground truncate">{g.name}</h3>
                              <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                                Overseer: {g.overseerName || 'Unassigned'} • {g.memberCount} members
                              </p>
                            </div>
                            <Badge className="bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/20 font-bold shrink-0">
                              {g.metrics.bibleStudies.activeCount} active {g.metrics.bibleStudies.activeCount === 1 ? 'study' : 'studies'}
                            </Badge>
                          </div>

                          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border/60 text-center">
                            <div className="p-2 rounded-xl bg-muted/40">
                              <p className="text-xs font-bold text-foreground">{g.metrics.interestedContacts.total}</p>
                              <p className="text-[10px] text-muted-foreground">Interested</p>
                            </div>
                            <div className="p-2 rounded-xl bg-muted/40">
                              <p className="text-xs font-bold text-blue-600 dark:text-blue-400">
                                {g.metrics.returnVisits.visited}
                              </p>
                              <p className="text-[10px] text-muted-foreground">
                                RVs ({g.metrics.returnVisits.missed} msd)
                              </p>
                            </div>
                            <div className="p-2 rounded-xl bg-muted/40">
                              <p className="text-xs font-bold text-purple-600 dark:text-purple-400">
                                {g.metrics.bibleStudies.conducted}
                              </p>
                              <p className="text-[10px] text-muted-foreground">
                                Studies ({g.metrics.bibleStudies.offered} off)
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                </div>
              )}
            </div>

            {/* Publishers Teaching & Follow-up Breakdown Table */}
            <div className="space-y-3 w-full min-w-0">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-foreground">Publishers Teaching &amp; Follow-up Activity</h2>
                <span className="text-xs text-muted-foreground">
                  {(teachingData?.byPublisher || []).length} Publishers
                </span>
              </div>

              <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-muted/50 text-[11px] font-bold text-muted-foreground uppercase tracking-wider border-b border-border">
                      <tr>
                        <th className="px-4 py-3">Publisher Name</th>
                        <th className="px-3 py-3">Service Group</th>
                        <th className="px-3 py-3 text-center">Interested</th>
                        <th className="px-3 py-3 text-center">RV Visited</th>
                        <th className="px-3 py-3 text-center">RV Missed</th>
                        <th className="px-3 py-3 text-center">Studies Conducted</th>
                        <th className="px-3 py-3 text-center">Studies Offered</th>
                        <th className="px-3 py-3 text-center">Studies Missed</th>
                        <th className="px-4 py-3 text-right">Active Studies</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {(teachingData?.byPublisher || [])
                        .filter((p) => {
                          const matchesQuery =
                            !searchQuery.trim() ||
                            p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            p.groupName?.toLowerCase().includes(searchQuery.toLowerCase());
                          return matchesQuery;
                        })
                        .map((p) => (
                          <tr key={p.userId} className="hover:bg-muted/30 transition-colors">
                            <td className="px-4 py-2.5 font-bold text-foreground">
                              {p.name}
                            </td>
                            <td className="px-3 py-2.5 text-muted-foreground">
                              {p.groupName || '—'}
                            </td>
                            <td className="px-3 py-2.5 text-center font-semibold text-foreground">
                              {p.metrics.interestedContacts.total}
                            </td>
                            <td className="px-3 py-2.5 text-center font-bold text-blue-600 dark:text-blue-400">
                              {p.metrics.returnVisits.visited}
                            </td>
                            <td className="px-3 py-2.5 text-center">
                              {p.metrics.returnVisits.missed > 0 ? (
                                <span className="font-bold text-amber-600 dark:text-amber-400">
                                  {p.metrics.returnVisits.missed}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">0</span>
                              )}
                            </td>
                            <td className="px-3 py-2.5 text-center font-bold text-purple-600 dark:text-purple-400">
                              {p.metrics.bibleStudies.conducted}
                            </td>
                            <td className="px-3 py-2.5 text-center font-medium text-foreground">
                              {p.metrics.bibleStudies.offered}
                            </td>
                            <td className="px-3 py-2.5 text-center">
                              {p.metrics.bibleStudies.missed > 0 ? (
                                <span className="font-bold text-rose-600 dark:text-rose-400">
                                  {p.metrics.bibleStudies.missed}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">0</span>
                              )}
                            </td>
                            <td className="px-4 py-2.5 text-right font-black text-emerald-600 dark:text-emerald-400">
                              {p.metrics.bibleStudies.activeCount}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ───────────────────────────────────────────────────────────────────────── */}
        {/* TAB 3: SERVICE GROUPS & PUBLISHERS PERFORMANCE */}
        {/* ───────────────────────────────────────────────────────────────────────── */}
        {tab === 'groups-publishers' && (
          <div className="space-y-6 w-full min-w-0 max-w-full">
            {/* Service Groups Section */}
            <div className="space-y-3 w-full min-w-0 max-w-full">
              <div className="flex items-center justify-between gap-2 flex-wrap min-w-0">
                <h2 className="text-base font-bold text-foreground">Service Groups Performance</h2>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => exportGroupsToCSV(groupsData, congregationName)}
                  className="rounded-xl text-xs gap-1 h-8"
                >
                  <Download size={12} />
                  <span>Export Groups CSV</span>
                </Button>
              </div>

              {groupsData.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">
                  No service groups created yet.
                </p>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 min-w-0">
                  {groupsData.map((g) => (
                    <Card
                      key={g.groupId}
                      className="bg-card border-border shadow-xs overflow-hidden min-w-0"
                    >
                      <CardContent className="p-4 space-y-3 min-w-0">
                        <div className="flex items-start justify-between gap-2 min-w-0">
                          <div className="min-w-0">
                            <h3 className="font-bold text-sm text-foreground truncate">{g.name}</h3>
                            <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                              {g.memberCount} publisher{g.memberCount === 1 ? '' : 's'}
                            </p>
                          </div>
                          <span className="font-black text-sm text-primary shrink-0">
                            {Math.round(g.avgCoveragePercent)}%
                          </span>
                        </div>

                        {/* Leadership info */}
                        <div className="p-2 rounded-xl bg-muted/40 border border-border/60 text-xs space-y-1 min-w-0">
                          <div className="flex items-center justify-between text-[11px] gap-2 min-w-0">
                            <span className="text-muted-foreground flex items-center gap-1 shrink-0">
                              <Crown size={11} className="text-amber-500" /> Overseer:
                            </span>
                            <span className="font-semibold text-foreground truncate">
                              {g.overseerName || 'Unassigned'}
                            </span>
                          </div>
                          {g.assistantOverseerName && (
                            <div className="flex items-center justify-between text-[11px] pt-0.5 border-t border-border/40 gap-2 min-w-0">
                              <span className="text-muted-foreground flex items-center gap-1 shrink-0">
                                <Shield size={11} className="text-blue-500" /> Assistant:
                              </span>
                              <span className="font-semibold text-foreground truncate">
                                {g.assistantOverseerName}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Stats */}
                        <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground pt-1 border-t border-border/60">
                          <div>
                            <span className="font-bold text-foreground text-sm">
                              {g.assignedTerritoriesCount}
                            </span>
                            <p className="text-[10px]">Territories</p>
                          </div>
                          <div>
                            <span className="font-bold text-foreground text-sm">
                              {g.workedDoors} / {g.totalDoors}
                            </span>
                            <p className="text-[10px]">Doors Worked</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* Publishers Leaderboard */}
            <Card className="bg-card border-border shadow-xs overflow-hidden w-full min-w-0 max-w-full">
              <CardHeader className="p-4 sm:p-6 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 min-w-0">
                <div className="min-w-0">
                  <CardTitle className="text-sm sm:text-base font-bold">
                    Publishers Activity Leaderboard
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Active territory assignments, completions, and field ministry visits logged
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto shrink-0">
                  <div className="relative w-full sm:w-56">
                    <Search
                      size={13}
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                    />
                    <Input
                      placeholder="Search publishers…"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="h-8 pl-8 text-xs w-full rounded-xl"
                    />
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      exportPublishersToCSV(publishersData?.publishers || [], congregationName)
                    }
                    className="w-full sm:w-auto h-8 rounded-xl text-xs gap-1.5 font-semibold justify-center"
                  >
                    <Download size={12} />
                    <span>CSV</span>
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 pt-0 w-full min-w-0 max-w-full">
                {/* 1. Mobile Card List (< md) */}
                <div className="space-y-3 block md:hidden min-w-0">
                  {filteredPublishers.map((pub) => (
                    <div
                      key={pub.userId}
                      className="p-3.5 rounded-2xl border border-border bg-background space-y-2 shadow-2xs min-w-0"
                    >
                      <div className="flex items-start justify-between gap-2 min-w-0">
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-xs text-foreground truncate">{pub.name}</p>
                          <p className="text-[10px] text-muted-foreground truncate">{pub.email}</p>
                        </div>
                        <Badge variant="outline" className="text-[10px] font-bold shrink-0">
                          {pub.activeAssignments} active
                        </Badge>
                      </div>

                      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border/60 text-center text-xs">
                        <div>
                          <p className="text-[10px] uppercase font-bold text-muted-foreground">
                            Group
                          </p>
                          <p className="font-medium text-foreground truncate mt-0.5">
                            {pub.groupName || '—'}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase font-bold text-muted-foreground">
                            Done
                          </p>
                          <p className="font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5">
                            {pub.totalCompleted}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase font-bold text-muted-foreground">
                            Visits
                          </p>
                          <p className="font-extrabold text-foreground mt-0.5">{pub.totalVisits}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* 2. Desktop Table (>= md) */}
                <div className="hidden md:block overflow-x-auto rounded-2xl border border-border w-full min-w-0 max-w-full">
                  <table className="w-full text-left text-xs border-collapse min-w-[550px]">
                    <thead>
                      <tr className="bg-muted/40 border-b border-border text-muted-foreground font-semibold">
                        <th className="py-2.5 px-3">Publisher</th>
                        <th className="py-2.5 px-3">Service Group</th>
                        <th className="py-2.5 px-3 text-center">Active</th>
                        <th className="py-2.5 px-3 text-center">Completed</th>
                        <th className="py-2.5 px-3 text-center">Total Visits</th>
                        <th className="py-2.5 px-3 text-right">Last Active</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {filteredPublishers.map((pub) => (
                        <tr key={pub.userId} className="hover:bg-muted/20 transition-colors">
                          <td className="py-2.5 px-3">
                            <p className="font-bold text-foreground">{pub.name}</p>
                            <p className="text-[10px] text-muted-foreground">{pub.email}</p>
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap text-muted-foreground">
                            {pub.groupName || <span className="italic">None</span>}
                          </td>
                          <td className="py-2.5 px-3 text-center whitespace-nowrap">
                            <Badge variant="outline" className="text-[10px] font-bold">
                              {pub.activeAssignments} active
                            </Badge>
                          </td>
                          <td className="py-2.5 px-3 text-center whitespace-nowrap font-bold text-emerald-600 dark:text-emerald-400">
                            {pub.totalCompleted}
                          </td>
                          <td className="py-2.5 px-3 text-center whitespace-nowrap font-semibold text-foreground">
                            {pub.totalVisits}
                          </td>
                          <td className="py-2.5 px-3 text-right whitespace-nowrap text-muted-foreground">
                            {pub.lastActiveDate ? formatDate(pub.lastActiveDate) : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ───────────────────────────────────────────────────────────────────────── */}
        {/* TAB 4: HOUSEHOLD & DOOR DEMOGRAPHICS */}
        {/* ───────────────────────────────────────────────────────────────────────── */}
        {tab === 'doors' && (
          <div className="space-y-6 w-full min-w-0 max-w-full">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 min-w-0">
              <Card className="bg-card border-border shadow-xs overflow-hidden min-w-0">
                <CardContent className="p-4 space-y-1 min-w-0">
                  <p className="text-[10px] uppercase font-bold text-muted-foreground truncate">
                    Total Doors Mapped
                  </p>
                  <p className="text-2xl font-black text-foreground">{doorData?.totalDoors ?? 0}</p>
                  <p className="text-[10px] text-muted-foreground truncate">
                    in territory boundaries
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-card border-border shadow-xs overflow-hidden min-w-0">
                <CardContent className="p-4 space-y-1 min-w-0">
                  <p className="text-[10px] uppercase font-bold text-muted-foreground truncate">
                    Doors Visited
                  </p>
                  <p className="text-2xl font-black text-primary">{doorData?.workedDoors ?? 0}</p>
                  <p className="text-[10px] text-muted-foreground truncate">
                    {Math.round(
                      ((doorData?.workedDoors ?? 0) / Math.max(1, doorData?.totalDoors ?? 1)) * 100
                    )}
                    % contact rate
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-card border-border shadow-xs overflow-hidden min-w-0">
                <CardContent className="p-4 space-y-1 min-w-0">
                  <p className="text-[10px] uppercase font-bold text-muted-foreground truncate">
                    Return Visits Pipeline
                  </p>
                  <p className="text-2xl font-black text-amber-600 dark:text-amber-400">
                    {doorData?.returnVisitsCount ?? 0}
                  </p>
                  <p className="text-[10px] text-muted-foreground truncate">Active follow-ups</p>
                </CardContent>
              </Card>

              <Card className="bg-card border-border shadow-xs overflow-hidden min-w-0">
                <CardContent className="p-4 space-y-1 min-w-0">
                  <p className="text-[10px] uppercase font-bold text-muted-foreground truncate">
                    Do Not Call (DNC)
                  </p>
                  <p className="text-2xl font-black text-rose-600 dark:text-rose-400">
                    {doorData?.doNotCallCount ?? 0}
                  </p>
                  <p className="text-[10px] text-muted-foreground truncate">Marked addresses</p>
                </CardContent>
              </Card>
            </div>

            {/* Door Contact Outcomes Distribution */}
            <div className="grid md:grid-cols-2 gap-4 min-w-0">
              <Card className="bg-card border-border shadow-xs overflow-hidden min-w-0">
                <CardHeader className="p-4 sm:p-6 pb-3 min-w-0">
                  <CardTitle className="text-base font-bold">Visit Outcomes Breakdown</CardTitle>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 pt-0 space-y-3 text-xs min-w-0">
                  {/* Contacted & Discussed */}
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex items-center justify-between font-semibold gap-2">
                      <span className="flex items-center gap-1.5 truncate">
                        <CheckCircle2 size={13} className="text-emerald-500 shrink-0" /> Contacted
                        &amp; Discussed
                      </span>
                      <span className="shrink-0">{doorData?.outcomeCounts.contacted ?? 0}</span>
                    </div>
                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full"
                        style={{
                          width: `${((doorData?.outcomeCounts.contacted ?? 0) / Math.max(1, doorData?.workedDoors ?? 1)) * 100}%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* Bible Study Conducted */}
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex items-center justify-between font-semibold gap-2">
                      <span className="flex items-center gap-1.5 truncate">
                        <BookOpen size={13} className="text-purple-500 shrink-0" /> Bible Study
                        Conducted
                      </span>
                      <span className="shrink-0">
                        {doorData?.outcomeCounts.studyConducted ?? 0}
                      </span>
                    </div>
                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-purple-500 rounded-full"
                        style={{
                          width: `${((doorData?.outcomeCounts.studyConducted ?? 0) / Math.max(1, doorData?.workedDoors ?? 1)) * 100}%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* Return Visits Made */}
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex items-center justify-between font-semibold gap-2">
                      <span className="flex items-center gap-1.5 truncate">
                        <RefreshCw size={13} className="text-indigo-500 shrink-0" /> Return Visits
                        Made
                      </span>
                      <span className="shrink-0">{doorData?.outcomeCounts.returnVisit ?? 0}</span>
                    </div>
                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-500 rounded-full"
                        style={{
                          width: `${((doorData?.outcomeCounts.returnVisit ?? 0) / Math.max(1, doorData?.workedDoors ?? 1)) * 100}%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* Not Home */}
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex items-center justify-between font-semibold gap-2">
                      <span className="flex items-center gap-1.5 truncate">
                        <Home size={13} className="text-amber-500 shrink-0" /> Not Home
                      </span>
                      <span className="shrink-0">{doorData?.outcomeCounts.notHome ?? 0}</span>
                    </div>
                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-500 rounded-full"
                        style={{
                          width: `${((doorData?.outcomeCounts.notHome ?? 0) / Math.max(1, doorData?.workedDoors ?? 1)) * 100}%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* Busy / Call Back */}
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex items-center justify-between font-semibold gap-2">
                      <span className="flex items-center gap-1.5 truncate">
                        <PhoneCall size={13} className="text-orange-500 shrink-0" /> Busy / Call
                        Back
                      </span>
                      <span className="shrink-0">{doorData?.outcomeCounts.busy ?? 0}</span>
                    </div>
                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-orange-500 rounded-full"
                        style={{
                          width: `${((doorData?.outcomeCounts.busy ?? 0) / Math.max(1, doorData?.workedDoors ?? 1)) * 100}%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* Literature Placed */}
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex items-center justify-between font-semibold gap-2">
                      <span className="flex items-center gap-1.5 truncate">
                        <Sparkles size={13} className="text-blue-500 shrink-0" /> Literature Placed
                      </span>
                      <span className="shrink-0">
                        {doorData?.outcomeCounts.placedLiterature ?? 0}
                      </span>
                    </div>
                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full"
                        style={{
                          width: `${((doorData?.outcomeCounts.placedLiterature ?? 0) / Math.max(1, doorData?.workedDoors ?? 1)) * 100}%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* Foreign Language */}
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex items-center justify-between font-semibold gap-2">
                      <span className="flex items-center gap-1.5 truncate">
                        <Globe size={13} className="text-cyan-500 shrink-0" /> Foreign Language
                        Contact
                      </span>
                      <span className="shrink-0">
                        {doorData?.outcomeCounts.foreignLanguage ?? 0}
                      </span>
                    </div>
                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-cyan-500 rounded-full"
                        style={{
                          width: `${((doorData?.outcomeCounts.foreignLanguage ?? 0) / Math.max(1, doorData?.workedDoors ?? 1)) * 100}%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* Minor / Youth Only */}
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex items-center justify-between font-semibold gap-2">
                      <span className="flex items-center gap-1.5 truncate">
                        <Users size={13} className="text-violet-400 shrink-0" /> Minor / Youth Only
                      </span>
                      <span className="shrink-0">{doorData?.outcomeCounts.minorOnly ?? 0}</span>
                    </div>
                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-violet-400 rounded-full"
                        style={{
                          width: `${((doorData?.outcomeCounts.minorOnly ?? 0) / Math.max(1, doorData?.workedDoors ?? 1)) * 100}%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* Inaccessible / Gated */}
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex items-center justify-between font-semibold gap-2">
                      <span className="flex items-center gap-1.5 truncate">
                        <Lock size={13} className="text-stone-500 shrink-0" /> Inaccessible / Gated
                        / Dog
                      </span>
                      <span className="shrink-0">{doorData?.outcomeCounts.inaccessible ?? 0}</span>
                    </div>
                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-stone-500 rounded-full"
                        style={{
                          width: `${((doorData?.outcomeCounts.inaccessible ?? 0) / Math.max(1, doorData?.workedDoors ?? 1)) * 100}%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* Vacant / Unoccupied */}
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex items-center justify-between font-semibold gap-2">
                      <span className="flex items-center gap-1.5 truncate">
                        <Building size={13} className="text-slate-500 shrink-0" /> Vacant /
                        Unoccupied
                      </span>
                      <span className="shrink-0">{doorData?.outcomeCounts.vacant ?? 0}</span>
                    </div>
                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-slate-500 rounded-full"
                        style={{
                          width: `${((doorData?.outcomeCounts.vacant ?? 0) / Math.max(1, doorData?.workedDoors ?? 1)) * 100}%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* Do Not Call (DNC) */}
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex items-center justify-between font-semibold gap-2">
                      <span className="flex items-center gap-1.5 truncate">
                        <AlertTriangle size={13} className="text-rose-500 shrink-0" /> Do Not Call
                        (DNC)
                      </span>
                      <span className="shrink-0">{doorData?.outcomeCounts.doNotCall ?? 0}</span>
                    </div>
                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-rose-500 rounded-full"
                        style={{
                          width: `${((doorData?.outcomeCounts.doNotCall ?? 0) / Math.max(1, doorData?.workedDoors ?? 1)) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Top Mapped Streets */}
              <Card className="bg-card border-border shadow-xs overflow-hidden min-w-0">
                <CardHeader className="p-4 sm:p-6 pb-3 min-w-0">
                  <CardTitle className="text-base font-bold">Top Streets Density</CardTitle>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 pt-0 min-w-0">
                  {doorData?.topStreets && doorData.topStreets.length > 0 ? (
                    <div className="space-y-2.5 text-xs min-w-0">
                      {doorData.topStreets.map((st) => (
                        <div
                          key={st.streetName}
                          className="flex items-center justify-between p-2 rounded-xl bg-muted/20 border border-border/50 gap-2 min-w-0"
                        >
                          <span className="font-medium text-foreground truncate min-w-0">
                            {st.streetName}
                          </span>
                          <div className="flex items-center gap-2 sm:gap-3 text-muted-foreground font-semibold shrink-0 text-[11px] sm:text-xs">
                            <span>{st.workedCount} worked</span>
                            <span className="text-foreground font-bold">{st.doorsCount} total</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground text-center py-6">
                      No street data recorded yet.
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* ───────────────────────────────────────────────────────────────────────── */}
        {/* TAB 5: MINISTRY AUDIT TIMELINE */}
        {/* ───────────────────────────────────────────────────────────────────────── */}
        {tab === 'activity' && (
          <div className="w-full min-w-0 max-w-full">
            <Card className="bg-card border-border shadow-xs overflow-hidden w-full min-w-0 max-w-full">
              <CardHeader className="p-4 sm:p-6 pb-3 min-w-0">
                <CardTitle className="text-base font-bold">
                  Ministry Event &amp; Audit Log
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Real-time chronological activity feed for assignments, completions, and returns
                </p>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 pt-0 w-full min-w-0 max-w-full">
                <div className="space-y-3 min-w-0">
                  {activityData?.assignments && activityData.assignments.length > 0 ? (
                    activityData.assignments.map((act) => (
                      <div
                        key={act.id}
                        className="p-3.5 rounded-2xl border border-border bg-background flex items-center justify-between gap-3 text-xs min-w-0"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0">
                            <Calendar size={15} />
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-foreground truncate">
                              #{act.territoryNumber} {act.territoryName} assigned to{' '}
                              {act.publisherName}
                            </p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              {act.assignedAt
                                ? new Date(act.assignedAt).toLocaleString()
                                : 'Recent'}
                            </p>
                          </div>
                        </div>
                        <Badge
                          variant="outline"
                          className="text-[9px] font-semibold text-primary shrink-0"
                        >
                          Assigned
                        </Badge>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground text-center py-8">
                      No recent assignment events recorded.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
      <BottomTabBar />
    </ProtectedPage>
  );
}
