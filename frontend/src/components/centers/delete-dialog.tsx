'use client';

import { Loader2, Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/lib/i18n';

interface DeleteCenterDialogProps {
  centerName: string;
  isDeleting: boolean;
  onConfirm: () => void;
  /**
   * Optional custom trigger. Only used in uncontrolled mode (when `open`
   * is not provided). Ignored when the dialog is controlled externally.
   */
  trigger?: React.ReactNode;
  /**
   * When provided, the dialog runs in controlled mode and the parent
   * owns the open state. Use this when triggering from a DropdownMenu
   * item (or any other surface where embedding an AlertDialogTrigger
   * directly is awkward).
   */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function DeleteCenterDialog({
  centerName,
  isDeleting,
  onConfirm,
  trigger,
  open,
  onOpenChange,
}: DeleteCenterDialogProps) {
  const { t } = useTranslation();
  const isControlled = open !== undefined;

  return (
    <AlertDialog
      open={isControlled ? open : undefined}
      onOpenChange={isControlled ? onOpenChange : undefined}
    >
      {!isControlled && (
        <AlertDialogTrigger asChild>
          {trigger ?? (
            <Button variant="outline" disabled={isDeleting}>
              <Trash2 className="mr-2 h-4 w-4" />
              {t('centers.delete')}
            </Button>
          )}
        </AlertDialogTrigger>
      )}
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {t('centers.confirmDelete').replace('{name}', centerName)}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t('centers.deleteWarning')}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>
            {t('centers.cancel')}
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
            {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isDeleting ? t('centers.saving') : t('centers.delete')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
