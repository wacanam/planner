'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface HouseholdMarkerProps {
  title: string;
  summary?: string;
  onViewFullDetails?: () => void;
  onLogVisit?: () => void;
  onDelete?: () => void;
}

export function HouseholdMarker({
  title,
  summary,
  onViewFullDetails,
  onLogVisit,
  onDelete,
}: HouseholdMarkerProps) {
  return (
    <div className="space-y-2">
      <div>
        <p className="text-sm font-semibold">{title}</p>
        {summary ? <Badge variant="outline" className="mt-1 text-xs">{summary}</Badge> : null}
      </div>
      <div className="flex flex-wrap gap-2">
        {onLogVisit ? <Button size="sm" onClick={onLogVisit}>Log Visit</Button> : null}
        {onViewFullDetails ? <Button size="sm" variant="outline" onClick={onViewFullDetails}>View Full Details</Button> : null}
        {onDelete ? <Button size="sm" variant="destructive" onClick={onDelete}>Delete</Button> : null}
      </div>
    </div>
  );
}
