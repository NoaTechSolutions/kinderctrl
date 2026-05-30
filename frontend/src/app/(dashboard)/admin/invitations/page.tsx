'use client';

import { useState } from 'react';
import { Send } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useTranslation } from '@/lib/i18n';
import { InvitationsTable } from '@/components/staff/invitations-table';
import { SendInvitationDialog } from '@/components/staff/send-invitation-dialog';

// SUPER_ADMIN-only invitations management (PO QA #16). The InvitationsTable
// component already filters its Center column based on the viewer's role
// (SUPER_ADMIN sees it; Director doesn't), so the SUPER_ADMIN sees ALL
// invitations across centers here. Role gate comes from /admin/layout.tsx —
// no need to re-check in this page. DIRECTORs land on /staff/invite
// instead (different sidebar group, same underlying components).
export default function AdminInvitationsPage() {
  const { t } = useTranslation();
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <div className="space-y-6">
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
