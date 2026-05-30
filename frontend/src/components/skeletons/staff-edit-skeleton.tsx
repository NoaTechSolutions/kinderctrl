import { Skeleton } from '@/components/ui/skeleton';

function FormCardSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="rounded-xl border p-5 space-y-4" style={{ borderColor: 'var(--kc-border)' }}>
      <Skeleton className="h-5 w-40" />
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: rows * 2 }).map((_, i) => (
          <div key={i} className="space-y-1.5">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-9 w-full rounded-md" />
          </div>
        ))}
      </div>
    </div>
  );
}

// Staff edit skeleton — Personal / Emergency / Security cards. Body-only:
// the page keeps its static back-link + title header.
export function StaffEditSkeleton() {
  return (
    <div className="space-y-4">
      <FormCardSkeleton rows={3} />
      <FormCardSkeleton rows={2} />
      <FormCardSkeleton rows={2} />
      <div className="flex justify-end gap-2">
        <Skeleton className="h-9 w-24 rounded-md" />
        <Skeleton className="h-9 w-32 rounded-md" />
      </div>
    </div>
  );
}
