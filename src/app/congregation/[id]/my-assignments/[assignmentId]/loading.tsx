export default function Loading() {
  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6 space-y-4 animate-pulse">
      <div className="h-8 bg-muted rounded w-1/3" />
      <div className="h-10 bg-muted rounded w-full" />
      <div className="space-y-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-16 bg-muted rounded-xl" />
        ))}
      </div>
    </div>
  );
}
