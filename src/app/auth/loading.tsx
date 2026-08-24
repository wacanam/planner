import { Skeleton } from '@/components/ui/skeleton';

export default function AuthLoading() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="w-full max-w-md p-6 sm:p-8 rounded-2xl border bg-card shadow-xs space-y-6">
        <div className="space-y-2 text-center flex flex-col items-center">
          <Skeleton className="h-10 w-10 rounded-xl mb-2" />
          <Skeleton className="h-7 w-48 rounded-md" />
          <Skeleton className="h-4 w-64 rounded-md" />
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-16 rounded-md" />
            <Skeleton className="h-10 w-full rounded-md" />
          </div>
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-20 rounded-md" />
            <Skeleton className="h-10 w-full rounded-md" />
          </div>
          <Skeleton className="h-10 w-full rounded-md" />
        </div>
      </div>
    </div>
  );
}
