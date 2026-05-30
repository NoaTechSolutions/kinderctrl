import { Skeleton } from '@/components/ui/skeleton';

// Profile skeleton — hero card + info cards grid.
export function ProfileSkeleton() {
  return (
    <div className="space-y-6">
      {/* Hero card */}
      <div className="rounded-xl border p-6 flex items-center gap-5" style={{ borderColor: 'var(--kc-border)' }}>
        <Skeleton className="h-20 w-20 rounded-full flex-none" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-40" />
          <div className="flex gap-2 pt-1">
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-5 w-24 rounded-full" />
          </div>
        </div>
      </div>

      {/* Info cards */}
      <div className="grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-7 rounded-xl border p-5 space-y-4" style={{ borderColor: 'var(--kc-border)' }}>
          <Skeleton className="h-5 w-40" />
          <div className="grid gap-4 sm:grid-cols-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="space-y-1.5">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-9 w-full rounded-md" />
              </div>
            ))}
          </div>
        </div>
        <div className="lg:col-span-5 rounded-xl border p-5 space-y-4" style={{ borderColor: 'var(--kc-border)' }}>
          <Skeleton className="h-5 w-32" />
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-9 w-full rounded-md" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
