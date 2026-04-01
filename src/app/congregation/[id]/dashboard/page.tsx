'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  Users,
  FolderOpen,
  MapPin,
  Plus,
  ClipboardList,
  ArrowRight,
  CheckCircle,
  Clock,
} from 'lucide-react';
import { fetchWithAuth } from '@/lib/api-client';
import { ProtectedPage } from '@/components/protected-page';
import { StatCard } from '@/components/stat-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { UserRole } from '@/entities/User';

interface Member {
  id: string;
  user: { name: string; email: string };
  congregationRole?: string | null;
  joinedAt: string;
}

interface Group {
  id: string;
  name: string;
  members: { id: string }[];
  createdAt: string;
}

interface Territory {
  id: string;
  number: string;
  name: string;
  status: string;
}

interface TerritoryRequest {
  id: string;
  status: string;
  publisher?: { name: string };
  requestedAt: string;
}

const statusColors: Record<string, string> = {
  available: 'text-green-700 border-green-200 bg-green-50 dark:bg-green-900/20 dark:text-green-400',
  assigned: 'text-blue-700 border-blue-200 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400',
  completed:
    'text-purple-700 border-purple-200 bg-purple-50 dark:bg-purple-900/20 dark:text-purple-400',
  archived: 'text-muted-foreground border-border bg-muted/30',
};

