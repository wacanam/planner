'use client';

import {
  BookOpen,
  Calendar,
  Clock,
  Download,
  FileSpreadsheet,
  FileText,
  Lock,
  Mail,
  MapPin,
  Phone,
  Plus,
  Search,
  Shield,
  Sparkles,
  Trash2,
  User,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { PersonalCallDialog } from '@/components/households/PersonalCallDialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { useCurrentUser } from '@/hooks';
import {
  deletePersonalCall,
  exportPersonalCallsAsCsv,
  exportPersonalCallsAsJson,
  getPersonalCalls,
  type PersonalCallRecord,
} from '@/lib/local-first/personal-calls';

type StatusFilter = 'all' | 'return_visit' | 'bible_study' | 'interested' | 'scheduled';
type SortOption = 'next_visit' | 'updated' | 'name';

export default function PersonalNotebookClient() {
  const { user } = useCurrentUser();
  const [calls, setCalls] = useState<PersonalCallRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortBy, setSortBy] = useState<SortOption>('next_visit');

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCall, setEditingCall] = useState<PersonalCallRecord | null>(null);

  const loadCalls = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const data = await getPersonalCalls(user.id);
      setCalls(data);
    } catch (err) {
      console.error('Failed to load personal calls from IndexedDB:', err);
      toast.error('Could not load your personal notebook from this device.');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    void loadCalls();
  }, [loadCalls]);

  const handleOpenNew = () => {
    setEditingCall(null);
    setDialogOpen(true);
  };

  const handleOpenEdit = (call: PersonalCallRecord) => {
    setEditingCall(call);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string, name?: string | null) => {
    if (!confirm(`Delete "${name || 'this record'}" from your personal device notebook?`)) return;
    try {
      await deletePersonalCall(id);
      toast.info('Removed from personal notebook');
      void loadCalls();
    } catch (err: any) {
      toast.error(`Failed to delete: ${err.message}`);
    }
  };

  const handleExportJson = async () => {
    if (!user?.id) return;
    try {
      const json = await exportPersonalCallsAsJson(user.id);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `my-personal-notebook-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Downloaded notes as JSON');
    } catch {
      toast.error('Could not export JSON');
    }
  };

  const handleExportCsv = async () => {
    if (!user?.id) return;
    try {
      const csv = await exportPersonalCallsAsCsv(user.id);
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `my-personal-notebook-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Downloaded notes as CSV');
    } catch {
      toast.error('Could not export CSV');
    }
  };

  // Metrics
  const stats = useMemo(() => {
    const total = calls.length;
    const returnVisits = calls.filter((c) => c.status === 'return_visit').length;
    const bibleStudies = calls.filter((c) => c.status === 'bible_study').length;
    const scheduled = calls.filter((c) => Boolean(c.nextVisitDate)).length;
    return { total, returnVisits, bibleStudies, scheduled };
  }, [calls]);

  // Filter & Search
  const filteredCalls = useMemo(() => {
    let result = [...calls];

    if (statusFilter === 'scheduled') {
      result = result.filter((c) => Boolean(c.nextVisitDate));
    } else if (statusFilter !== 'all') {
      result = result.filter((c) => c.status === statusFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (c) =>
          c.personName?.toLowerCase().includes(q) ||
          c.address?.toLowerCase().includes(q) ||
          c.streetName?.toLowerCase().includes(q) ||
          c.notes?.toLowerCase().includes(q) ||
          c.scripturesDiscussed?.toLowerCase().includes(q) ||
          c.literaturePlaced?.toLowerCase().includes(q)
      );
    }

    // Sort
    result.sort((a, b) => {
      if (sortBy === 'next_visit') {
        if (!a.nextVisitDate && !b.nextVisitDate) return 0;
        if (!a.nextVisitDate) return 1;
        if (!b.nextVisitDate) return -1;
        return a.nextVisitDate.localeCompare(b.nextVisitDate);
      }
      if (sortBy === 'updated') {
        return new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime();
      }
      return (a.personName || '').localeCompare(b.personName || '');
    });

    return result;
  }, [calls, statusFilter, searchQuery, sortBy]);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 min-w-0 w-full">
      {/* Header & Privacy Notice */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <BookOpen className="h-6 w-6 text-primary" />
              My Personal Notebook
            </h1>
            <Badge
              variant="outline"
              className="text-[11px] gap-1 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 font-medium"
            >
              <Lock className="h-3 w-3" />
              On-Device Only
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Your private return visits, Bible studies, and scheduled callbacks stored strictly in
            this browser.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs">
                <Download className="h-3.5 w-3.5" />
                <span>Export Backup</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={handleExportJson} className="gap-2 text-xs">
                <FileText className="h-4 w-4 text-blue-500" />
                <span>Download Backup (JSON)</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportCsv} className="gap-2 text-xs">
                <FileSpreadsheet className="h-4 w-4 text-emerald-500" />
                <span>Download Spreadsheet (CSV)</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button onClick={handleOpenNew} size="sm" className="h-9 gap-1.5 text-xs shadow-xs">
            <Plus className="h-4 w-4" />
            <span>Add Return Visit</span>
          </Button>
        </div>
      </div>

      {/* Privacy Guarantee Card */}
      <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 sm:p-4 flex items-start gap-3">
        <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
          <Shield className="h-4 w-4" />
        </div>
        <div className="text-xs space-y-0.5">
          <p className="font-semibold text-foreground flex items-center gap-1.5">
            Zero Cloud Sync Guarantee
          </p>
          <p className="text-muted-foreground leading-relaxed">
            Data in your Personal Notebook belongs exclusively to you and is stored directly in your
            browser&apos;s IndexedDB. Congregation administrators, elders, and servers have{' '}
            <strong className="text-foreground">zero access</strong> to your notes, contact names,
            or study records.
          </p>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="rounded-2xl border border-border shadow-2xs">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-medium">Total Calls</span>
              <BookOpen className="h-4 w-4 text-primary" />
            </div>
            <p className="text-2xl font-bold mt-1 text-foreground">{stats.total}</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-border shadow-2xs">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-medium">Return Visits</span>
              <User className="h-4 w-4 text-blue-500" />
            </div>
            <p className="text-2xl font-bold mt-1 text-foreground">{stats.returnVisits}</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-border shadow-2xs">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-medium">Bible Studies</span>
              <Sparkles className="h-4 w-4 text-emerald-500" />
            </div>
            <p className="text-2xl font-bold mt-1 text-foreground">{stats.bibleStudies}</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-border shadow-2xs">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-medium">Scheduled</span>
              <Calendar className="h-4 w-4 text-amber-500" />
            </div>
            <p className="text-2xl font-bold mt-1 text-foreground">{stats.scheduled}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter & Search Bar */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {(
              [
                { id: 'all', label: 'All' },
                { id: 'return_visit', label: 'Return Visits' },
                { id: 'bible_study', label: 'Bible Studies' },
                { id: 'interested', label: 'Interested' },
                { id: 'scheduled', label: 'Scheduled' },
              ] as const
            ).map((tab) => (
              <button
                type="button"
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                  statusFilter === tab.id
                    ? 'bg-primary text-primary-foreground shadow-2xs'
                    : 'bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Sort Dropdown */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-muted-foreground font-medium hidden sm:inline">
              Sort:
            </span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="h-8 rounded-xl border border-border bg-background px-2 text-xs font-medium text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
            >
              <option value="next_visit">Scheduled Date (Soonest)</option>
              <option value="updated">Recently Updated</option>
              <option value="name">Person Name (A-Z)</option>
            </select>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, address, scriptures, literature, or notes..."
            className="pl-9 h-10 rounded-xl text-xs sm:text-sm bg-background border-border shadow-2xs"
          />
        </div>
      </div>

      {/* Calls List / Cards */}
      {loading ? (
        <div className="py-16 text-center text-xs text-muted-foreground">
          Loading your personal notebook from this device...
        </div>
      ) : filteredCalls.length === 0 ? (
        <div className="py-16 text-center space-y-3 rounded-2xl border border-dashed border-border bg-muted/20 p-8">
          <div className="w-12 h-12 rounded-full bg-primary/10 text-primary mx-auto flex items-center justify-center">
            <BookOpen className="h-6 w-6" />
          </div>
          <div className="space-y-1 max-w-sm mx-auto">
            <h3 className="text-sm font-bold text-foreground">No return visits found</h3>
            <p className="text-xs text-muted-foreground">
              {searchQuery || statusFilter !== 'all'
                ? 'No calls match your active search or filter.'
                : 'Your personal notebook is empty on this browser. Add return visits or transfer your cloud notes to get started.'}
            </p>
          </div>
          <div className="pt-2">
            <Button onClick={handleOpenNew} size="sm" className="h-8 text-xs gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              <span>Add First Return Visit</span>
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredCalls.map((call) => {
            const statusConfig = {
              bible_study: {
                label: 'Bible Study',
                bg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
              },
              return_visit: {
                label: 'Return Visit',
                bg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30',
              },
              interested: {
                label: 'Interested',
                bg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30',
              },
              inactive: {
                label: 'Inactive',
                bg: 'bg-muted text-muted-foreground border-border',
              },
            }[call.status] || {
              label: call.status,
              bg: 'bg-muted text-muted-foreground border-border',
            };

            return (
              <Card
                key={call.id}
                className="rounded-2xl border border-border/80 shadow-2xs hover:shadow-xs transition-shadow flex flex-col justify-between"
              >
                <CardHeader className="p-4 pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm sm:text-base text-foreground truncate">
                          {call.personName || 'Unnamed Person'}
                        </span>
                        <Badge
                          variant="outline"
                          className={`text-[10px] px-2 py-0.5 ${statusConfig.bg}`}
                        >
                          {statusConfig.label}
                        </Badge>
                      </div>

                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <MapPin className="h-3 w-3 shrink-0 text-primary/70" />
                        <span className="truncate">{call.address || 'Address not listed'}</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenEdit(call)}
                        className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground"
                        title="Edit call"
                      >
                        <Clock className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(call.id, call.personName)}
                        className="h-8 w-8 rounded-lg text-muted-foreground hover:text-destructive"
                        title="Delete call"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-4 pt-0 space-y-3 text-xs">
                  {/* Scheduled Callback Pill */}
                  {call.nextVisitDate && (
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary/10 border border-primary/20 text-primary font-medium text-[11px]">
                      <Calendar className="h-3 w-3" />
                      <span>
                        Next Visit: {new Date(call.nextVisitDate).toLocaleDateString()}
                        {call.nextVisitTime ? ` at ${call.nextVisitTime}` : ''}
                      </span>
                    </div>
                  )}

                  {/* Contact Methods */}
                  {(call.phoneNumber || call.email) && (
                    <div className="flex items-center gap-3 text-muted-foreground flex-wrap">
                      {call.phoneNumber && (
                        <a
                          href={`tel:${call.phoneNumber}`}
                          className="inline-flex items-center gap-1 hover:text-primary transition-colors"
                        >
                          <Phone className="h-3 w-3" />
                          <span>{call.phoneNumber}</span>
                        </a>
                      )}
                      {call.email && (
                        <a
                          href={`mailto:${call.email}`}
                          className="inline-flex items-center gap-1 hover:text-primary transition-colors truncate"
                        >
                          <Mail className="h-3 w-3" />
                          <span className="truncate">{call.email}</span>
                        </a>
                      )}
                    </div>
                  )}

                  {/* Scriptures & Topics */}
                  {(call.scripturesDiscussed || call.literaturePlaced) && (
                    <div className="p-2.5 rounded-xl bg-muted/40 border border-border/50 space-y-1">
                      {call.scripturesDiscussed && (
                        <p className="text-foreground font-medium flex items-center gap-1.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                            Scripture:
                          </span>
                          <span>{call.scripturesDiscussed}</span>
                        </p>
                      )}
                      {call.literaturePlaced && (
                        <p className="text-muted-foreground flex items-center gap-1.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                            Literature:
                          </span>
                          <span>{call.literaturePlaced}</span>
                        </p>
                      )}
                    </div>
                  )}

                  {/* Notes */}
                  {call.notes && (
                    <p className="text-muted-foreground text-xs leading-relaxed italic line-clamp-3">
                      &ldquo;{call.notes}&rdquo;
                    </p>
                  )}

                  {/* Card Footer Info */}
                  <div className="pt-2 flex items-center justify-between text-[10px] text-muted-foreground border-t border-border/40">
                    <span>
                      Updated {new Date(call.updatedAt || call.createdAt).toLocaleDateString()}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(call)}
                      className="text-primary font-semibold hover:underline"
                    >
                      Update notes →
                    </button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Edit / New Dialog */}
      {user?.id && (
        <PersonalCallDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          userId={user.id}
          initialCall={editingCall}
          address={editingCall?.address}
          householdId={editingCall?.householdId}
          houseNumber={editingCall?.houseNumber}
          streetName={editingCall?.streetName}
          territoryId={editingCall?.territoryId}
          onSaved={() => {
            void loadCalls();
          }}
        />
      )}
    </div>
  );
}
