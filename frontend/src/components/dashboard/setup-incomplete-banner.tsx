'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AlertTriangle, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCenters } from '@/lib/hooks/use-centers';
import { useTranslation } from '@/lib/i18n';

export function SetupIncompleteBanner() {
  const { t } = useTranslation();
  const pathname = usePathname();
  const { data: centers, isLoading } = useCenters();

  if (pathname?.startsWith('/centers')) return null;
  if (isLoading) return null;
  if (!centers) return null;

  const hasActive = centers.some((c) => c.status !== 'SETUP_PENDING');
  if (hasActive) return null;

  if (centers.length === 0) {
    return (
      <div
        role="status"
        className="rounded-lg border p-4 flex items-start gap-3"
        style={{
          background: 'var(--kc-warning-bg)',
          borderColor: 'color-mix(in oklch, var(--kc-warning), transparent 70%)',
        }}
      >
        <AlertTriangle
          className="h-5 w-5 flex-none mt-0.5"
          style={{ color: 'var(--kc-warning)' }}
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <h3 className="font-medium text-sm" style={{ color: 'var(--kc-warning)' }}>
            {t('setup.dashboardNoCenterTitle')}
          </h3>
          <p className="mt-1 text-sm" style={{ color: 'var(--kc-text-2)' }}>
            {t('setup.dashboardNoCenterDescription')}
          </p>
        </div>
        <Button asChild size="sm" className="flex-none">
          <Link href="/centers/new">
            {t('setup.dashboardCreateCenter')}
            <ArrowRight className="ml-1 h-3.5 w-3.5" />
          </Link>
        </Button>
      </div>
    );
  }

  const firstPending = centers.find((c) => c.status === 'SETUP_PENDING');
  if (!firstPending) return null;

  return (
    <div
      role="status"
      className="rounded-lg border p-4 flex items-start gap-3"
      style={{
        background: 'var(--kc-warning-bg)',
        borderColor: 'color-mix(in oklch, var(--kc-warning), transparent 70%)',
      }}
    >
      <AlertTriangle
        className="h-5 w-5 flex-none mt-0.5"
        style={{ color: 'var(--kc-warning)' }}
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <h3 className="font-medium text-sm" style={{ color: 'var(--kc-warning)' }}>
          {t('setup.dashboardCompleteTitle')}
        </h3>
        <p className="mt-1 text-sm" style={{ color: 'var(--kc-text-2)' }}>
          {t('setup.dashboardCompleteDescription').replace(
            '{name}',
            firstPending.name,
          )}
        </p>
      </div>
      <Button asChild size="sm" className="flex-none">
        <Link href={`/centers/${firstPending.id}`}>
          {t('setup.dashboardContinue')}
          <ArrowRight className="ml-1 h-3.5 w-3.5" />
        </Link>
      </Button>
    </div>
  );
}
