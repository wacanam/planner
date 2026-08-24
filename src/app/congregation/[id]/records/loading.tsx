import { Skeleton } from '@/components/ui/skeleton';

export default function RecordsLoading() {
  return (
    <div className="space-y-6">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48 rounded-md" />
          <Skeleton className="h-4 w-72 rounded-md" />
        </div>
        <Skeleton className="h-10 w-36 rounded-md" />
      </div>

      {/* Tabs & Search Filter */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 border-b pb-2">
          <Skeleton className="h-9 w-28 rounded-md" />
          <Skeleton className="h-9 w-24 rounded-md" />
          <Skeleton className="h-9 w-28 rounded-md" />
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border bg-card shadow-xs">
          <Skeleton className="h-10 w-full max-w-sm rounded-md" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-24 rounded-md" />
            <Skeleton className="h-9 w-24 rounded-md" />
          </div>
        </div>
      </div>

      {/* Records List Cards Skeleton */}
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: Static skeleton array
          <div key={i} className="p-5 rounded-xl border bg-card shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Skeleton className="h-9 w-12 rounded-lg" />
                <div className="space-y-1">
                  <Skeleton className="h-5 w-44 rounded-md" />
                  <Skeleton className="h-3 w-28 rounded-md" />
                </div>
              </div>
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
            <Skeleton className="h-3 w-3/4 rounded-md" />
            <div className="flex items-center justify-between pt-2 border-t text-xs">
              <Skeleton className="h-3 w-32 rounded-md" />
              <Skeleton className="h-3 w-20 rounded-md" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
