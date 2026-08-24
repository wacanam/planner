import { Skeleton } from '@/components/ui/skeleton';

export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      {/* Header Banner Skeleton */}
      <div className="rounded-2xl border bg-card p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-7 w-64 rounded-md" />
          <Skeleton className="h-4 w-96 rounded-md" />
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-36 rounded-md" />
          <Skeleton className="h-10 w-36 rounded-md" />
        </div>
      </div>

      {/* 4 Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: Static skeleton array
          <div key={i} className="p-5 rounded-xl border bg-card shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-24 rounded-md" />
              <Skeleton className="h-8 w-8 rounded-lg" />
            </div>
            <Skeleton className="h-8 w-16 rounded-md" />
            <Skeleton className="h-3 w-32 rounded-md" />
          </div>
        ))}
      </div>

      {/* Main Grid: Coverage Progress + Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coverage Progress Card */}
        <div className="lg:col-span-2 rounded-xl border bg-card p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b">
            <Skeleton className="h-5 w-40 rounded-md" />
            <Skeleton className="h-8 w-24 rounded-md" />
          </div>
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: Static skeleton array
              <div key={i} className="space-y-2">
                <div className="flex justify-between">
                  <Skeleton className="h-4 w-32 rounded-md" />
                  <Skeleton className="h-4 w-12 rounded-md" />
                </div>
                <Skeleton className="h-3 w-full rounded-full" />
              </div>
            ))}
          </div>
        </div>

        {/* Quick Links / Recent Activity */}
        <div className="rounded-xl border bg-card p-6 shadow-xs space-y-4">
          <Skeleton className="h-5 w-32 rounded-md pb-2 border-b" />
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: Static skeleton array
              <div key={i} className="flex items-center gap-3 py-2">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="space-y-1 flex-1">
                  <Skeleton className="h-4 w-28 rounded-md" />
                  <Skeleton className="h-3 w-36 rounded-md" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
