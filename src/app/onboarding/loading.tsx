export default function Loading() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 px-4">
      <div className="w-full max-w-lg">
        <div className="rounded-2xl border border-border bg-card p-10 space-y-6 animate-pulse">
          <div className="flex flex-col items-center gap-4">
            <div className="w-20 h-20 rounded-3xl bg-muted" />
            <div className="h-8 w-48 rounded-xl bg-muted" />
            <div className="h-4 w-64 rounded-lg bg-muted" />
          </div>
          <div className="space-y-3">
            {[1,2,3].map(i => (
              <div key={i} className="h-20 rounded-2xl bg-muted" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
