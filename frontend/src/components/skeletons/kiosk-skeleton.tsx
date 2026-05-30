import { Skeleton } from '@/components/ui/skeleton';

// Fullscreen kiosk home skeleton (spec: "header, 2 cards grandes") — shown
// while the kiosk session token resolves on /kiosk.
export function KioskSkeleton() {
  return (
    <div className="flex flex-col h-full">
      {/* Header: logo + name + clock + exit */}
      <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--kc-border)' }}>
        <div className="flex items-center gap-3">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="space-y-1.5">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-3 w-52" />
          </div>
        </div>
        <Skeleton className="h-9 w-28 rounded-md" />
      </div>

      {/* 2 big cards */}
      <div className="flex-1 flex items-center justify-center gap-6">
        {Array.from({ length: 2 }).map((_, i) => (
          <Skeleton key={i} className="rounded-2xl" style={{ width: 220, height: 220 }} />
        ))}
      </div>
    </div>
  );
}

// Kiosk-settings (dashboard) skeleton — header + PIN btn, stats, launch, activity.
export function KioskSettingsSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <div className="space-y-2">
            <Skeleton className="h-7 w-40" />
            <Skeleton className="h-4 w-56" />
          </div>
        </div>
        <Skeleton className="h-8 w-28 rounded-md" />
      </div>

      {/* Stats cards */}
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-xl border py-3 px-4 flex items-center gap-3" style={{ borderColor: 'var(--kc-border)' }}>
            <Skeleton className="h-8 w-8 rounded-lg" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-4 w-16" />
            </div>
          </div>
        ))}
      </div>

      {/* Launch card */}
      <div className="rounded-xl border py-5 px-5 flex items-center justify-between" style={{ borderColor: 'var(--kc-border)' }}>
        <div className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-64" />
        </div>
        <Skeleton className="h-10 w-32 rounded-md" />
      </div>

      {/* Recent activity */}
      <div className="rounded-xl border p-4 space-y-3" style={{ borderColor: 'var(--kc-border)' }}>
        <Skeleton className="h-5 w-40" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}
