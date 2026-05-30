'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Send } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useTranslation } from '@/lib/i18n';
import { useRequireRole } from '@/lib/hooks/use-require-role';
import { InvitationsTable } from '@/components/staff/invitations-table';
import { SendInvitationDialog } from '@/components/staff/send-invitation-dialog';

export default function InviteStaffPage() {
  const { t } = useTranslation();
  // Same gate as /staff/new — both manual create and invite need write
  // privileges. STAFF and PARENT redirect to /dashboard.
  const { ready, allowed } = useRequireRole(['DIRECTOR', 'SUPER_ADMIN']);
  const [dialogOpen, setDialogOpen] = useState(false);

  if (!ready || !allowed) return null;

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link href="/staff">
          <ArrowLeft className="mr-1 h-4 w-4" />
          {t('staff.title')}
        </Link>
      </Button>

      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight">
            {t('staff.invManageTitle')}
          </h1>
          <p
            className="mt-1.5 text-sm"
            style={{ color: 'var(--kc-text-3)' }}
          >
            {t('staff.invManageSubtitle')}
          </p>
        </div>

        <Button onClick={() => setDialogOpen(true)} className="self-start">
          <Send className="mr-1.5 h-4 w-4" />
          {t('staff.invSendButton')}
        </Button>
      </div>

      <InvitationsTable />

      <SendInvitationDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
