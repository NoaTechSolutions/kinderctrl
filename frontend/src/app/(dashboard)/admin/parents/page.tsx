'use client';

import { UsersRound } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';

// Placeholder for the SUPER_ADMIN "Parents" admin tool. /admin/layout.tsx
// already gates this route on role=SUPER_ADMIN via useRequireRole.
// Distinct from the DIRECTOR-facing /parents module (also disabled today).
export default function AdminParentsPage() {
  const { t } = useTranslation();

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight">
          {t('admin.parentsTitle')}
        </h1>
        <p className="mt-1.5 text-sm" style={{ color: 'var(--kc-text-3)' }}>
          {t('admin.parentsSubtitle')}
        </p>
      </div>

      <div
        className="rounded-lg border-2 border-dashed p-10 text-center"
        style={{
          borderColor: 'var(--kc-border)',
          color: 'var(--kc-text-3)',
        }}
      >
        <UsersRound
          className="mx-auto h-10 w-10 mb-4"
          style={{ color: 'var(--kc-text-3)' }}
          aria-hidden
        />
        <p className="text-base font-medium" style={{ color: 'var(--kc-text-2)' }}>
          {t('admin.parentsComingSoonTitle')}
        </p>
        <p className="mt-1 text-sm">{t('admin.parentsComingSoonBody')}</p>
      </div>
    </div>
  );
}
