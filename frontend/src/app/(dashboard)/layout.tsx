'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/layout/sidebar';
import { Topbar } from '@/components/layout/topbar';
import { MobileNav } from '@/components/layout/mobile-nav';
import { SetupIncompleteBanner } from '@/components/dashboard/setup-incomplete-banner';
import { useAuthStore } from '@/store/auth';

export default function DashboardGroupLayout({
  children,
}: {
  children: ReactNode;
}) {
  const router = useRouter();
  const accessToken = useAuthStore((s) => s.accessToken);
  const refreshToken = useAuthStore((s) => s.refreshToken);
  const hasHydrated = useAuthStore((s) => s.hasHydrated);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    if (!hasHydrated) return;
    if (!accessToken && !refreshToken) {
      router.replace('/login');
    }
  }, [hasHydrated, accessToken, refreshToken, router]);

  if (!hasHydrated) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ color: 'var(--kc-text-3)' }}
      >
        Loading…
      </div>
    );
  }

  if (!accessToken && !refreshToken) {
    return null;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <aside className="hidden lg:block flex-none">
        <Sidebar />
      </aside>

      <MobileNav open={mobileNavOpen} onOpenChange={setMobileNavOpen} />

      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar onMenuClick={() => setMobileNavOpen(true)} />

        <main
          className="flex-1 overflow-y-auto"
          style={{ background: 'var(--kc-bg)' }}
        >
          <div className="container mx-auto p-6 max-w-7xl space-y-4">
            <SetupIncompleteBanner />
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
