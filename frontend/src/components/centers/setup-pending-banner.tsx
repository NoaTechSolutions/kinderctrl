'use client';

import { AlertTriangle } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';

export function SetupPendingBanner() {
  const { t } = useTranslation();

  return (
    <div
      role="status"
      className="rounded-lg border p-4 flex items-start gap-3"
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
      <div className="min-w-0">
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
    </div>
  );
}
