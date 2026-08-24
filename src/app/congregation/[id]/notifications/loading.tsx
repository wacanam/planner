import { Skeleton } from '@/components/ui/skeleton';

export default function NotificationsLoading() {
  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header Skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-48 rounded-md" />
        <Skeleton className="h-4 w-64 rounded-md" />
      </div>

      {/* Notifications List Skeleton */}
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: Static skeleton array
          <div key={i} className="p-4 rounded-xl border bg-card shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <Skeleton className="h-4 w-48 rounded-md" />
              </div>
              <Skeleton className="h-3 w-20 rounded-md" />
            </div>
            <Skeleton className="h-3 w-full rounded-md" />
            <Skeleton className="h-3 w-3/4 rounded-md" />
          </div>
        ))}
      </div>
    </div>
  );
}
