import { Skeleton } from '@/components/ui/skeleton';

export default function ReportsLoading() {
  return (
    <div className="space-y-6">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-56 rounded-md" />
          <Skeleton className="h-4 w-80 rounded-md" />
        </div>
        <Skeleton className="h-10 w-36 rounded-md" />
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b pb-2">
        <Skeleton className="h-9 w-36 rounded-md" />
        <Skeleton className="h-9 w-36 rounded-md" />
      </div>

      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: Static skeleton array
          <div key={i} className="p-5 rounded-xl border bg-card shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-28 rounded-md" />
              <Skeleton className="h-5 w-5 rounded-md" />
            </div>
            <Skeleton className="h-8 w-20 rounded-md" />
            <Skeleton className="h-3 w-40 rounded-md" />
          </div>
        ))}
      </div>

      {/* Report Breakdown / Table Card */}
      <div className="rounded-xl border bg-card p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-2 border-b">
          <Skeleton className="h-5 w-44 rounded-md" />
          <Skeleton className="h-8 w-28 rounded-md" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: Static skeleton array
            <div key={i} className="flex items-center justify-between py-3 border-b last:border-0">
              <div className="flex items-center gap-3">
                <Skeleton className="h-8 w-12 rounded-md" />
                <div className="space-y-1">
                  <Skeleton className="h-4 w-36 rounded-md" />
                  <Skeleton className="h-3 w-24 rounded-md" />
                </div>
              </div>
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
