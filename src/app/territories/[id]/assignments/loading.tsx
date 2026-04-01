export default function Loading() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-pulse">
      <div className="h-7 w-40 rounded-lg bg-muted" />
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="border-b border-border last:border-0 px-6 py-4 flex gap-4 items-center"
          >
            <div className="flex-1 space-y-1.5">
              <div className="h-4 w-32 rounded bg-muted" />
              <div className="h-3 w-24 rounded bg-muted" />
            </div>
            <div className="h-6 w-16 rounded-full bg-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}
