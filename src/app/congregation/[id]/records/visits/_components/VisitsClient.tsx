'use client';

import { Clock, Search, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useMyVisits } from '@/hooks';
import { deleteVisitRecord } from '@/lib/record-writes';
import { timeAgo } from '@/lib/time-ago';

const outcomeColors: Record<string, string> = {
  answered: 'text-green-700 border-green-200 bg-green-50 dark:bg-green-950/40 dark:text-green-400',
  not_home: 'text-amber-700 border-amber-200 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-400',
  return_visit:
    'text-purple-700 border-purple-200 bg-purple-50 dark:bg-purple-950/40 dark:text-purple-400',
  do_not_visit: 'text-red-700 border-red-200 bg-red-50 dark:bg-red-950/40 dark:text-red-400',
  moved: 'text-muted-foreground border-border bg-muted/30',
  other: 'text-muted-foreground border-border bg-muted/30',
};

export default function VisitsClient() {
  const { visits = [], isLoading } = useMyVisits();
  const [search, setSearch] = useState('');
  const [outcomeFilter, setOutcomeFilter] = useState<string>('all');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let list = visits;
    if (outcomeFilter !== 'all') {
      list = list.filter((v) => v.outcome === outcomeFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (v) =>
          v.householdAddress?.toLowerCase().includes(q) ||
          v.notes?.toLowerCase().includes(q) ||
          v.literaturePlaced?.toLowerCase().includes(q) ||
          v.literatureLeft?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [visits, outcomeFilter, search]);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteVisitRecord(id);
      setDeleteConfirmId(null);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 min-w-0 w-full">
      <div>
        <h1 className="text-xl font-bold text-foreground">Visit Records History</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Chronological door-to-door conversation logs and returns
        </p>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap items-center">
        <div className="relative flex-1 min-w-[220px]">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            placeholder="Search notes or address…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-9 rounded-xl text-xs"
          />
        </div>

        <select
          value={outcomeFilter}
          onChange={(e) => setOutcomeFilter(e.target.value)}
          className="rounded-xl border border-input bg-background px-3 py-2 text-xs text-foreground h-9 font-medium"
        >
          <option value="all">All outcomes</option>
          <option value="answered">Answered</option>
          <option value="not_home">Not Home</option>
          <option value="return_visit">Return Visit</option>
          <option value="do_not_visit">Do Not Visit</option>
          <option value="moved">Moved</option>
          <option value="other">Other</option>
        </select>
      </div>

      {/* Visits List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 bg-muted animate-pulse rounded-2xl" />
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
          {filtered.map((v) => (
            <Card
              key={v.id}
              className="bg-card border-border shadow-xs hover:border-primary/40 transition-all"
            >
              <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-sm text-foreground truncate">
                      {v.householdAddress || 'Household Record'}
                    </p>
                    <Badge
                      variant="outline"
                      className={`text-[10px] font-bold capitalize py-0 ${outcomeColors[v.outcome] ?? ''}`}
                    >
                      {v.outcome.replace(/_/g, ' ')}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {new Date(v.visitDate).toLocaleString()} · {timeAgo(v.visitDate)}
                  </p>
                  {(v.literaturePlaced || v.literatureLeft) && (
                    <p className="text-xs text-primary font-medium">
                      Literature: {v.literaturePlaced || v.literatureLeft}
                    </p>
                  )}
                  {v.notes && (
                    <p className="text-xs text-muted-foreground/90 italic line-clamp-2">
                      &ldquo;{v.notes}&rdquo;
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 rounded-xl p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => setDeleteConfirmId(v.id)}
                    title="Delete visit record"
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

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
