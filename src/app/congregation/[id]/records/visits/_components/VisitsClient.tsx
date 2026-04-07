'use client';

import { useState } from 'react';
import { Clock, ChevronDown, ChevronUp, BookOpen, User, FileText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useMyVisits } from '@/hooks';
import { timeAgo } from '@/lib/time-ago';
import type { Visit } from '@/types/api';

const outcomeColors: Record<string, string> = {
  answered: 'text-green-700 border-green-200 bg-green-50 dark:bg-green-900/20 dark:text-green-400',
  not_home: 'text-yellow-700 border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20 dark:text-yellow-400',
  return_visit: 'text-purple-700 border-purple-200 bg-purple-50 dark:bg-purple-900/20 dark:text-purple-400',
  do_not_visit: 'text-red-700 border-red-200 bg-red-50 dark:bg-red-900/20 dark:text-red-400',
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

function VisitCard({ visit }: { visit: Visit & { householdAddress?: string; householdCity?: string } }) {
  const [expanded, setExpanded] = useState(false);

  const hasDetails =
    visit.notes ||
    visit.literatureLeft ||
    visit.bibleTopicDiscussed ||
    visit.returnVisitPlanned ||
    visit.nextVisitDate;

  return (
    <div className="rounded-2xl border border-border bg-card p-4 space-y-2">
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium truncate">
            {visit.householdAddress ?? 'Unknown address'}
          </p>
          {visit.householdCity && (
            <p className="text-xs text-muted-foreground">{visit.householdCity}</p>
          )}
        </div>
        <Badge variant="outline" className={`shrink-0 ${outcomeColors[visit.outcome] ?? ''}`}>
          {outcomeLabels[visit.outcome] ?? visit.outcome}
        </Badge>
      </div>

      {/* Meta row */}
      <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
        <span className="flex items-center gap-1">
          <Clock size={11} />
          {timeAgo(visit.visitDate)}
        </span>
        {visit.duration && <span>{visit.duration} min</span>}
        {visit.returnVisitPlanned && (
          <span className="text-purple-600 dark:text-purple-400 font-medium">↩ Return visit</span>
        )}
        {visit.syncStatus === 'pending' && (
          <span className="text-amber-600 dark:text-amber-400">⏳ Pending sync</span>
        )}
      </div>

      {/* Expandable details */}
      {hasDetails && (
        <>
          <button
            type="button"
            onClick={() => setExpanded((p) => !p)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            {expanded ? 'Less' : 'Details'}
          </button>

          {expanded && (
            <div className="space-y-2 pt-1 border-t border-border">
              {visit.notes && (
                <div className="flex gap-2 text-xs">
                  <FileText size={12} className="mt-0.5 shrink-0 text-muted-foreground" />
                  <span className="text-muted-foreground">{visit.notes}</span>
                </div>
              )}
              {visit.literatureLeft && (
                <div className="flex gap-2 text-xs">
                  <BookOpen size={12} className="mt-0.5 shrink-0 text-muted-foreground" />
                  <span className="text-muted-foreground">Literature: {visit.literatureLeft}</span>
                </div>
              )}
              {visit.bibleTopicDiscussed && (
                <div className="flex gap-2 text-xs">
                  <BookOpen size={12} className="mt-0.5 shrink-0 text-muted-foreground" />
                  <span className="text-muted-foreground">Topic: {visit.bibleTopicDiscussed}</span>
                </div>
              )}
              {visit.nextVisitDate && (
                <div className="flex gap-2 text-xs">
                  <User size={12} className="mt-0.5 shrink-0 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    Next visit: {new Date(visit.nextVisitDate).toLocaleDateString()}
                    {visit.nextVisitNotes ? ` · ${visit.nextVisitNotes}` : ''}
                  </span>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function VisitsClient() {
  const { visits, isLoading, dataSource } = useMyVisits();
  const [outcomeFilter, setOutcomeFilter] = useState('all');

  const filtered = outcomeFilter === 'all'
    ? visits
    : visits.filter((v) => v.outcome === outcomeFilter);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4 min-w-0 w-full">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-foreground">My Visits</h1>
        {!isLoading && visits.length > 0 && (
          <span className="text-xs text-muted-foreground">{visits.length} total</span>
        )}
      </div>

      {!isLoading && dataSource === 'cache' && (
        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border border-amber-200">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
          Cached · offline
        </span>
      )}

      {/* Outcome filter */}
      {visits.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          <select
            value={outcomeFilter}
            onChange={(e) => setOutcomeFilter(e.target.value)}
            className="rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground"
          >
            <option value="all">All outcomes</option>
            {Object.entries(outcomeLabels).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-muted animate-pulse rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Clock size={40} className="text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">No visits logged yet.</p>
          <p className="text-xs text-muted-foreground mt-1">Log visits from your Households tab.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((v) => (
            <VisitCard key={v.id} visit={v as Visit & { householdAddress?: string; householdCity?: string }} />
          ))}
        </div>
      )}
    </div>
  );
}
