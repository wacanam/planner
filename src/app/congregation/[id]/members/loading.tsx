import { Skeleton } from '@/components/ui/skeleton';

export default function MembersLoading() {
  return (
    <div className="space-y-6">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-56 rounded-md" />
          <Skeleton className="h-4 w-72 rounded-md" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-10 w-28 rounded-md" />
          <Skeleton className="h-10 w-32 rounded-md" />
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border bg-card shadow-xs">
        <Skeleton className="h-10 w-full max-w-sm rounded-md" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-28 rounded-md" />
          <Skeleton className="h-9 w-28 rounded-md" />
        </div>
      </div>

      {/* Members Table / List Skeleton */}
      <div className="rounded-xl border bg-card shadow-xs overflow-hidden">
        <div className="divide-y">
          {Array.from({ length: 6 }).map((_, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: Static skeleton array
            <div key={i} className="p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 flex-1">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-1.5 flex-1 max-w-md">
                  <Skeleton className="h-4 w-40 rounded-md" />
                  <Skeleton className="h-3 w-56 rounded-md" />
                </div>
              </div>
              <Skeleton className="h-6 w-24 rounded-full" />
              <Skeleton className="h-8 w-20 rounded-md" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
