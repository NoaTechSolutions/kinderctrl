'use client';

import { useState } from 'react';
import { Mail, Plus, Users } from 'lucide-react';
import { toast, useConfirm } from '@/lib/toast';
import { useCreateStaff, useStaff } from '@/lib/hooks/use-staff';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Pagination } from '@/components/ui/pagination';
import { StaffListSkeleton } from '@/components/skeletons/staff-list-skeleton';
import { StaffTable } from '@/components/staff/staff-table';
import { StaffCard } from '@/components/staff/staff-card';
import { StaffForm } from '@/components/staff/staff-form';
import { SendInvitationDialog } from '@/components/staff/send-invitation-dialog';
import { useTranslation } from '@/lib/i18n';
import { ApiError } from '@/lib/api/client';
import type { StaffFormData } from '@/lib/schemas/staff';

// Embeddable, center-scoped staff list for the center detail Staff tab.
// Reuses the same StaffTable/StaffCard surfaces as /staff but pins the
// query to one centerId (SUPER_ADMIN-only path on the backend). No search /
// filters here — this is a read-focused tab; the full /staff page keeps
// those. userRole is intentionally NOT passed to StaffTable: that hides the
// redundant "Center" column (every row is this center) while StaffTable
// still resolves manage permissions from the auth store.
//
// Action header: SUPER_ADMIN-only Add Staff + Invite Staff buttons open
// in-tab dialogs pre-scoped to this centerId. The list auto-refreshes
// via React Query cache invalidation (staffQueryKeys.all) on success.
const LIMIT = 10;

// Dialog wrapper for the manual staff-create form. Mirrors the pattern
// used by SendInvitationDialog: dirty-check on X / ESC / backdrop close,
// single confirm source at the dialog level. The form's onCancel is
// wired to the same handleOpenChange so Cancel + dialog-level close both
// route through the same confirm flow.
function AddStaffDialog({
  open,
  onOpenChange,
  centerId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  centerId: string;
}) {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const [isFormDirty, setIsFormDirty] = useState(false);
  const mutation = useCreateStaff();

  const handleOpenChange = async (next: boolean) => {
    if (next) {
      onOpenChange(true);
      return;
    }
    if (isFormDirty) {
      const ok = await confirm({
        title: t('staff.discardChangesTitle'),
        description: t('staff.unsavedChangesPrompt'),
        confirmText: t('staff.discardChangesAction'),
        cancelText: t('staff.keepEditing'),
        variant: 'warning',
      });
      if (!ok) return;
    }
    setIsFormDirty(false);
    mutation.reset();
    onOpenChange(false);
  };

  const handleSubmit = (formData: StaffFormData) => {
    mutation.mutate(formData, {
      onSuccess: () => {
        toast.success(t('staff.adminCreatedToast'));
        setIsFormDirty(false);
        onOpenChange(false);
      },
      onError: (err) => {
        const msg =
          err instanceof ApiError && err.message
            ? err.message
            : t('errGeneric');
        toast.error(msg);
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {/*
       * sm:max-w-3xl to accommodate the full staff form (more fields than
       * the invite form). overflow-y-auto keeps the dialog scrollable on
       * smaller viewports. [&>*]:min-w-0 prevents grid overflow from
       * wide-min-content descendants (same fix as SendInvitationDialog
       * PO QA #18).
       */}
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto [&>*]:min-w-0">
        <DialogHeader>
          <DialogTitle>{t('staff.adminCreateTitle')}</DialogTitle>
          <DialogDescription>{t('staff.inviteSubtitle')}</DialogDescription>
        </DialogHeader>
        <StaffForm
          mode="create"
          isSubmitting={mutation.isPending}
          serverError={mutation.error}
          onSubmit={handleSubmit}
          // onCancel routes through the same confirm flow as dialog-level
          // exits — single source of truth, same as SendInvitationDialog.
          onCancel={() => void handleOpenChange(false)}
          lockedCenterId={centerId}
          onDirtyChange={setIsFormDirty}
        />
      </DialogContent>
    </Dialog>
  );
}

export function CenterStaffList({ centerId }: { centerId: string }) {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const [addOpen, setAddOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);

  const { data, isLoading, error } = useStaff({ page, limit: LIMIT, centerId });
  const staff = data?.data;
  const pagination = data?.pagination;

  if (isLoading) return <StaffListSkeleton />;

  if (error) {
    return (
      <div
        role="alert"
        className="rounded-lg border p-4"
        style={{
          background: 'var(--kc-error-bg)',
          borderColor: 'color-mix(in oklch, var(--kc-error), transparent 70%)',
        }}
      >
        <p className="text-sm" style={{ color: 'var(--kc-error)' }}>
          Could not load staff{error.message ? ` — ${error.message}` : ''}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Action header — always visible in the SA center-detail Staff tab */}
      <div className="flex items-center justify-end gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => setInviteOpen(true)}
        >
          <Mail className="mr-1.5 h-4 w-4" aria-hidden />
          {t('staff.invite')}
        </Button>
        <Button size="sm" onClick={() => setAddOpen(true)}>
          <Plus className="mr-1.5 h-4 w-4" aria-hidden />
          {t('staff.adminCreateTitle')}
        </Button>
      </div>

      {(!staff || staff.length === 0) ? (
        <div
          className="flex flex-col items-center justify-center py-12 text-center"
          style={{ color: 'var(--kc-text-3)' }}
        >
          <Users className="h-10 w-10" style={{ color: 'var(--kc-text-4)' }} />
          <p className="mt-3 text-sm">No staff in this center yet.</p>
        </div>
      ) : (
        <>
          {/* Table from tablet up (sm:), cards only on phones (<640px) — same
              criterion as /staff (SUPER_ADMIN parity). The table wrapper has
              overflow-x-auto so a narrow tablet scrolls it internally. */}
          <div className="hidden sm:block">
            <StaffTable staff={staff} />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:hidden">
            {staff.map((s) => (
              <StaffCard key={s.id} staff={s} />
            ))}
          </div>
          {pagination && (
            <Pagination
              page={pagination.page}
              totalPages={pagination.totalPages}
              onPageChange={setPage}
              disabled={isLoading}
            />
          )}
        </>
      )}

      {/* Add Staff dialog — center locked to this tab's centerId */}
      <AddStaffDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        centerId={centerId}
      />

      {/* Invite Staff dialog — reuses SendInvitationDialog with locked center */}
      <SendInvitationDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        lockedCenterId={centerId}
      />
    </div>
  );
}
