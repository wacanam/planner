export default function NotificationsLoading() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-4">
      <div className="h-8 w-40 rounded-lg bg-muted animate-pulse" />
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex gap-4 items-start rounded-xl border border-border p-4">
          <div className="w-9 h-9 rounded-full bg-muted animate-pulse shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-1/2 rounded bg-muted animate-pulse" />
            <div className="h-3 w-3/4 rounded bg-muted animate-pulse" />
            <div className="h-3 w-1/4 rounded bg-muted animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}
