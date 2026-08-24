import { Skeleton } from '@/components/ui/skeleton';

export default function TerritoryDetailLoading() {
  return (
    <div className="space-y-6">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-8 rounded-md" />
            <Skeleton className="h-8 w-56 rounded-md" />
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
          <Skeleton className="h-4 w-72 rounded-md" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-10 w-28 rounded-md" />
          <Skeleton className="h-10 w-32 rounded-md" />
        </div>
      </div>

      {/* Map & Overview Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map Viewport Card */}
        <div className="lg:col-span-2 rounded-xl border bg-card p-4 shadow-xs space-y-3">
          <Skeleton className="h-72 sm:h-96 w-full rounded-lg" />
        </div>

        {/* Territory Info Card */}
        <div className="rounded-xl border bg-card p-6 shadow-xs space-y-5">
          <Skeleton className="h-6 w-36 rounded-md" />

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg border bg-muted/40 space-y-1">
              <Skeleton className="h-3 w-16 rounded-md" />
              <Skeleton className="h-6 w-10 rounded-md" />
            </div>
            <div className="p-3 rounded-lg border bg-muted/40 space-y-1">
              <Skeleton className="h-3 w-16 rounded-md" />
              <Skeleton className="h-6 w-10 rounded-md" />
            </div>
            <div className="p-3 rounded-lg border bg-muted/40 space-y-1">
              <Skeleton className="h-3 w-20 rounded-md" />
              <Skeleton className="h-6 w-12 rounded-md" />
            </div>
            <div className="p-3 rounded-lg border bg-muted/40 space-y-1">
              <Skeleton className="h-3 w-20 rounded-md" />
              <Skeleton className="h-6 w-16 rounded-md" />
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t">
            <Skeleton className="h-4 w-28 rounded-md" />
            <Skeleton className="h-9 w-full rounded-md" />
          </div>
        </div>
      </div>

      {/* Households Table / List Skeleton */}
      <div className="rounded-xl border bg-card shadow-xs overflow-hidden">
        <div className="p-4 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <Skeleton className="h-5 w-40 rounded-md" />
          <Skeleton className="h-9 w-32 rounded-md" />
        </div>
        <div className="divide-y">
          {Array.from({ length: 4 }).map((_, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: Static skeleton array
            <div key={i} className="p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 flex-1">
                <Skeleton className="h-8 w-12 rounded-md" />
                <div className="space-y-1 flex-1">
                  <Skeleton className="h-4 w-48 rounded-md" />
                  <Skeleton className="h-3 w-32 rounded-md" />
                </div>
              </div>
              <Skeleton className="h-6 w-20 rounded-full" />
              <Skeleton className="h-8 w-20 rounded-md" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
