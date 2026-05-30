import { Skeleton } from '@/components/ui/skeleton';

// Generic content-area skeleton. Rendered inside <main> by the dashboard layout
// while auth hydrates / the first-time-director check runs — the real Sidebar
// and Topbar stay visible around it (no full-screen skeleton). Pages with their
// own data-loading skeleton (DashboardSkeleton, StaffListSkeleton, …) take over
// once they mount.
export function ContentSkeleton() {
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-40" />
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>

      {/* Main content block */}
      <Skeleton className="h-64 rounded-xl" />
    </div>
  );
}
