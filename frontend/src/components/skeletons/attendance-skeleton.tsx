import { Skeleton } from '@/components/ui/skeleton';

// Attendance (Time Clock) skeleton — shift status card + punch buttons +
// today's entries. Body-only: the page keeps its static "Time Clock" header.
export function AttendanceSkeleton() {
  return (
    <div className="space-y-6">
      {/* Shift status + punch card */}
      <div className="rounded-xl border p-6 space-y-5" style={{ borderColor: 'var(--kc-border)' }}>
        <div className="flex items-center gap-3">
          <Skeleton className="h-3 w-3 rounded-full" />
          <Skeleton className="h-5 w-32" />
        </div>
        <Skeleton className="h-10 w-48" />
        <div className="flex flex-wrap gap-3">
          <Skeleton className="h-14 w-40 rounded-md" />
          <Skeleton className="h-14 w-40 rounded-md" />
        </div>
      </div>

      {/* Today's entries */}
      <div className="rounded-xl border p-4 space-y-3" style={{ borderColor: 'var(--kc-border)' }}>
        <Skeleton className="h-5 w-32" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}
