import { Skeleton } from '@/components/ui/skeleton';

export default function ProfileLoading() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header Skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-40 rounded-md" />
        <Skeleton className="h-4 w-64 rounded-md" />
      </div>

      {/* Profile Card Skeleton */}
      <div className="p-6 rounded-2xl border bg-card shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <Skeleton className="h-20 w-20 rounded-full" />
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Skeleton className="h-6 w-44 rounded-md" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
            <Skeleton className="h-4 w-56 rounded-md" />
          </div>
        </div>

        <div className="space-y-4 pt-4 border-t">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-20 rounded-md" />
              <Skeleton className="h-10 w-full rounded-md" />
            </div>
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-20 rounded-md" />
              <Skeleton className="h-10 w-full rounded-md" />
            </div>
          </div>
          <Skeleton className="h-10 w-32 rounded-md" />
        </div>
      </div>
    </div>
  );
}
