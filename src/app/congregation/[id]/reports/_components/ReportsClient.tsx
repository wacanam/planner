'use client';

import { Activity, BarChart2, Users } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { BottomTabBar } from '@/components/bottom-tab-bar';
import { DashboardHeader } from '@/components/dashboard-header';
import { ProtectedPage } from '@/components/protected-page';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useActivityReport, useCoverageReport, usePublishersReport } from '@/hooks';
import { UserRole } from '@/lib/roles';

type Tab = 'coverage' | 'publishers' | 'activity';

export default function ReportsClient() {
  const params = useParams();
  const congregationId = (params?.id as string) || '';

  const [tab, setTab] = useState<Tab>('coverage');

  const { data: coverageData } = useCoverageReport(congregationId);
  const { data: publishersData } = usePublishersReport(congregationId);
  const { data: activityData } = useActivityReport(congregationId);

  return (
    <ProtectedPage congregationId={congregationId} requiredRole={UserRole.TERRITORY_SERVANT}>
      <DashboardHeader />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 pb-24 lg:pb-8 w-full min-w-0">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Congregation Reports & Analytics</h1>
          <p className="text-xs text-muted-foreground mt-1">
            Territory completion rates, publisher activity, and coverage statistics
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 p-1 bg-muted/40 rounded-2xl w-fit border border-border">
          <button
            type="button"
            onClick={() => setTab('coverage')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              tab === 'coverage'
                ? 'bg-card text-primary shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <BarChart2 size={14} />
            <span>Coverage Analytics</span>
          </button>

          <button
            type="button"
            onClick={() => setTab('publishers')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              tab === 'publishers'
                ? 'bg-card text-primary shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Users size={14} />
            <span>Publisher Activity</span>
          </button>

          <button
            type="button"
            onClick={() => setTab('activity')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              tab === 'activity'
                ? 'bg-card text-primary shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Activity size={14} />
            <span>Audit & Timeline</span>
          </button>
        </div>

        {/* Coverage Tab */}
        {tab === 'coverage' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Card className="bg-card border-border shadow-xs">
                <CardContent className="p-4">
                  <p className="text-[10px] uppercase font-bold text-muted-foreground">
                    Total Territories
                  </p>
                  <p className="text-2xl font-bold text-foreground mt-1">
                    {coverageData?.totalTerritories ?? 0}
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-card border-border shadow-xs">
                <CardContent className="p-4">
                  <p className="text-[10px] uppercase font-bold text-muted-foreground">
                    Average Coverage
                  </p>
                  <p className="text-2xl font-bold text-foreground mt-1">
                    {Math.round(coverageData?.avgCoveragePercent ?? 0)}%
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-card border-border shadow-xs">
                <CardContent className="p-4">
                  <p className="text-[10px] uppercase font-bold text-muted-foreground">Available</p>
                  <p className="text-2xl font-bold text-green-600 mt-1">
                    {coverageData?.byStatus?.available ?? 0}
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-card border-border shadow-xs">
                <CardContent className="p-4">
                  <p className="text-[10px] uppercase font-bold text-muted-foreground">Assigned</p>
                  <p className="text-2xl font-bold text-blue-600 mt-1">
                    {coverageData?.byStatus?.assigned ?? 0}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Territories Breakdown */}
            <Card className="bg-card border-border shadow-xs">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-bold">
                  Territories Completion Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {coverageData?.territories?.map((t) => (
                    <div
                      key={t.id}
                      className="p-3 rounded-2xl border border-border bg-background space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-bold text-xs text-foreground">
                            #{t.number} — {t.name}
                          </p>
                          {t.publisherName && (
                            <p className="text-[10px] text-muted-foreground">
                              Assigned to {t.publisherName}
                            </p>
                          )}
                        </div>
                        <span className="font-bold text-xs text-foreground">
                          {Math.round(t.coveragePercent)}%
                        </span>
                      </div>
                      <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all duration-300"
                          style={{ width: `${Math.min(t.coveragePercent, 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Publishers Tab */}
        {tab === 'publishers' && (
          <div className="space-y-3">
            {publishersData?.publishers?.map((pub) => (
              <Card key={pub.userId} className="bg-card border-border shadow-xs">
                <CardContent className="p-4 flex items-center justify-between gap-4">
                  <div>
                    <p className="font-bold text-sm text-foreground">{pub.name}</p>
                    <p className="text-xs text-muted-foreground">{pub.email}</p>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <Badge variant="outline">{pub.activeAssignments} active</Badge>
                    <Badge variant="outline" className="text-green-600">
                      {pub.totalCompleted} completed
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Activity Audit Tab */}
        {tab === 'activity' && (
          <div className="space-y-3">
            {activityData?.assignments?.map((act) => (
              <div
                key={act.id}
                className="p-4 rounded-2xl border border-border bg-card flex items-center justify-between gap-4 text-xs"
              >
                <div>
                  <p className="font-bold text-foreground">
                    #{act.territoryNumber} {act.territoryName} assigned to {act.publisherName}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {act.assignedAt ? new Date(act.assignedAt).toLocaleString() : '—'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
      <BottomTabBar />
    </ProtectedPage>
  );
}
