import { Skeleton } from '@/components/ui/skeleton';

// Schedules skeleton — stats cards + calendar nav + month grid. Body-only:
// the page keeps its static header (title + tabs + Create button).
export function SchedulesSkeleton() {
  return (
    <div className="space-y-6">
      {/* Stats cards */}
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border py-3 px-4 flex items-center gap-3" style={{ borderColor: 'var(--kc-border)' }}>
            <Skeleton className="h-8 w-8 rounded-lg" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-4 w-16" />
            </div>
          </div>
        ))}
      </div>

      {/* Calendar nav */}
      <div className="flex items-center justify-center gap-3">
        <Skeleton className="h-7 w-7 rounded-md" />
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-7 w-7 rounded-md" />
      </div>

      {/* Calendar grid */}
      <div className="rounded-xl border p-4" style={{ borderColor: 'var(--kc-border)' }}>
        <div className="grid grid-cols-7 gap-2 mb-2">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-full" />
          ))}
        </div>
        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: 35 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}
