'use client';

import { useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { Home, Plus, Search } from 'lucide-react';
import { useHouseholds } from '@/hooks';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import type { Household } from '@/types/api';

const statusColors: Record<string, string> = {
  new: 'text-muted-foreground border-border bg-muted/30',
  active: 'text-blue-700 border-blue-200 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400',
  not_home:
    'text-yellow-700 border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20 dark:text-yellow-400',
  return_visit:
    'text-purple-700 border-purple-200 bg-purple-50 dark:bg-purple-900/20 dark:text-purple-400',
  do_not_visit: 'text-red-700 border-red-200 bg-red-50 dark:bg-red-900/20 dark:text-red-400',
  moved: 'text-muted-foreground border-border bg-muted/30',
  inactive: 'text-muted-foreground border-border bg-muted/30',
};

const statusLabels: Record<string, string> = {
  new: 'New',
  active: 'Active',
  not_home: 'Not Home',
  return_visit: 'Return Visit',
  do_not_visit: 'Do Not Visit',
  moved: 'Moved',
  inactive: 'Inactive',
};

export default function HouseholdsClient() {
  const params = useParams();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const { households, isLoading, dataSource } = useHouseholds();

  const filtered = useMemo(() => {
    let list = households as Household[];
    if (statusFilter !== 'all') list = list.filter((h) => h.status === statusFilter);
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(
        (h) =>
          h.address.toLowerCase().includes(s) ||
          h.streetName.toLowerCase().includes(s) ||
          h.city.toLowerCase().includes(s)
      );
    }
    return list;
  }, [households, search, statusFilter]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4 min-w-0 w-full">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-foreground">My Households</h1>
        <Button size="sm" onClick={() => {}}>
          <Plus size={14} />
          Add Household
        </Button>
      </div>

      {/* Data source indicator */}
      {!isLoading && dataSource === 'cache' && (
        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border border-amber-200">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
          Cached data · offline
        </span>
      )}

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            placeholder="Search by address…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground"
        >
          <option value="all">All statuses</option>
          {Object.entries(statusLabels).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 bg-muted animate-pulse rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Home size={40} className="text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">No households yet. Start by adding one.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((h) => (
            <div
              key={h.id}
              className="rounded-2xl border border-border bg-card p-4 flex items-start justify-between gap-3"
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium text-sm truncate">
                  {h.houseNumber} {h.address}, {h.streetName}
                </p>
                <p className="text-xs text-muted-foreground">
                  {h.city}
                  {h.postalCode ? `, ${h.postalCode}` : ''}
                </p>
                <div className="flex gap-2 mt-2 flex-wrap">
                  <Badge variant="outline" className={statusColors[h.status] ?? ''}>
                    {statusLabels[h.status] ?? h.status}
                  </Badge>
                  {h.type && h.type !== 'house' && (
                    <Badge variant="outline" className="capitalize text-xs">
                      {h.type.replace('_', ' ')}
                    </Badge>
                  )}
                  {h.lastVisitDate && (
                    <span className="text-xs text-muted-foreground">
                      Last visited {new Date(h.lastVisitDate).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
              <Button size="sm" variant="outline" onClick={() => {}}>
                Log Visit
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
