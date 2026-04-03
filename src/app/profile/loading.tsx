export default function ProfileLoading() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Header skeleton */}
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-muted animate-pulse" />
          <div className="h-8 w-40 bg-muted rounded animate-pulse" />
        </div>

        {/* Profile info card skeleton */}
        <div className="border border-border rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-muted animate-pulse" />
            <div className="space-y-2">
              <div className="h-5 w-32 bg-muted rounded animate-pulse" />
              <div className="h-4 w-48 bg-muted rounded animate-pulse" />
              <div className="h-4 w-20 bg-muted rounded animate-pulse" />
            </div>
          </div>
        </div>

        {/* Update name form skeleton */}
        <div className="border border-border rounded-xl p-6 space-y-4">
          <div className="h-5 w-28 bg-muted rounded animate-pulse" />
          <div className="h-10 w-full bg-muted rounded animate-pulse" />
          <div className="h-9 w-24 bg-muted rounded animate-pulse" />
        </div>

        {/* Change password card skeleton */}
        <div className="border border-border rounded-xl p-6 space-y-4">
          <div className="h-5 w-36 bg-muted rounded animate-pulse" />
          <div className="h-10 w-full bg-muted rounded animate-pulse" />
          <div className="h-10 w-full bg-muted rounded animate-pulse" />
          <div className="h-10 w-full bg-muted rounded animate-pulse" />
          <div className="h-9 w-36 bg-muted rounded animate-pulse" />
        </div>
      </div>
    </div>
  );
}
