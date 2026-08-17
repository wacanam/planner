'use client';

import { ArrowLeft, BarChart2, Home, MapPin } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { BottomTabBar } from '@/components/bottom-tab-bar';
import { DashboardHeader } from '@/components/dashboard-header';
import { ProtectedPage } from '@/components/protected-page';
import { Button } from '@/components/ui/button';
import { useTerritoryAssignments, useTerritoryDetail } from '@/hooks';

export default function AssignmentVisitsClient() {
  const params = useParams<{
    id: string;
    assignmentId: string;
  }>();
  const congregationId = params?.id;
  const territoryId = params?.assignmentId ?? null;
  const backHref = `/congregation/${congregationId}/my-assignments`;

  const { territory, isLoading: territoryLoading } = useTerritoryDetail(territoryId);
  const { assignments, isLoading: assignmentsLoading } = useTerritoryAssignments(territoryId);

  const _loading = territoryLoading || assignmentsLoading;
  const _activeAssignment =
    assignments.find((a) => a.status === 'assigned') ?? assignments[0] ?? null;

  const coverageNum = territory ? parseFloat(territory.coveragePercent ?? '0') : 0;

  return (
    <ProtectedPage congregationId={congregationId}>
      <DashboardHeader />
      <main className="max-w-5xl mx-auto min-w-0 w-full py-8 px-4 sm:px-6 lg:px-8 space-y-6 pb-24 lg:pb-8">
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="icon" className="h-8 w-8 shrink-0">
            <Link href={backHref}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-foreground truncate">
              {territory
                ? `Territory #${territory.number} — ${territory.name}`
                : 'Assignment Details'}
            </h1>
            <p className="text-xs text-muted-foreground truncate">{territory?.city}</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-border bg-card p-4 space-y-1">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Home size={14} />
              <span className="text-xs font-medium">Total Doors</span>
            </div>
            <p className="text-3xl font-bold text-foreground">{territory?.householdsCount ?? 0}</p>
            <p className="text-xs text-muted-foreground">households</p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-4 space-y-1">
            <div className="flex items-center gap-2 text-muted-foreground">
              <BarChart2 size={14} />
              <span className="text-xs font-medium">Coverage</span>
            </div>
            <p className="text-3xl font-bold text-foreground">{Math.round(coverageNum)}%</p>
            <p className="text-xs text-muted-foreground">completed</p>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <Button asChild className="w-full h-11 rounded-2xl gap-2 font-semibold shadow-md">
            <Link href={`/congregation/${congregationId}/territories/${territoryId}`}>
              <MapPin size={16} />
              <span>Open Territory Studio Map</span>
            </Link>
          </Button>
          <Button asChild variant="outline" className="w-full h-11 rounded-2xl gap-2 font-semibold">
            <Link href={`/congregation/${congregationId}/records/households`}>
              <Home size={16} />
              <span>View Households Directory</span>
            </Link>
          </Button>
        </div>
      </main>
      <BottomTabBar />
    </ProtectedPage>
  );
}
