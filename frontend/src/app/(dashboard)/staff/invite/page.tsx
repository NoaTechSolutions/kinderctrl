'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useTranslation } from '@/lib/i18n';
import { useRequireRole } from '@/lib/hooks/use-require-role';
import { StaffInvitationForm } from '@/components/staff/staff-invitation-form';

export default function InviteStaffPage() {
  const { t } = useTranslation();
  // Same gate as /staff/new — both manual create and invite need write
  // privileges. STAFF and PARENT redirect to /dashboard.
  const { ready, allowed } = useRequireRole(['DIRECTOR', 'SUPER_ADMIN']);

  if (!ready || !allowed) return null;

  return (
    <div className="space-y-6 max-w-4xl">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link href="/staff">
          <ArrowLeft className="mr-1 h-4 w-4" />
          {t('staff.title')}
        </Link>
      </Button>

      <div>
        <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight">
          {t('staff.invite')}
        </h1>
        <p
          className="mt-1.5 text-sm"
          style={{ color: 'var(--kc-text-3)' }}
        >
          {t('staff.inviteSubtitle')}
        </p>
      </div>

      <StaffInvitationForm />
    </div>
  );
}
