import { Skeleton } from '@/components/ui/skeleton';

export default function GroupsLoading() {
  return (
    <div className="space-y-6">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48 rounded-md" />
          <Skeleton className="h-4 w-72 rounded-md" />
        </div>
        <Skeleton className="h-10 w-32 rounded-md" />
      </div>

      {/* My Group Banner */}
      <div className="p-5 rounded-2xl border bg-primary/5 border-primary/20 shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Skeleton className="h-12 w-12 rounded-xl" />
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-40 rounded-md" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
            <Skeleton className="h-3 w-56 rounded-md" />
          </div>
        </div>
        <Skeleton className="h-9 w-24 rounded-md" />
      </div>

      {/* Groups Grid Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: Static skeleton array
          <div key={i} className="p-5 rounded-xl border bg-card shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <div className="space-y-1">
                  <Skeleton className="h-5 w-32 rounded-md" />
                  <Skeleton className="h-3 w-24 rounded-md" />
                </div>
              </div>
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
            <div className="space-y-2 pt-2 border-t">
              <Skeleton className="h-3 w-40 rounded-md" />
              <Skeleton className="h-3 w-28 rounded-md" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
