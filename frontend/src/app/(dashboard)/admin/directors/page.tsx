'use client';

import { UserCog } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';

// Placeholder for the SUPER_ADMIN "Directors" admin tool. /admin/layout.tsx
// already gates this route on role=SUPER_ADMIN via useRequireRole.
export default function AdminDirectorsPage() {
  const { t } = useTranslation();

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight">
          {t('admin.directorsTitle')}
        </h1>
        <p className="mt-1.5 text-sm" style={{ color: 'var(--kc-text-3)' }}>
          {t('admin.directorsSubtitle')}
        </p>
      </div>

      <div
        className="rounded-lg border-2 border-dashed p-10 text-center"
        style={{
          borderColor: 'var(--kc-border)',
          color: 'var(--kc-text-3)',
        }}
      >
        <UserCog
          className="mx-auto h-10 w-10 mb-4"
          style={{ color: 'var(--kc-text-3)' }}
          aria-hidden
        />
        <p className="text-base font-medium" style={{ color: 'var(--kc-text-2)' }}>
          {t('admin.directorsComingSoonTitle')}
        </p>
        <p className="mt-1 text-sm">{t('admin.directorsComingSoonBody')}</p>
      </div>
    </div>
  );
}
