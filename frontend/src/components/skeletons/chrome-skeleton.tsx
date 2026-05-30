import { Skeleton } from '@/components/ui/skeleton';

// Sidebar + Topbar skeletons — mirror the real chrome's dimensions so the swap
// from skeleton → real (on auth hydration) doesn't shift layout. No element is
// ever empty: logo, nav rows and footer items all show animated placeholders.

export function SidebarSkeleton() {
  return (
    <div
      className="relative flex h-full w-56 flex-col border-r"
      style={{ background: 'var(--kc-surface)', borderColor: 'var(--kc-border)' }}
      aria-hidden="true"
    >
      {/* Header (logo + name) */}
      <div className="flex h-16 items-center gap-2.5 border-b px-3" style={{ borderColor: 'var(--kc-border)' }}>
        <Skeleton className="h-8 w-8 rounded-lg" />
        <Skeleton className="h-5 w-28" />
      </div>

      {/* Nav items */}
      <div className="flex-1 space-y-1 p-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-3 py-2">
            <Skeleton className="h-4 w-4 rounded flex-none" />
            <Skeleton className="h-4 flex-1 max-w-[130px]" />
          </div>
        ))}
      </div>

      {/* Footer (settings + logout) */}
      <div className="border-t p-2 space-y-1" style={{ borderColor: 'var(--kc-border)' }}>
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-3 py-2">
            <Skeleton className="h-4 w-4 rounded flex-none" />
            <Skeleton className="h-4 flex-1 max-w-[90px]" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function TopbarSkeleton() {
  return (
    <div
      className="flex h-16 items-center justify-between border-b px-3 md:px-6"
      style={{ background: 'var(--kc-surface)', borderColor: 'var(--kc-border)' }}
      aria-hidden="true"
    >
      {/* Mobile hamburger */}
      <Skeleton className="h-8 w-8 rounded lg:hidden" />
      <div className="flex-1 lg:flex-none" />

      {/* Right cluster: theme + kiosk + avatar + identity */}
      <div className="flex items-center gap-2">
        <Skeleton className="h-8 w-8 rounded-full" />
        <Skeleton className="h-8 w-20 rounded-md" />
        <div className="flex items-center gap-2 ml-1">
          <Skeleton className="h-9 w-9 rounded-full" />
          <div className="hidden md:flex flex-col gap-1.5">
            <Skeleton className="h-3.5 w-28" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
      </div>
    </div>
  );
}
