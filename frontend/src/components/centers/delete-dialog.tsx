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
  trigger?: React.ReactNode;
}

export function DeleteCenterDialog({
  centerName,
  isDeleting,
  onConfirm,
  trigger,
}: DeleteCenterDialogProps) {
  const { t } = useTranslation();

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" disabled={isDeleting}>
            <Trash2 className="mr-2 h-4 w-4" />
            {t('centers.delete')}
          </Button>
        )}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('centers.confirmDelete')}</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <span className="block">
              {t('centers.deleteWarning')}
            </span>
            <span
              className="block font-mono text-xs mt-2 px-2 py-1 rounded inline-block"
              style={{
                background: 'var(--kc-surface-2)',
                color: 'var(--kc-text-2)',
              }}
            >
              {centerName}
            </span>
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
