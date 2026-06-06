'use client';

import Link from 'next/link';
import { ArrowLeft, Baby } from 'lucide-react';
import { useRequireRole } from '@/lib/hooks/use-require-role';
import { Button } from '@/components/ui/button';

// Placeholder — the create wizard ships in Etapa 3. The "+ New Child" button
// already points here so the nav is wired end-to-end.
export default function NewChildPage() {
  const { ready, allowed } = useRequireRole(['DIRECTOR', 'SUPER_ADMIN']);
  if (!ready || !allowed) return null;

  return (
    <div className="max-w-2xl space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link href="/children">
          <ArrowLeft className="mr-1 h-4 w-4" />
          Children
        </Link>
      </Button>

      <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight">
        New Child
      </h1>

      <div
        className="flex flex-col items-center justify-center rounded-lg border py-16 text-center"
        style={{ borderColor: 'var(--kc-border)' }}
      >
        <div
          className="flex h-16 w-16 items-center justify-center rounded-full"
          style={{ background: 'var(--kc-surface-2)' }}
        >
          <Baby className="h-8 w-8" style={{ color: 'var(--kc-text-4)' }} />
        </div>
        <p className="mt-4 text-sm font-medium" style={{ color: 'var(--kc-text-2)' }}>
          The new-child wizard is coming next (Etapa 3).
        </p>
        <p className="mt-1 text-xs" style={{ color: 'var(--kc-text-3)' }}>
          The backend create endpoint is already live.
        </p>
      </div>
    </div>
  );
}
