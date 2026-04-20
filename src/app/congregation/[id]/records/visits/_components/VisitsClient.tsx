'use client';

import { Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useMyVisits } from '@/hooks';

const outcomeColors: Record<string, string> = {
  answered: 'text-green-700 border-green-200 bg-green-50 dark:bg-green-900/20 dark:text-green-400',
  not_home: 'text-yellow-700 border-yellow-200 bg-yellow-50',
  return_visit: 'text-purple-700 border-purple-200 bg-purple-50',
  do_not_visit: 'text-red-700 border-red-200 bg-red-50',
  moved: 'text-muted-foreground border-border bg-muted/30',
  other: 'text-muted-foreground border-border bg-muted/30',
};

const outcomeLabels: Record<string, string> = {
  answered: 'Answered',
  not_home: 'Not Home',
  return_visit: 'Return Visit',
  do_not_visit: 'Do Not Visit',
  moved: 'Moved',
  other: 'Other',
};

export default function VisitsClient() {
  const { visits, isLoading, error } = useMyVisits();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4 min-w-0 w-full">
      <h1 className="text-xl font-bold text-foreground">My Visits</h1>

      {error && (
        <div className="rounded-lg bg-destructive/10 text-destructive px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-muted animate-pulse rounded-xl" />
          ))}
        </div>
      ) : visits.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Clock size={40} className="text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">No visits logged yet.</p>
          <p className="text-xs text-muted-foreground mt-1">Log visits from your Assignments tab.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {visits.map((v) => (
            <div key={v.id} className="rounded-2xl border border-border bg-card p-4 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium truncate">
                  {v.householdAddress ?? v.householdId}
                  {v.householdCity ? `, ${v.householdCity}` : ''}
                </p>
                <Badge variant="outline" className={outcomeColors[v.outcome] ?? ''}>
                  {outcomeLabels[v.outcome] ?? v.outcome}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {new Date(v.visitDate).toLocaleString()}
                {v.duration ? ` · ${v.duration} min` : ''}
                {v.encounterCount ? ` · ${v.encounterCount} encounter${v.encounterCount !== 1 ? 's' : ''}` : ''}
              </p>
              {v.notes && <p className="text-xs text-muted-foreground line-clamp-2">{v.notes}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

