export default function NotificationsLoading() {
  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-4">
      <div className="h-8 w-48 rounded-lg bg-muted animate-pulse" />
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex gap-4 items-start rounded-xl border border-border p-5">
          <div className="w-10 h-10 rounded-full bg-muted animate-pulse shrink-0" />
          <div className="flex-1 space-y-2.5">
            <div className="h-4 w-2/5 rounded-md bg-muted animate-pulse" />
            <div className="h-3.5 w-4/5 rounded-md bg-muted animate-pulse" />
            <div className="h-3 w-1/4 rounded-md bg-muted animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}
