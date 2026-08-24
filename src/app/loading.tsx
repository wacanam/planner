import { Skeleton } from '@/components/ui/skeleton';

export default function RootLoading() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top Header Placeholder */}
      <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur px-4 lg:px-8 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded-lg" />
          <Skeleton className="h-6 w-32 rounded-md" />
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-24 rounded-md" />
          <Skeleton className="h-9 w-9 rounded-full" />
        </div>
      </header>

      {/* Main Content Layout Skeleton */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Page Title Row */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-8 w-48 rounded-md" />
            <Skeleton className="h-4 w-72 rounded-md" />
          </div>
          <Skeleton className="h-10 w-32 rounded-md" />
        </div>

        {/* KPI / Metric Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              // biome-ignore lint/suspicious/noArrayIndexKey: Static skeleton array
              key={i}
              className="p-5 rounded-xl border bg-card text-card-foreground shadow-xs space-y-3"
            >
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-24 rounded-md" />
                <Skeleton className="h-5 w-5 rounded-md" />
              </div>
              <Skeleton className="h-7 w-16 rounded-md" />
              <Skeleton className="h-3 w-36 rounded-md" />
            </div>
          ))}
        </div>

        {/* Content Section Placeholder */}
        <div className="rounded-xl border bg-card p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b">
            <Skeleton className="h-5 w-36 rounded-md" />
            <Skeleton className="h-8 w-24 rounded-md" />
          </div>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: Static skeleton array
              <div
                key={i}
                className="flex items-center justify-between py-3 border-b last:border-0"
              >
                <div className="flex items-center gap-3 flex-1">
                  <Skeleton className="h-9 w-9 rounded-lg" />
                  <div className="space-y-1 flex-1">
                    <Skeleton className="h-4 w-40 rounded-md" />
                    <Skeleton className="h-3 w-64 rounded-md" />
                  </div>
                </div>
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
