'use client';

import Link from 'next/link';
import { Building2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/lib/i18n';
import { useAuthStore } from '@/store/auth';

export function EmptyState() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  // Only DIRECTOR/SUPER_ADMIN can create centers. PARENT (and any STAFF
  // that lands here without a centerId) get a "contact admin" variant —
  // backend rejects POST /centers from them anyway, no point surfacing
  // the affordance.
  const canCreate =
    user?.role === 'DIRECTOR' || user?.role === 'SUPER_ADMIN';

  if (!canCreate) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div
          className="flex h-20 w-20 items-center justify-center rounded-full"
          style={{ background: 'var(--kc-surface-2)' }}
        >
          <Building2
            className="h-10 w-10"
            style={{ color: 'var(--kc-text-4)' }}
          />
        </div>
        <h3 className="mt-4 font-display text-lg font-semibold">
          {t('centers.noCenterAssigned')}
        </h3>
        <p
          className="mt-2 text-sm max-w-sm"
          style={{ color: 'var(--kc-text-3)' }}
        >
          {t('centers.contactAdmin')}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div
        className="flex h-20 w-20 items-center justify-center rounded-full"
        style={{ background: 'var(--kc-surface-2)' }}
      >
        <Building2
          className="h-10 w-10"
          style={{ color: 'var(--kc-text-4)' }}
        />
      </div>
      <h3 className="mt-4 font-display text-lg font-semibold">
        {t('centers.noCenters')}
      </h3>
      <p
        className="mt-2 text-sm max-w-sm"
        style={{ color: 'var(--kc-text-3)' }}
      >
        {t('centers.createFirst')}
      </p>
      <Button asChild className="mt-6">
        <Link href="/centers/new">
          <Plus className="mr-2 h-4 w-4" />
          {t('centers.create')}
        </Link>
      </Button>
    </div>
  );
}
