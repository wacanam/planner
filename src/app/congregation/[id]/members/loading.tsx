export default function Loading() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-7 w-28 rounded-lg bg-muted" />
          <div className="h-4 w-52 rounded-lg bg-muted" />
        </div>
        <div className="h-9 w-28 rounded-lg bg-muted" />
      </div>
      <div className="flex gap-4 border-b border-border pb-0">
        <div className="h-9 w-24 rounded-t-lg bg-muted" />
        <div className="h-9 w-28 rounded-t-lg bg-muted" />
      </div>
      <div className="h-10 w-64 rounded-lg bg-muted" />
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="border-b border-border px-6 py-3 flex gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-3 flex-1 max-w-[120px] rounded bg-muted" />
          ))}
        </div>
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="border-b border-border last:border-0 px-6 py-4 flex gap-6 items-center"
          >
            <div className="flex items-center gap-3 flex-1">
              <div className="h-8 w-8 rounded-full bg-muted shrink-0" />
              <div className="space-y-1.5">
                <div className="h-3.5 w-28 rounded bg-muted" />
                <div className="h-2.5 w-40 rounded bg-muted" />
              </div>
            </div>
            <div className="h-6 w-24 rounded-full bg-muted" />
            <div className="h-3 w-20 rounded bg-muted" />
            <div className="h-7 w-16 rounded bg-muted ml-auto" />
          </div>
        ))}
      </div>
    </div>
  );
}
