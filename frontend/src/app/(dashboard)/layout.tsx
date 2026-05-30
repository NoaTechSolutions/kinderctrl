'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Sidebar } from '@/components/layout/sidebar';
import { Topbar } from '@/components/layout/topbar';
import { MobileNav } from '@/components/layout/mobile-nav';
import { SetupIncompleteBanner } from '@/components/dashboard/setup-incomplete-banner';
import { ContentSkeleton } from '@/components/skeletons/content-skeleton';
import { SidebarSkeleton, TopbarSkeleton } from '@/components/skeletons/chrome-skeleton';
import { useAuthStore } from '@/store/auth';
import { useCenters } from '@/lib/hooks/use-centers';

export default function DashboardGroupLayout({
  children,
}: {
  children: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const accessToken = useAuthStore((s) => s.accessToken);
  const refreshToken = useAuthStore((s) => s.refreshToken);
  const user = useAuthStore((s) => s.user);
  const hasHydrated = useAuthStore((s) => s.hasHydrated);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const isAuthenticated = !!accessToken;
  const { data: centers, isFetched: centersFetched } = useCenters();

  useEffect(() => {
    if (!hasHydrated) return;
    if (!accessToken && !refreshToken) {
      router.replace('/login');
    }
  }, [hasHydrated, accessToken, refreshToken, router]);

  // First-time DIRECTOR is on /dashboard and we have not finished
  // confirming whether they have any centers yet. While this is true
  // we render a loading screen instead of the dashboard chrome so the
  // user does not see a flash of the wrong page before the redirect.
  // Otherwise, even if the useEffect below fires correctly, the user
  // sees /dashboard for the ~50-300ms window the query takes.
  const isDirectorOnDashboard =
    hasHydrated &&
    isAuthenticated &&
    pathname === '/dashboard' &&
    user?.role === 'DIRECTOR';

  // Two cases where we must NOT render the dashboard chrome:
  //  (1) Centers query has not finished yet — we do not know if a redirect
  //      is pending, so showing /dashboard could flash before redirect.
  //  (2) Query finished and centers is empty — useEffect below will fire
  //      router.replace next paint; if we render chrome on this paint, the
  //      user sees one frame of /dashboard before the redirect.
  const isCheckingFirstTime =
    isDirectorOnDashboard &&
    (!centersFetched || centers?.pagination.total === 0);

  // First-time DIRECTOR redirect: land on /dashboard with zero centers
  // -> push them straight to /centers/new (BUG-001). One-time per fresh
  // account; subsequent loads pass because useCenters() returns N>=1.
  useEffect(() => {
    if (!isDirectorOnDashboard) return;
    if (!centersFetched) return;
    if (centers?.pagination.total === 0) {
      router.replace('/centers/new');
    }
  }, [isDirectorOnDashboard, centersFetched, centers, router]);

  // Once hydrated, an unauthenticated user is redirected to /login by the
  // effect above — render nothing while that happens.
  if (hasHydrated && !accessToken && !refreshToken) {
    return null;
  }

  // Until auth hydrates, every chrome element (sidebar, topbar) shows a
  // structured skeleton instead of rendering empty/with a null user. The
  // central content also skeletons during hydration or the first-time-director
  // check; per-page skeletons take over once children mount.
  const showContentSkeleton = !hasHydrated || isCheckingFirstTime;

  return (
    // PO QA #35: was `flex h-screen overflow-hidden`. That worked in
    // principle (h-screen=100vh, overflow-hidden clips overflow) but
    // some browsers ended up reporting documentElement.scrollHeight
    // higher than body.scrollHeight, which triggered a phantom browser
    // scrollbar on top of the legitimate `<main>` scroll — "double
    // scroll" UX even though the form content was correctly contained.
    //
    // `fixed inset-0` takes this whole container OUT of the document
    // flow. Body becomes effectively empty (Providers + a fixed child
    // that contributes zero layout height). documentElement.scrollHeight
    // ≈ 0. No body scroll possible. The dashboard fills the viewport
    // exactly and the `<main>` below stays the single scrolling surface.
    //
    // Non-dashboard pages (login, accept-invitation) are untouched —
    // they don't use this layout, so body remains its natural
    // `overflow: visible` and scrolls normally.
    <div className="fixed inset-0 flex bg-background">
      <aside className="hidden lg:block flex-none">
        {hasHydrated ? <Sidebar /> : <SidebarSkeleton />}
      </aside>

      <MobileNav open={mobileNavOpen} onOpenChange={setMobileNavOpen} />

      <div className="flex flex-1 flex-col overflow-hidden">
        {hasHydrated ? (
          <Topbar onMenuClick={() => setMobileNavOpen(true)} />
        ) : (
          <TopbarSkeleton />
        )}

        <main
          className="flex-1 overflow-y-auto"
          style={{ background: 'var(--kc-bg)' }}
        >
          <div className="container mx-auto p-6 max-w-7xl space-y-4">
            {showContentSkeleton ? (
              <ContentSkeleton />
            ) : (
              <>
                <SetupIncompleteBanner />
                {children}
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
