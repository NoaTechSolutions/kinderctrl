'use client';

import Link from 'next/link';
import { Mail, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/lib/i18n';

export function EmptyState() {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div
        className="flex h-20 w-20 items-center justify-center rounded-full"
        style={{ background: 'var(--kc-surface-2)' }}
      >
        <Users
          className="h-10 w-10"
          style={{ color: 'var(--kc-text-4)' }}
        />
      </div>
      <h3 className="mt-4 font-display text-lg font-semibold">
        {t('staff.noStaff')}
      </h3>
      <p
        className="mt-2 text-sm max-w-sm"
        style={{ color: 'var(--kc-text-3)' }}
      >
        {t('staff.createFirst')}
      </p>
      {/* PO QA #28 Opción F: was "Add Manually"; now invitation is the
          only onboarding path. CTA points to the dedicated invite page. */}
      <Button asChild className="mt-6">
        <Link href="/staff/invite">
          <Mail className="mr-2 h-4 w-4" />
          {t('staff.invite')}
        </Link>
      </Button>
    </div>
  );
}