export default function CongregationDashboardPage() {
  const params = useParams();
  const congregationId = params?.id as string;

  const [members, setMembers] = useState<Member[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [territories, setTerritories] = useState<Territory[]>([]);
  const [requests, setRequests] = useState<TerritoryRequest[]>([]);
  const [congregation, setCongregation] = useState<{ name: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!congregationId) return;

    async function fetchAll() {
      const [congJson, memberJson, groupJson, territoryJson, requestJson] = await Promise.all([
        fetchWithAuth(`/api/congregations/${congregationId}`),
        fetchWithAuth(`/api/congregations/${congregationId}/members`),
        fetchWithAuth(`/api/congregations/${congregationId}/groups`),
        fetchWithAuth(`/api/congregations/${congregationId}/territories`),
        fetchWithAuth(`/api/congregations/${congregationId}/territory-requests?status=pending`),
      ]);

      if (congJson.data) setCongregation(congJson.data);
      if (memberJson.data) setMembers(memberJson.data);
      if (groupJson.data) setGroups(groupJson.data);
      if (territoryJson.data) setTerritories(territoryJson.data);
      if (requestJson.data) setRequests(requestJson.data);
      setLoading(false);
    }

    fetchAll().catch(() => setLoading(false));
  }, [congregationId]);

  const assignedTerritories = territories.filter((t) => t.status === 'assigned').length;
  const availableTerritories = territories.filter((t) => t.status === 'available').length;
  const pendingRequests = requests.length;

  return (
    <ProtectedPage congregationId={congregationId}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Page header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {congregation?.name ?? 'Congregation'} Dashboard
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Congregation overview and quick actions
            </p>
          </div>
          <div className="flex gap-2">
            <Button asChild size="sm" variant="outline">
              <Link href={`/congregation/${congregationId}/members`}>
                <Plus size={14} />
                Add Member
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link href={`/congregation/${congregationId}/territories`}>
                <MapPin size={14} />
                Territories
                {pendingRequests > 0 && (
                  <span className="ml-1 bg-red-500 text-white rounded-full text-[10px] w-4 h-4 flex items-center justify-center">
                    {pendingRequests}
                  </span>
                )}
              </Link>
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard
            title="Members"
            value={loading ? '—' : members.length}
            icon={Users}
            color="blue"
            loading={loading}
          />
          <StatCard
            title="Groups"
            value={loading ? '—' : groups.length}
            icon={FolderOpen}
            color="purple"
            loading={loading}
          />
          <StatCard
            title="Territories"
            value={loading ? '—' : territories.length}
            subtitle={`${availableTerritories} available`}
            icon={MapPin}
            color="green"
            loading={loading}
          />
          <StatCard
            title="Pending Requests"
            value={loading ? '—' : pendingRequests}
            icon={ClipboardList}
            color={pendingRequests > 0 ? 'orange' : 'default'}
            loading={loading}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Groups */}
          <Card>
            <CardHeader className="flex-row items-center justify-between pb-4">
              <CardTitle className="text-base flex items-center gap-2">
                <FolderOpen size={16} className="text-purple-500" />
                Groups
              </CardTitle>
              <Button asChild size="sm" variant="ghost">
                <Link href={`/congregation/${congregationId}/groups`}>
                  View All
                  <ArrowRight size={13} />
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-2">
              {loading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-12 bg-muted animate-pulse rounded-xl" />
                  ))}
                </div>
              ) : groups.length === 0 ? (
                <div className="text-center py-8">
                  <FolderOpen size={28} className="mx-auto text-muted-foreground/40 mb-2" />
                  <p className="text-sm text-muted-foreground">No groups yet</p>
                  <Button asChild size="sm" className="mt-3">
                    <Link href={`/congregation/${congregationId}/groups`}>
                      <Plus size={13} />
                      Create Group
                    </Link>
                  </Button>
                </div>
              ) : (
                groups.slice(0, 5).map((g) => (
                  <div
                    key={g.id}
                    className="flex items-center justify-between p-3 rounded-xl border border-border hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                        <FolderOpen size={12} className="text-purple-600 dark:text-purple-400" />
                      </div>
                      <span className="text-sm font-medium">{g.name}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {g.members?.length ?? 0} members
                    </span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Territories */}
          <Card>
            <CardHeader className="flex-row items-center justify-between pb-4">
              <CardTitle className="text-base flex items-center gap-2">
                <MapPin size={16} className="text-green-500" />
                Territory Status
              </CardTitle>
              <Button asChild size="sm" variant="ghost">
                <Link href={`/congregation/${congregationId}/territories`}>
                  Manage
                  <ArrowRight size={13} />
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-2">
              {loading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-12 bg-muted animate-pulse rounded-xl" />
                  ))}
                </div>
              ) : territories.length === 0 ? (
                <div className="text-center py-8">
                  <MapPin size={28} className="mx-auto text-muted-foreground/40 mb-2" />
                  <p className="text-sm text-muted-foreground">No territories yet</p>
                  <Button asChild size="sm" className="mt-3">
                    <Link href={`/congregation/${congregationId}/territories`}>
                      <Plus size={13} />
                      Add Territory
                    </Link>
                  </Button>
                </div>
              ) : (
                territories.slice(0, 5).map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between p-3 rounded-xl border border-border hover:bg-muted/30 transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium">
                        #{t.number} {t.name}
                      </p>
                    </div>
                    <Badge variant="outline" className={statusColors[t.status] ?? ''}>
                      {t.status}
                    </Badge>
                  </div>
                ))
              )}
              {!loading && territories.length > 5 && (
                <p className="text-xs text-muted-foreground text-center pt-1">
                  +{territories.length - 5} more
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Members list */}
        <Card>
          <CardHeader className="flex-row items-center justify-between pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <Users size={16} className="text-blue-500" />
              Members
            </CardTitle>
            <Button asChild size="sm" variant="ghost">
              <Link href={`/congregation/${congregationId}/members`}>
                View All
                <ArrowRight size={13} />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-12 bg-muted animate-pulse rounded-xl" />
                ))}
              </div>
            ) : members.length === 0 ? (
              <div className="text-center py-8">
                <Users size={28} className="mx-auto text-muted-foreground/40 mb-2" />
                <p className="text-sm text-muted-foreground">No members yet</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {members.slice(0, 6).map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center text-xs font-semibold text-primary">
                        {m.user?.name?.charAt(0)?.toUpperCase() ?? '?'}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{m.user?.name}</p>
                        <p className="text-xs text-muted-foreground">{m.user?.email}</p>
                      </div>
                    </div>
                    {m.congregationRole && (
                      <Badge variant="outline" className="text-xs capitalize">
                        {m.congregationRole.replace('_', ' ')}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pending territory requests */}
        {pendingRequests > 0 && (
          <Card className="border-orange-200 dark:border-orange-900/40">
            <CardHeader className="pb-4">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock size={16} className="text-orange-500" />
                Pending Territory Requests
                <Badge className="bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 ml-1">
                  {pendingRequests}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {requests.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between p-3 rounded-xl border border-orange-100 dark:border-orange-900/20 bg-orange-50/50 dark:bg-orange-900/10"
                >
                  <div className="flex items-center gap-3">
                    <Clock size={14} className="text-orange-500" />
                    <span className="text-sm">
                      {r.publisher?.name ?? 'Unknown'} requested a territory
                    </span>
                  </div>
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/congregation/${congregationId}/territories`}>Review</Link>
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </ProtectedPage>
  );
}
