export default function Loading() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-7 w-24 rounded-lg bg-muted" />
          <div className="h-4 w-48 rounded-lg bg-muted" />
        </div>
        <div className="h-9 w-28 rounded-lg bg-muted" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1,2,3,4,5,6].map(i => (
          <div key={i} className="rounded-2xl border border-border bg-card p-5 space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-muted shrink-0" />
              <div className="space-y-1.5 flex-1">
                <div className="h-4 w-24 rounded bg-muted" />
                <div className="h-3 w-16 rounded bg-muted" />
              </div>
            </div>
            <div className="h-3 w-full rounded bg-muted" />
            <div className="h-3 w-3/4 rounded bg-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}
