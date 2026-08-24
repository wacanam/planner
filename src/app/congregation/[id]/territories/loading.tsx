import { Skeleton } from '@/components/ui/skeleton';

export default function TerritoriesLoading() {
  return (
    <div className="space-y-6">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48 rounded-md" />
          <Skeleton className="h-4 w-72 rounded-md" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-10 w-28 rounded-md" />
          <Skeleton className="h-10 w-36 rounded-md" />
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border bg-card shadow-xs">
        <Skeleton className="h-10 w-full max-w-sm rounded-md" />
        <div className="flex items-center gap-2 overflow-x-auto">
          {Array.from({ length: 4 }).map((_, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: Static skeleton array
            <Skeleton key={i} className="h-8 w-20 rounded-full" />
          ))}
        </div>
      </div>

      {/* Territory Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: Static skeleton array
          <div key={i} className="p-5 rounded-xl border bg-card shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-12 rounded-lg" />
                <div className="space-y-1">
                  <Skeleton className="h-5 w-36 rounded-md" />
                  <Skeleton className="h-3 w-24 rounded-md" />
                </div>
              </div>
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>

            {/* Progress Bar Skeleton */}
            <div className="space-y-1.5 pt-2">
              <div className="flex justify-between">
                <Skeleton className="h-3 w-28 rounded-md" />
                <Skeleton className="h-3 w-10 rounded-md" />
              </div>
              <Skeleton className="h-2 w-full rounded-full" />
            </div>

            {/* Footer Skeleton */}
            <div className="flex items-center justify-between pt-3 border-t">
              <Skeleton className="h-4 w-32 rounded-md" />
              <Skeleton className="h-4 w-16 rounded-md" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
