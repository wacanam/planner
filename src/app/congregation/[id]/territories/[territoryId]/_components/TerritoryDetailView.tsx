'use client';

import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CoverageChart } from '@/components/coverage-chart';
import { ArrowLeft, User, Users, History } from 'lucide-react';
import Link from 'next/link';
import { ProtectedPage } from '@/components/protected-page';
import { useTerritoryDetail, useTerritoryAssignments } from '@/hooks';

type Territory = {
  id: string;
  number: string;
  name: string;
  status: string;
  householdsCount: number;
  coveragePercent: number;
  notes?: string;
  createdAt: string;
};

type Assignment = {
  id: string;
  status: string;
  assignedAt: string | null;
  dueAt: string | null;
  returnedAt: string | null;
  notes: string | null;
  assigneeName: string | null;
  assigneeEmail: string | null;
  groupName: string | null;
};

const statusColors: Record<string, string> = {
  available: 'bg-green-100 text-green-800 border-green-200',
  assigned: 'bg-blue-100 text-blue-800 border-blue-200',
  completed: 'bg-purple-100 text-purple-800 border-purple-200',
  archived: 'bg-gray-100 text-gray-600 border-gray-200',
};

const assignmentStatusColors: Record<string, string> = {
  active: 'bg-blue-100 text-blue-800 border-blue-200',
  completed: 'bg-purple-100 text-purple-800 border-purple-200',
  returned: 'bg-gray-100 text-gray-600 border-gray-200',
};

function getAssigneeDisplayName(a: Assignment): string {
  return a.assigneeName ?? a.groupName ?? 'Unknown';
}

export default function TerritoryDetailView() {
  const { id: congregationId, territoryId } = useParams<{
    id: string;
    territoryId: string;
  }>();

  const { territory: territoryResponse, isLoading: territoryLoading, error: territoryError } = useTerritoryDetail(territoryId ?? null);

  const { assignments: assignmentsResponse, isLoading: assignmentsLoading } = useTerritoryAssignments(territoryId ?? '');

  const loading = territoryLoading || assignmentsLoading;
  const territory = (territoryResponse as Territory | undefined) ?? null;
  const assignments = (assignmentsResponse as Assignment[] | undefined) ?? [];
  const error = territoryError?.message ?? (!loading && !territory ? 'Territory not found' : '');

  const backHref = `/congregation/${congregationId}/territories`;

  return (
    <ProtectedPage congregationId={congregationId}>
      {loading ? (
        <div className="p-6 text-gray-500 animate-pulse">Loading...</div>
      ) : error || !territory ? (
        <div className="p-6 text-red-600">
          {error || 'Not found'}
          <Button asChild variant="link" className="ml-2">
            <Link href={backHref}>Back to territories</Link>
          </Button>
        </div>
      ) : (
        <main className="max-w-2xl mx-auto p-4 sm:p-6 space-y-6">
          <div className="flex items-center gap-3 flex-wrap">
            <Button asChild variant="ghost" size="sm">
              <Link href={backHref}>
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <h1 className="text-xl font-bold text-gray-800">
              #{territory.number} — {territory.name}
            </h1>
            <Badge
              className={`border text-xs ${statusColors[territory.status] ?? ''}`}
              variant="outline"
            >
              {territory.status}
            </Badge>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Details</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-gray-500">Households</dt>
                  <dd className="font-medium">{territory.householdsCount}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Created</dt>
                  <dd className="font-medium">
                    {new Date(territory.createdAt).toLocaleDateString()}
                  </dd>
                </div>
                {territory.notes && (
                  <div className="col-span-2">
                    <dt className="text-gray-500">Notes</dt>
                    <dd>{territory.notes}</dd>
                  </div>
                )}
              </dl>
            </CardContent>
          </Card>

          {/* Current Assignment */}
          {(() => {
            const activeAssignment = assignments.find((a) => a.status === 'active');
            if (!activeAssignment) return null;
            return (
              <Card className="border-blue-200 dark:border-blue-900/40">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    {activeAssignment.groupName ? (
                      <Users className="h-4 w-4 text-blue-500" />
                    ) : (
                      <User className="h-4 w-4 text-blue-500" />
                    )}
                    Current Assignment
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <dl className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <dt className="text-gray-500">
                        {activeAssignment.groupName ? 'Assigned Group' : 'Assigned To'}
                      </dt>
                      <dd className="font-medium">{getAssigneeDisplayName(activeAssignment)}</dd>
                    </div>
                    {activeAssignment.assignedAt && (
                      <div>
                        <dt className="text-gray-500">Assigned At</dt>
                        <dd className="font-medium">
                          {new Date(activeAssignment.assignedAt).toLocaleDateString()}
                        </dd>
                      </div>
                    )}
                    {activeAssignment.dueAt && (
                      <div>
                        <dt className="text-gray-500">Due Date</dt>
                        <dd className="font-medium">
                          {new Date(activeAssignment.dueAt).toLocaleDateString()}
                        </dd>
                      </div>
                    )}
                    {activeAssignment.notes && (
                      <div className="col-span-2">
                        <dt className="text-gray-500">Notes</dt>
                        <dd>{activeAssignment.notes}</dd>
                      </div>
                    )}
                  </dl>
                </CardContent>
              </Card>
            );
          })()}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Coverage</CardTitle>
            </CardHeader>
            <CardContent>
              <CoverageChart percent={territory.coveragePercent} label="Overall Coverage" />
            </CardContent>
          </Card>

          {/* Assignment History */}
          {(() => {
            const historyAssignments = assignments.filter((a) => a.status !== 'active');
            if (historyAssignments.length === 0) return null;
            return (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <History className="h-4 w-4 text-muted-foreground" />
                    Assignment History
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {historyAssignments.map((a) => (
                    <div
                      key={a.id}
                      className="flex items-start justify-between p-3 rounded-xl border border-border text-sm"
                    >
                      <div className="space-y-0.5">
                        <p className="font-medium">{getAssigneeDisplayName(a)}</p>
                        {a.assignedAt && (
                          <p className="text-xs text-muted-foreground">
                            Assigned: {new Date(a.assignedAt).toLocaleDateString()}
                            {a.returnedAt && (
                              <> · Returned: {new Date(a.returnedAt).toLocaleDateString()}</>
                            )}
                          </p>
                        )}
                        {a.notes && <p className="text-xs text-muted-foreground">{a.notes}</p>}
                      </div>
                      <Badge
                        variant="outline"
                        className={`text-xs capitalize ${assignmentStatusColors[a.status] ?? ''}`}
                      >
                        {a.status}
                      </Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            );
          })()}
        </main>
      )}
    </ProtectedPage>
  );
}
