'use client';

import { ArrowLeft, Building2, Search } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ProtectedPage } from '@/components/protected-page';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useCongregations } from '@/hooks';
import { UserRole } from '@/lib/roles';

export default function AdminCongregationsPage() {
  const { congregations = [], isLoading: loading } = useCongregations();
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search.trim()) return congregations;
    const q = search.toLowerCase();
    return congregations.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.city?.toLowerCase().includes(q) ||
        c.country?.toLowerCase().includes(q)
    );
  }, [congregations, search]);

  return (
    <ProtectedPage requiredRole={UserRole.ADMIN}>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="icon" className="h-8 w-8 rounded-xl">
            <Link href="/admin/dashboard">
              <ArrowLeft size={16} />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Congregations Directory</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              All registered congregations on the platform
            </p>
          </div>
        </div>

        <div className="relative max-w-md">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            placeholder="Search congregations…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-10 rounded-xl text-xs"
          />
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-muted animate-pulse rounded-2xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 bg-card rounded-3xl border border-border p-6">
            <Building2 size={40} className="text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm font-semibold text-foreground">No congregations found</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((cong) => (
              <Card key={cong.id} className="bg-card border-border shadow-xs">
                <CardContent className="p-4 flex items-center justify-between gap-4 text-xs">
                  <div>
                    <p className="font-bold text-sm text-foreground">{cong.name}</p>
                    <p className="text-muted-foreground">
                      {cong.city ? `${cong.city}, ` : ''}
                      {cong.country || 'Global'} · Slug: {cong.slug}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="capitalize text-[10px] font-semibold">
                      {cong.status}
                    </Badge>
                    <Button asChild size="sm" variant="outline" className="rounded-xl text-xs h-8">
                      <Link href={`/congregation/${cong.id}/dashboard`}>View Workspace</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </ProtectedPage>
  );
}
