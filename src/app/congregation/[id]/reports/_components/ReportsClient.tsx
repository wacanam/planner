'use client';

import {
  Activity,
  AlertTriangle,
  ArrowUpDown,
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
  Filter,
  FolderOpen,
  Globe,
  HelpCircle,
  Home,
  Layers,
  Lock,
  MapPin,
  Pencil,
  PhoneCall,
  PieChart,
  Printer,
  RefreshCw,
  Search,
  Shield,
  Sparkles,
  TrendingUp,
  UserCheck,
  Users,
} from 'lucide-react';
import Link from 'next/link';
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
  useActivityReport,
  useCongregation,
  useCoverageReport,
  useCurrentUser,
  useDoorAnalyticsReport,
  useGroupsReport,
  usePublishersReport,
  useS13Report,
  useUpdateAssignment,
} from '@/hooks';
import { exportFullCongregationReportPDF } from '@/lib/full-report-pdf-export';
import { canAdjustAssignmentDates } from '@/lib/permissions';
import {
  exportCoverageToCSV,
  exportGroupsToCSV,
  exportPublishersToCSV,
  exportS13ToCSV,
} from '@/lib/reports-csv-export';
import { UserRole } from '@/lib/roles';
import { exportS13ToPDF } from '@/lib/s13-pdf-export';
import type { CoverageTerritory, S13AssignmentRecord } from '@/types/api';

type Tab = 'overview' | 's13' | 'groups-publishers' | 'doors' | 'activity';

