'use client';

import { Compass, FolderOpen, MapPin, Plus } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDaysAgo } from '@/lib/date-utils';
import type { DashboardContextProps } from './types';

export function ActiveTerritoryHUD({
  congregationId,
  isGroupLeaderTier,
  groupActiveAssignments,
  activeAssignments,
  assignmentsLoading,
  territoryMap,
  coverageByTerritoryId,
  groups,
  ledGroup,
}: DashboardContextProps) {
  const displayAssignments = isGroupLeaderTier ? groupActiveAssignments : activeAssignments;

  return (
    <Card
      data-tour="active-assignments"
      className="bg-card border-border shadow-xs overflow-hidden rounded-3xl"
    >
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base font-bold flex items-center gap-2">
          <Compass size={16} className="text-primary" />
          <span>
            {isGroupLeaderTier
              ? `${ledGroup?.name || 'Group'} Territory in Work`
              : 'Territory In Work'}
          </span>
        </CardTitle>
        <Button asChild variant="ghost" size="sm" className="text-xs h-8">
          <Link
            href={
              isGroupLeaderTier
                ? `/congregation/${congregationId}/territories`
                : `/congregation/${congregationId}/my-assignments`
            }
          >
            View All ({displayAssignments.length})
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        {assignmentsLoading ? (
          <div className="space-y-2">
            {[1, 2].map((i) => (
              <div key={i} className="h-20 bg-muted animate-pulse rounded-2xl" />
            ))}
          </div>
        ) : displayAssignments.length === 0 ? (
          <div className="text-center py-8 px-4 rounded-2xl bg-muted/20 border border-dashed border-border">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-3">
              <Compass size={24} />
            </div>
            <p className="text-sm font-bold text-foreground">Ready for field ministry?</p>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">
              {isGroupLeaderTier
                ? `No active territories are currently checked out in ${ledGroup?.name || 'your group'}. Check out a territory for your group to work together.`
                : "You don't have any active territories checked out right now. Browse available zones or check your return visits."}
            </p>
            <div className="flex items-center justify-center gap-2 mt-4 flex-wrap">
              <Button asChild size="sm" className="rounded-xl text-xs font-semibold gap-1.5 shadow-xs">
                <Link href={`/congregation/${congregationId}/territories?status=available`}>
                  <Compass size={14} />
                  <span>Browse Available Territories</span>
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm" className="rounded-xl text-xs font-semibold">
                <Link href={`/congregation/${congregationId}/records/households`}>
                  <span>View Door Records</span>
                </Link>
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            {displayAssignments.map((assignment, idx) => {
              const terr = territoryMap.get(assignment.territoryId);
              const number = terr?.number || assignment.territoryNumber || '—';
              const name = terr?.name || assignment.territoryName || 'Territory';
              const cov = coverageByTerritoryId.get(assignment.territoryId) || {
                totalDoors: 0,
                workedDoors: 0,
                coveragePercent: 0,
              };
              const isGroupAssignment = Boolean(assignment.serviceGroupId);
              const assignedGroup = groups.find((g) => g.id === assignment.serviceGroupId);

              return (
                <div
                  key={assignment.id}
                  className={`space-y-3.5 ${idx > 0 ? 'pt-4 border-t border-border/60' : ''}`}
                >
                  {/* Main Row: Title & Subtitle + Action Button */}
                  <div className="flex items-start justify-between gap-3 min-w-0">
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2 min-w-0 flex-wrap">
                        <Link
                          href={`/congregation/${congregationId}/territories/${assignment.territoryId}`}
                          className="font-bold text-base sm:text-lg text-foreground hover:text-primary transition-colors truncate"
                          title={`#${number} — ${name}`}
                        >
                          #{number} — {name}
                        </Link>
                        {isGroupAssignment && (
                          <Badge
                            variant="outline"
                            className="text-[10px] font-semibold bg-purple-50 text-purple-700 dark:bg-purple-950/40 border-purple-200 gap-1 shrink-0"
                          >
                            <FolderOpen size={10} />
                            <span>{assignedGroup?.name || 'Group'}</span>
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground flex items-center gap-1.5 truncate">
                        {terr?.city && (
                          <>
                            <span className="truncate">{terr.city}</span>
                            <span>•</span>
                          </>
                        )}
                        <span>
                          Assigned {assignment.assignedAt ? formatDaysAgo(assignment.assignedAt) : 'recently'}
                        </span>
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Button asChild size="sm" className="rounded-xl text-xs gap-1.5 shrink-0 shadow-xs h-9 px-3.5">
                        <Link href={`/congregation/${congregationId}/territories/${assignment.territoryId}`}>
                          <MapPin size={14} />
                          <span>Open Map</span>
                        </Link>
                      </Button>
                    </div>
                  </div>

                  {/* Full-width Door Progress Bar */}
                  {cov.totalDoors > 0 ? (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
                        <span className="font-semibold text-foreground">
                          {cov.coveragePercent}% Completed
                        </span>
                        <span>
                          {cov.workedDoors} of {cov.totalDoors} doors worked
                        </span>
                      </div>
                      <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                          style={{ width: `${cov.coveragePercent}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                      <span>No door records registered yet</span>
                      <Link
                        href={`/congregation/${congregationId}/territories/${assignment.territoryId}`}
                        className="text-primary hover:underline text-xs font-semibold"
                      >
                        Add first door →
                      </Link>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
