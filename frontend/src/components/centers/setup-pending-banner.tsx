'use client';

import { AlertTriangle } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { HoursFormDialog } from '@/components/centers/hours-form';
import type { CenterHours } from '@/lib/types/center';

interface SetupPendingBannerProps {
  /**
   * When provided, the banner renders an inline CTA that opens the hours
   * dialog directly. Without these props the banner is informational only.
   */
  centerId?: string;
  centerName?: string;
  initialHours?: CenterHours[];
}

export function SetupPendingBanner({
  centerId,
  centerName,
  initialHours,
}: SetupPendingBannerProps) {
  const { t } = useTranslation();
  const canCta = !!centerId && !!centerName;

  return (
    <div
      role="status"
      className="rounded-lg border p-4 flex flex-col gap-3 sm:flex-row sm:items-start"
      style={{
        background: 'var(--kc-warning-bg)',
        borderColor:
          'color-mix(in oklch, var(--kc-warning), transparent 70%)',
      }}
    >
      <AlertTriangle
        className="h-5 w-5 flex-none mt-0.5"
        style={{ color: 'var(--kc-warning)' }}
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <h3 className="font-medium text-sm" style={{ color: 'var(--kc-warning)' }}>
          {t('setup.pendingTitle')}
        </h3>
        <p
          className="mt-1 text-sm"
          style={{ color: 'var(--kc-text-2)' }}
        >
          {t('setup.pendingDescription')}
        </p>
      </div>
      {canCta && (
        <div className="flex-none sm:self-center">
          <HoursFormDialog
            centerId={centerId!}
            centerName={centerName!}
            initialHours={initialHours}
            triggerStyle="primary"
          />
        </div>
      )}
    </div>
  );
}
