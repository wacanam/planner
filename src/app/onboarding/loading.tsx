import { Skeleton } from '@/components/ui/skeleton';

export default function OnboardingLoading() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="w-full max-w-lg p-6 sm:p-8 rounded-2xl border bg-card shadow-xs space-y-6">
        <div className="space-y-2 text-center flex flex-col items-center">
          <Skeleton className="h-12 w-12 rounded-xl mb-2" />
          <Skeleton className="h-7 w-56 rounded-md" />
          <Skeleton className="h-4 w-72 rounded-md" />
        </div>

        <div className="space-y-4">
          <Skeleton className="h-11 w-full rounded-md" />
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: Static skeleton array
              <div key={i} className="p-4 rounded-xl border flex items-center justify-between">
                <div className="space-y-1">
                  <Skeleton className="h-4 w-40 rounded-md" />
                  <Skeleton className="h-3 w-28 rounded-md" />
                </div>
                <Skeleton className="h-8 w-16 rounded-md" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
