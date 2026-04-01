export default function NotificationsLoading() {
  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div className="h-9 w-48 rounded-lg bg-muted animate-pulse" />
        <div className="h-9 w-32 rounded-full bg-muted animate-pulse" />
      </div>

      {/* Group label */}
      <div className="h-3 w-12 rounded bg-muted animate-pulse mb-3" />

      {/* Notification cards */}
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-start gap-3 rounded-xl border border-border bg-card p-4">
            {/* Icon */}
            <div className="w-8 h-8 rounded-full bg-muted animate-pulse shrink-0 mt-0.5" />
            {/* Content */}
            <div className="flex-1 space-y-2 min-w-0">
              <div className="h-4 w-36 rounded bg-muted animate-pulse" />
              <div className="h-3 w-full rounded bg-muted animate-pulse" />
              <div className="h-3 w-4/5 rounded bg-muted animate-pulse" />
              <div className="h-3 w-3/5 rounded bg-muted animate-pulse" />
              <div className="h-3 w-2/5 rounded bg-muted animate-pulse" />
            </div>
            {/* Mark read button */}
            <div className="h-4 w-16 rounded bg-muted animate-pulse shrink-0 mt-1" />
          </div>
        ))}
      </div>
    </div>
  );
}
