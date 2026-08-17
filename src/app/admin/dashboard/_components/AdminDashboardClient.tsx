'use client';

import { Building2, Globe, Shield, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { ProtectedPage } from '@/components/protected-page';
import { StatCard } from '@/components/stat-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useCongregations } from '@/hooks';
import { UserRole } from '@/lib/roles';

export default function AdminDashboardPage() {
  const { congregations = [], isLoading: loading } = useCongregations();
  const totalActive = congregations.filter((c) => c.status === 'active').length;

  return (
    <ProtectedPage requiredRole={UserRole.ADMIN}>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Global Admin Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-1">
              System-wide overview of all registered congregations
            </p>
          </div>
          <Button asChild size="sm" className="rounded-xl text-xs gap-1.5 h-9">
            <Link href="/admin/congregations">
              <Globe size={14} />
              <span>Manage Congregations</span>
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
          <StatCard title="Platform Status" value="Operational" icon={Shield} color="purple" />
        </div>

        {/* Congregations List */}
        <Card className="bg-card border-border shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Building2 size={16} className="text-primary" />
              <span>Congregations</span>
            </CardTitle>
            <Button asChild variant="ghost" size="sm" className="text-xs">
              <Link href="/admin/congregations">View All</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 bg-muted animate-pulse rounded-2xl" />
                ))}
              </div>
            ) : congregations.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-xs text-muted-foreground">No congregations registered yet.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {congregations.slice(0, 5).map((cong) => (
                  <div
                    key={cong.id}
                    className="p-3 rounded-2xl border border-border bg-background flex items-center justify-between gap-4 text-xs"
                  >
                    <div>
                      <p className="font-bold text-foreground">{cong.name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {cong.city ? `${cong.city}, ` : ''}
                        {cong.country || 'Global'}
                      </p>
                    </div>
                    <Badge variant="outline" className="capitalize text-[10px] font-semibold">
                      {cong.status}
                    </Badge>
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
