'use client';

import { Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { Encounter } from '@/types/api';

const responseColors: Record<string, string> = {
  receptive: 'text-green-700 border-green-200 bg-green-50 dark:bg-green-900/20',
  neutral: 'text-blue-700 border-blue-200 bg-blue-50',
  not_interested: 'text-yellow-700 border-yellow-200 bg-yellow-50',
  hostile: 'text-red-700 border-red-200 bg-red-50',
  do_not_visit: 'text-red-700 border-red-200 bg-red-50',
  moved: 'text-muted-foreground border-border bg-muted/30',
};

const responseLabels: Record<string, string> = {
  receptive: 'Receptive',
  neutral: 'Neutral',
  not_interested: 'Not Interested',
  hostile: 'Hostile',
  do_not_visit: 'Do Not Visit',
  moved: 'Moved',
};

export default function EncountersClient() {
  // Placeholder — will connect to useMyEncounters hook when implemented
  const encounters: Encounter[] = [];
  const isLoading = false;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4 min-w-0 w-full">
      <h1 className="text-xl font-bold text-foreground">My Encounters</h1>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-muted animate-pulse rounded-xl" />
          ))}
        </div>
      ) : encounters.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Users size={40} className="text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">No encounters logged yet.</p>
          <p className="text-xs text-muted-foreground mt-1">Add encounters when logging a visit.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {encounters.map((e) => (
            <div
              key={e.id}
              className="rounded-2xl border border-border bg-card p-4 flex items-start justify-between gap-3"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{e.name ?? 'Unknown person'}</p>
                {e.topicDiscussed && (
                  <p className="text-xs text-muted-foreground mt-0.5">{e.topicDiscussed}</p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  {new Date(e.createdAt).toLocaleDateString()}
                </p>
              </div>
              <Badge variant="outline" className={responseColors[e.response] ?? ''}>
                {responseLabels[e.response] ?? e.response}
              </Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
