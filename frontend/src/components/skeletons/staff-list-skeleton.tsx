import { Skeleton } from '@/components/ui/skeleton';

// Staff list skeleton — table rows (desktop) + cards (mobile). Body-only: the
// page keeps its real header + search/filter bar visible during load.
export function StaffListSkeleton() {
  return (
    <>
      {/* Table skeleton — tablet + desktop (matches the real list breakpoint
          so tablet doesn't flash card-skeletons then a table). */}
      <div className="hidden sm:block space-y-3">
        <Skeleton className="h-12 w-full" />
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>

      {/* Mobile cards — phones only (<640px). */}
      <div className="grid grid-cols-1 gap-4 sm:hidden">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-40 w-full" />
        ))}
      </div>
    </>
  );
}
