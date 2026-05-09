'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { Button } from '@/components/ui/button';

export default function DashboardPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const accessToken = useAuthStore((s) => s.accessToken);
  const refreshToken = useAuthStore((s) => s.refreshToken);
  const hasHydrated = useAuthStore((s) => s.hasHydrated);
  const clearTokens = useAuthStore((s) => s.clearTokens);

  useEffect(() => {
    if (!hasHydrated) return;
    if (!accessToken && !refreshToken) {
      router.replace('/login');
    }
  }, [hasHydrated, accessToken, refreshToken, router]);

  if (!hasHydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Loading…
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen p-6 sm:p-12 bg-background">
      <div className="max-w-3xl mx-auto">
        <h1 className="font-display text-4xl font-semibold tracking-tight mb-2">
          Bienvenido {user.email}
        </h1>
        <p className="text-muted-foreground mb-8">
          Rol:{' '}
          <span
            className="font-semibold"
            style={{ color: 'var(--kc-p-700)' }}
          >
            {user.role}
          </span>
          {user.centerId ? (
            <>
              {' · '}
              Center: <span className="font-mono text-sm">{user.centerId}</span>
            </>
          ) : null}
        </p>

        <div className="rounded-xl border border-border bg-card p-6 mb-6">
          <p className="text-sm text-muted-foreground">
            Dashboard real en Fase 2+.
          </p>
        </div>

        <Button
          variant="outline"
          onClick={() => {
            clearTokens();
            router.replace('/login');
          }}
        >
          Logout
        </Button>
      </div>
    </div>
  );
}
