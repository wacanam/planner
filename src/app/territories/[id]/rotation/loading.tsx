export default function Loading() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-pulse">
      <div className="h-7 w-40 rounded-lg bg-muted" />
      <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
        <div className="h-5 w-32 rounded bg-muted" />
        {[1,2,3].map(i => <div key={i} className="h-16 rounded-xl bg-muted" />)}
      </div>
    </div>
  );
}
