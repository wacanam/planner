export default function Loading() {
  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-pulse">
      <div className="h-7 w-40 rounded-lg bg-muted" />
      <div className="rounded-2xl border border-border bg-card p-8 space-y-5">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="space-y-1.5">
            <div className="h-3.5 w-24 rounded bg-muted" />
            <div className="h-10 rounded-lg bg-muted" />
          </div>
        ))}
        <div className="h-11 rounded-lg bg-muted" />
      </div>
    </div>
  );
}
