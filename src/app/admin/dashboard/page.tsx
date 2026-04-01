'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Building2, Users, Globe, TrendingUp, Plus, ArrowRight } from 'lucide-react';
import { fetchWithAuth } from '@/lib/api-client';
import { ProtectedPage } from '@/components/protected-page';
import { StatCard } from '@/components/stat-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { UserRole } from '@/db';

interface Congregation {
  id: string;
  name: string;
  city?: string;
  country?: string;
  status: string;
  createdAt: string;
}

export default function AdminDashboardPage() {
  const { data: session } = useSession();
  const [congregations, setCongregations] = useState<Congregation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const json = await fetchWithAuth('/api/congregations');
        if (json.data) setCongregations(json.data);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const totalActive = congregations.filter((c) => c.status === 'active').length;

  return (
    <ProtectedPage requiredRole={UserRole.ADMIN}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Page header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Global Admin Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-1">
              System-wide overview of all congregations
            </p>
          </div>
          <Button asChild size="sm">
            <Link href="/admin/congregations">
              <Globe size={14} />
              Manage Congregations
            </Link>
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard
            title="Total Congregations"
            value={loading ? '—' : congregations.length}
            icon={Building2}
            color="blue"
            loading={loading}
          />
          <StatCard
            title="Active"
            value={loading ? '—' : totalActive}
            icon={TrendingUp}
            color="green"
            loading={loading}
          />
          <StatCard
            title="Inactive"
            value={loading ? '—' : congregations.length - totalActive}
            color="orange"
            loading={loading}
          />
          <StatCard
            title="Countries"
            value={
              loading ? '—' : new Set(congregations.map((c) => c.country).filter(Boolean)).size
            }
            icon={Globe}
            color="purple"
            loading={loading}
          />
        </div>

        {/* Congregations list */}
        <Card>
          <CardHeader className="flex-row items-center justify-between pb-4">
            <CardTitle className="text-base">All Congregations</CardTitle>
            <Button asChild size="sm" variant="soft">
              <Link href="/admin/congregations">
                View All
                <ArrowRight size={14} />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-14 bg-muted animate-pulse rounded-xl" />
                ))}
              </div>
            ) : congregations.length === 0 ? (
              <div className="text-center py-12">
                <Building2 size={40} className="mx-auto text-muted-foreground/40 mb-3" />
                <p className="text-sm text-muted-foreground">No congregations yet</p>
                <Button asChild size="sm" className="mt-4">
                  <Link href="/admin/congregations">
                    <Plus size={14} />
                    Create First Congregation
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {congregations.slice(0, 8).map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Building2 size={14} className="text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{c.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {[c.city, c.country].filter(Boolean).join(', ') || 'No location'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={
                          c.status === 'active'
                            ? 'text-green-700 border-green-200 bg-green-50 dark:bg-green-900/20 dark:text-green-400'
                            : 'text-muted-foreground'
                        }
                      >
                        {c.status}
                      </Badge>
                      <Button asChild size="sm" variant="ghost">
                        <Link href={`/congregation/${c.id}/dashboard`}>View</Link>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </ProtectedPage>
  );
}
