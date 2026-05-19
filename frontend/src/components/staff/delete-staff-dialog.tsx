'use client';

import { Loader2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useTranslation } from '@/lib/i18n';

interface DeleteStaffDialogProps {
  staffName: string;
  isDeleting: boolean;
  onConfirm: () => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Controlled-only variant — staff deletion is always triggered from a
 * DropdownMenu item in the table/card row, where embedding an
 * AlertDialogTrigger inline is awkward. Matches the controlled-mode
 * branch of DeleteCenterDialog.
 */
export function DeleteStaffDialog({
  staffName,
  isDeleting,
  onConfirm,
  open,
  onOpenChange,
}: DeleteStaffDialogProps) {
  const { t } = useTranslation();

  return (
    <AlertDialog
      open={open}
      onOpenChange={(o) => {
        if (!o && isDeleting) return;
        onOpenChange(o);
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {t('staff.confirmRemoveTitle')}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t('staff.confirmRemoveDescription').replace(
              '{name}',
              staffName,
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>
            {t('staff.cancel')}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
            disabled={isDeleting}
            style={{
              background: 'var(--kc-error)',
              color: 'white',
            }}
          >
            {isDeleting && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            {isDeleting ? t('staff.saving') : t('staff.confirmRemoveBtn')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