export default function ReportsClient() {
  const params = useParams();
  const congregationId = (params?.id as string) || '';

  const { user } = useCurrentUser();
  const { congregation } = useCongregation(congregationId);
  const [tab, setTab] = useState<Tab>('overview');

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [healthFilter, setHealthFilter] = useState<string>('all');
  const [s13Filter, setS13Filter] = useState<string>('all');

  // S-13 Date Adjustment state
  const [editingS13Record, setEditingS13Record] = useState<S13AssignmentRecord | null>(null);
  const [editAssignedAt, setEditAssignedAt] = useState('');
  const [editReturnedAt, setEditReturnedAt] = useState('');
  const [editDueAt, setEditDueAt] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const { update: updateAssignment, isPending: isUpdatingAssignment } = useUpdateAssignment();
  const canAdjust = canAdjustAssignmentDates(user?.role);

  // Hooks for reports
  const { data: coverageData, isLoading: coverageLoading } = useCoverageReport(congregationId);
  const { data: s13Records = [], isLoading: s13Loading } = useS13Report(congregationId);
  const { data: groupsData = [], isLoading: groupsLoading } = useGroupsReport(congregationId);
  const { data: publishersData, isLoading: publishersLoading } =
    usePublishersReport(congregationId);
  const { data: doorData, isLoading: doorLoading } = useDoorAnalyticsReport(congregationId);
  const { data: activityData, isLoading: activityLoading } = useActivityReport(congregationId);

  const congregationName = congregation?.name || 'Congregation';

  const handleOpenEditS13 = (rec: S13AssignmentRecord) => {
    setEditingS13Record(rec);
    setEditAssignedAt(rec.assignedAt ? rec.assignedAt.slice(0, 10) : '');
    setEditReturnedAt(rec.returnedAt ? rec.returnedAt.slice(0, 10) : '');
    setEditDueAt(rec.dueAt ? rec.dueAt.slice(0, 10) : '');
    setEditNotes('');
  };

  const handleSaveS13Dates = async () => {
    if (!editingS13Record) return;
    try {
      await updateAssignment({
        id: editingS13Record.id,
        assignedAt: editAssignedAt ? new Date(`${editAssignedAt}T12:00:00.000Z`).toISOString() : editingS13Record.assignedAt,
        returnedAt: editReturnedAt ? new Date(`${editReturnedAt}T12:00:00.000Z`).toISOString() : null,
        dueAt: editDueAt ? new Date(`${editDueAt}T12:00:00.000Z`).toISOString() : null,
        notes: editNotes.trim() || undefined,
      });
      toast.success('Assignment dates updated successfully');
      setEditingS13Record(null);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update assignment dates');
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
        (t.publisherName && t.publisherName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (t.groupName && t.groupName.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
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
        (rec.groupName && rec.groupName.toLowerCase().includes(searchQuery.toLowerCase()));

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
        (p.groupName && p.groupName.toLowerCase().includes(searchQuery.toLowerCase()))
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

          {/* Export & PDF Direct Download Actions */}
          <div className="flex items-center gap-2 shrink-0">
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
              className="rounded-xl text-xs gap-1.5 h-9 font-semibold text-primary border-primary/30 hover:bg-primary/5"
              title="Direct Download Full Multi-Page PDF Report"
            >
              <FileText size={13} className="text-primary" />
              <span>Download Full Report (PDF)</span>
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="rounded-xl text-xs font-semibold gap-1.5 h-9 px-3.5 shadow-xs">
                  <Download size={13} />
                  <span>Export &amp; Download</span>
                  <ChevronDown size={12} className="opacity-70" />
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
                  onClick={() => exportS13ToPDF(s13Records, congregationName)}
                  className="cursor-pointer gap-2 py-2 font-semibold text-blue-600 dark:text-blue-400"
                >
                  <FileSpreadsheet size={14} className="text-blue-600" />
                  <span>Download S-13 Record (PDF)</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => exportS13ToCSV(s13Records, congregationName)}
                  className="cursor-pointer gap-2 py-2"
                >
                  <FileSpreadsheet size={14} className="text-primary" />
                  <span>Export S-13 Record (CSV)</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() =>
                    exportCoverageToCSV(coverageData?.territories || [], congregationName)
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
          <div className="space-y-6">
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
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative">
                    <Search
                      size={13}
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                    />
                    <Input
                      placeholder="Search territories or assignees…"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="h-8 pl-8 text-xs w-48 sm:w-56 rounded-xl"
                    />
                  </div>

                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="h-8 text-xs bg-muted/40 border border-border rounded-xl px-2.5 text-foreground cursor-pointer focus:outline-none"
                  >
                    <option value="all">All Statuses</option>
                    <option value="available">Available</option>
                    <option value="assigned">Assigned</option>
                    <option value="completed">Completed</option>
                  </select>

                  <select
                    value={healthFilter}
                    onChange={(e) => setHealthFilter(e.target.value)}
                    className="h-8 text-xs bg-muted/40 border border-border rounded-xl px-2.5 text-foreground cursor-pointer focus:outline-none"
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
          <Card className="bg-card border-border shadow-xs">
            <CardHeader className="pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base font-bold">
                    Official S-13 Congregation Territory Record
                  </CardTitle>
                  <Badge variant="outline" className="text-[10px] font-mono font-bold bg-muted/60">
                    S-13 (8/19)
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Complete territory assignment history, turnaround duration, and return coverage %
                </p>
              </div>

              {/* S-13 Search & Filter Controls */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search
                    size={13}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                  />
                  <Input
                    placeholder="Search S-13 records…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-8 pl-8 text-xs w-48 sm:w-56 rounded-xl"
                  />
                </div>

                <select
                  value={s13Filter}
                  onChange={(e) => setS13Filter(e.target.value)}
                  className="h-8 text-xs bg-muted/40 border border-border rounded-xl px-2.5 text-foreground cursor-pointer focus:outline-none"
                >
                  <option value="all">All Assignments</option>
                  <option value="active">Active Only</option>
                  <option value="returned">Returned / Completed</option>
                  <option value="group">Service Groups</option>
                  <option value="personal">Personal Publishers</option>
                </select>

                <Button
                  size="sm"
                  onClick={() => exportS13ToPDF(filteredS13, congregationName)}
                  className="h-8 rounded-xl text-xs gap-1.5 font-semibold bg-primary text-primary-foreground shadow-xs"
                >
                  <FileText size={12} />
                  <span>Download S-13 PDF</span>
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => exportS13ToCSV(filteredS13, congregationName)}
                  className="h-8 rounded-xl text-xs gap-1.5 font-semibold"
                >
                  <Download size={12} />
                  <span>CSV</span>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
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
                <div className="overflow-x-auto rounded-2xl border border-border">
                  <table className="w-full text-left text-xs border-collapse">
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
                              {rec.assignedAt ? new Date(rec.assignedAt).toLocaleDateString() : '—'}
                            </td>
                            <td className="py-2.5 px-3 whitespace-nowrap">
                              {isReturned ? (
                                <span className="text-foreground font-medium">
                                  {new Date(rec.returnedAt!).toLocaleDateString()}
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
                            {canAdjust && (
                              <td className="py-2.5 px-3 text-right whitespace-nowrap">
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
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
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
                Service Overseers and Territory Servants can adjust the official assignment, return, or due dates.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Notes (Optional)</Label>
                  <Input
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    placeholder="Reason for adjustment / notes"
                    className="h-9 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
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
          )}
        </ResponsiveDialog>

        {/* ───────────────────────────────────────────────────────────────────────── */}
        {/* TAB 3: SERVICE GROUPS & PUBLISHERS PERFORMANCE */}
        {/* ───────────────────────────────────────────────────────────────────────── */}
        {tab === 'groups-publishers' && (
          <div className="space-y-6">
            {/* Service Groups Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
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
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {groupsData.map((g) => (
                    <Card key={g.groupId} className="bg-card border-border shadow-xs">
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-bold text-sm text-foreground">{g.name}</h3>
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                              {g.memberCount} publisher{g.memberCount === 1 ? '' : 's'}
                            </p>
                          </div>
                          <span className="font-black text-sm text-primary">
                            {Math.round(g.avgCoveragePercent)}%
                          </span>
                        </div>

                        {/* Leadership info */}
                        <div className="p-2 rounded-xl bg-muted/40 border border-border/60 text-xs space-y-1">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-muted-foreground flex items-center gap-1">
                              <Crown size={11} className="text-amber-500" /> Overseer:
                            </span>
                            <span className="font-semibold text-foreground truncate">
                              {g.overseerName || 'Unassigned'}
                            </span>
                          </div>
                          {g.assistantOverseerName && (
                            <div className="flex items-center justify-between text-[11px] pt-0.5 border-t border-border/40">
                              <span className="text-muted-foreground flex items-center gap-1">
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
            <Card className="bg-card border-border shadow-xs">
              <CardHeader className="pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base font-bold">
                    Publishers Activity Leaderboard
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Active territory assignments, completions, and field ministry visits logged
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search
                      size={13}
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                    />
                    <Input
                      placeholder="Search publishers…"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="h-8 pl-8 text-xs w-48 sm:w-56 rounded-xl"
                    />
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      exportPublishersToCSV(publishersData?.publishers || [], congregationName)
                    }
                    className="h-8 rounded-xl text-xs gap-1.5 font-semibold"
                  >
                    <Download size={12} />
                    <span>CSV</span>
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto rounded-2xl border border-border">
                  <table className="w-full text-left text-xs border-collapse">
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
                            {pub.lastActiveDate
                              ? new Date(pub.lastActiveDate).toLocaleDateString()
                              : '—'}
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
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
              <Card className="bg-card border-border shadow-xs">
                <CardContent className="p-4 space-y-1">
                  <p className="text-[10px] uppercase font-bold text-muted-foreground">
                    Total Doors Mapped
                  </p>
                  <p className="text-2xl font-black text-foreground">{doorData?.totalDoors ?? 0}</p>
                  <p className="text-[10px] text-muted-foreground">in territory boundaries</p>
                </CardContent>
              </Card>

              <Card className="bg-card border-border shadow-xs">
                <CardContent className="p-4 space-y-1">
                  <p className="text-[10px] uppercase font-bold text-muted-foreground">
                    Doors Visited
                  </p>
                  <p className="text-2xl font-black text-primary">{doorData?.workedDoors ?? 0}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {Math.round(
                      ((doorData?.workedDoors ?? 0) / Math.max(1, doorData?.totalDoors ?? 1)) * 100
                    )}
                    % contact rate
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-card border-border shadow-xs">
                <CardContent className="p-4 space-y-1">
                  <p className="text-[10px] uppercase font-bold text-muted-foreground">
                    Return Visits Pipeline
                  </p>
                  <p className="text-2xl font-black text-amber-600 dark:text-amber-400">
                    {doorData?.returnVisitsCount ?? 0}
                  </p>
                  <p className="text-[10px] text-muted-foreground">Active follow-ups</p>
                </CardContent>
              </Card>

              <Card className="bg-card border-border shadow-xs">
                <CardContent className="p-4 space-y-1">
                  <p className="text-[10px] uppercase font-bold text-muted-foreground">
                    Do Not Call (DNC)
                  </p>
                  <p className="text-2xl font-black text-rose-600 dark:text-rose-400">
                    {doorData?.doNotCallCount ?? 0}
                  </p>
                  <p className="text-[10px] text-muted-foreground">Marked addresses</p>
                </CardContent>
              </Card>
            </div>

            {/* Door Contact Outcomes Distribution */}
            <div className="grid md:grid-cols-2 gap-4">
              <Card className="bg-card border-border shadow-xs">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-bold">Visit Outcomes Breakdown</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-xs">
                  {/* Contacted & Discussed */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between font-semibold">
                      <span className="flex items-center gap-1.5">
                        <CheckCircle2 size={13} className="text-emerald-500" /> Contacted &amp;
                        Discussed
                      </span>
                      <span>{doorData?.outcomeCounts.contacted ?? 0}</span>
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
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between font-semibold">
                      <span className="flex items-center gap-1.5">
                        <BookOpen size={13} className="text-purple-500" /> Bible Study Conducted
                      </span>
                      <span>{doorData?.outcomeCounts.studyConducted ?? 0}</span>
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
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between font-semibold">
                      <span className="flex items-center gap-1.5">
                        <RefreshCw size={13} className="text-indigo-500" /> Return Visits Made
                      </span>
                      <span>{doorData?.outcomeCounts.returnVisit ?? 0}</span>
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
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between font-semibold">
                      <span className="flex items-center gap-1.5">
                        <Home size={13} className="text-amber-500" /> Not Home
                      </span>
                      <span>{doorData?.outcomeCounts.notHome ?? 0}</span>
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
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between font-semibold">
                      <span className="flex items-center gap-1.5">
                        <PhoneCall size={13} className="text-orange-500" /> Busy / Call Back
                      </span>
                      <span>{doorData?.outcomeCounts.busy ?? 0}</span>
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
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between font-semibold">
                      <span className="flex items-center gap-1.5">
                        <Sparkles size={13} className="text-blue-500" /> Literature Placed
                      </span>
                      <span>{doorData?.outcomeCounts.placedLiterature ?? 0}</span>
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
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between font-semibold">
                      <span className="flex items-center gap-1.5">
                        <Globe size={13} className="text-cyan-500" /> Foreign Language Contact
                      </span>
                      <span>{doorData?.outcomeCounts.foreignLanguage ?? 0}</span>
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
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between font-semibold">
                      <span className="flex items-center gap-1.5">
                        <Users size={13} className="text-violet-400" /> Minor / Youth Only
                      </span>
                      <span>{doorData?.outcomeCounts.minorOnly ?? 0}</span>
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
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between font-semibold">
                      <span className="flex items-center gap-1.5">
                        <Lock size={13} className="text-stone-500" /> Inaccessible / Gated / Dog
                      </span>
                      <span>{doorData?.outcomeCounts.inaccessible ?? 0}</span>
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
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between font-semibold">
                      <span className="flex items-center gap-1.5">
                        <Building size={13} className="text-slate-500" /> Vacant / Unoccupied
                      </span>
                      <span>{doorData?.outcomeCounts.vacant ?? 0}</span>
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
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between font-semibold">
                      <span className="flex items-center gap-1.5">
                        <AlertTriangle size={13} className="text-rose-500" /> Do Not Call (DNC)
                      </span>
                      <span>{doorData?.outcomeCounts.doNotCall ?? 0}</span>
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
              <Card className="bg-card border-border shadow-xs">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-bold">Top Streets Density</CardTitle>
                </CardHeader>
                <CardContent>
                  {doorData?.topStreets && doorData.topStreets.length > 0 ? (
                    <div className="space-y-2.5 text-xs">
                      {doorData.topStreets.map((st) => (
                        <div
                          key={st.streetName}
                          className="flex items-center justify-between p-2 rounded-xl bg-muted/20 border border-border/50"
                        >
                          <span className="font-medium text-foreground truncate max-w-[200px]">
                            {st.streetName}
                          </span>
                          <div className="flex items-center gap-3 text-muted-foreground font-semibold">
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
          <Card className="bg-card border-border shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold">Ministry Event &amp; Audit Log</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Real-time chronological activity feed for assignments, completions, and returns
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {activityData?.assignments && activityData.assignments.length > 0 ? (
                  activityData.assignments.map((act) => (
                    <div
                      key={act.id}
                      className="p-3.5 rounded-2xl border border-border bg-background flex items-center justify-between gap-4 text-xs"
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
                            {act.assignedAt ? new Date(act.assignedAt).toLocaleString() : 'Recent'}
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
        )}
      </main>
      <BottomTabBar />
    </ProtectedPage>
  );
}
