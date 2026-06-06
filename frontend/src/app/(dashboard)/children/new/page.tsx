'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, Building2 } from 'lucide-react';
import { useRequireRole } from '@/lib/hooks/use-require-role';
import { useAuthStore } from '@/store/auth';
import { Button } from '@/components/ui/button';
import { ChildCreateWizard } from '@/components/children/child-create-wizard';

export default function NewChildPage() {
  const { ready, allowed } = useRequireRole(['DIRECTOR', 'SUPER_ADMIN']);
  const user = useAuthStore((s) => s.user);
  const searchParams = useSearchParams();

  if (!ready || !allowed || !user) return null;

  // SA creates from a center's Children tab (→ ?centerId); DIRECTOR defaults to
  // their own center. The backend re-checks access either way.
  const centerId = searchParams.get('centerId') ?? user.centerId;

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link href="/children">
          <ArrowLeft className="mr-1 h-4 w-4" />
          Children
        </Link>
      </Button>

      <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight">
        New Child
      </h1>

      {centerId ? (
        <ChildCreateWizard centerId={centerId} />
      ) : (
        // SA without a primary center — children are center-scoped, so there's
        // nothing to create against here (the per-center SA surface is a
        // follow-up). Send them to pick a center.
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div
            className="flex h-20 w-20 items-center justify-center rounded-full"
            style={{ background: 'var(--kc-surface-2)' }}
          >
            <Building2 className="h-10 w-10" style={{ color: 'var(--kc-text-4)' }} />
          </div>
          <h3 className="mt-4 font-display text-lg font-semibold">Select a center</h3>
          <p className="mt-2 max-w-sm text-sm" style={{ color: 'var(--kc-text-3)' }}>
            Children are created within a center. Choose one first.
          </p>
          <Button asChild className="mt-6">
            <Link href="/centers">Go to Centers</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
