'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useConfirm } from '@/lib/toast';
import { useTranslation } from '@/lib/i18n';
import { StaffInvitationForm } from './staff-invitation-form';

// Modal wrapper around StaffInvitationForm (PO QA #13). The form itself
// stays the source of truth for validation, throttling, and SUPER_ADMIN
// center selection — this component only owns the open/close shell and
// closes the dialog on success.
//
// Issue #5: unsaved-changes guard. The X button, ESC key, and outside
// click all route through Radix's `onOpenChange(false)`, which is
// outside the form's control. The dialog tracks the form's dirty flag
// (bubbled up via `onDirtyChange`) and intercepts those exits to show
// the branded discard ConfirmDialog — same pattern + i18n keys as
// StaffForm. F5 / refresh is handled inside the form via
// useUnsavedChangesPrompt's beforeunload listener.
interface SendInvitationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SendInvitationDialog({
  open,
  onOpenChange,
}: SendInvitationDialogProps) {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const [isFormDirty, setIsFormDirty] = useState(false);

  // Intercepts every "close" attempt — X / ESC / outside click / Cancel
  // button (which delegates here too). Opens go through untouched.
  // When the form is clean, this is a no-op pass-through. When dirty,
  // we await the branded ConfirmDialog and only close on Confirm.
  // Radix keeps the dialog open while we await because we don't flip
  // the parent `open` state until the user decides.
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
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {/*
       * `[&>*]:min-w-0` forces every direct grid child to honor the
       * dialog's max-width. shadcn's DialogContent uses `display: grid`
       * and grid items default to `min-width: auto` (= min-content),
       * which means a wide-min-content descendant — like the SUPER_ADMIN
       * CenterCombobox listbox with long center names — would grow the
       * grid column past `sm:max-w-lg` and trigger horizontal overflow
       * (PO QA #18). min-w-0 on each item collapses that default so
       * truncate/shrink behavior actually wins.
       */}
      <DialogContent className="sm:max-w-lg [&>*]:min-w-0">
        <DialogHeader>
          <DialogTitle>{t('staff.invite')}</DialogTitle>
          <DialogDescription>{t('staff.inviteSubtitle')}</DialogDescription>
        </DialogHeader>
        <StaffInvitationForm
          // Success path bypasses handleOpenChange — the form already
          // called form.reset() right before this fires, so isDirty is
          // false. Going through handleOpenChange would still work but
          // adds a needless state read; explicit is clearer.
          onSuccess={() => {
            setIsFormDirty(false);
            onOpenChange(false);
          }}
          // Cancel button routes through the same confirm flow as the
          // dialog-level exits so there's a single source of truth.
          onCancel={() => {
            void handleOpenChange(false);
          }}
          onDirtyChange={setIsFormDirty}
        />
      </DialogContent>
    </Dialog>
  );
}
