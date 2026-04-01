export default function Loading() {
  return (
    <div className="flex items-center justify-center min-h-screen px-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-10 space-y-5 animate-pulse">
        <div className="flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-muted" />
          <div className="h-7 w-40 rounded-lg bg-muted" />
          <div className="h-4 w-56 rounded-lg bg-muted" />
        </div>
        <div className="h-10 rounded-lg bg-muted" />
        <div className="h-10 rounded-lg bg-muted" />
        <div className="h-11 rounded-lg bg-muted" />
      </div>
    </div>
  );
}
