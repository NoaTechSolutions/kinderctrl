'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, MoreVertical, Shield, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { DeleteCenterDialog } from './delete-dialog';
import { StatusBadge } from './status-badge';
import { useDeleteCenter, useUpdateCenter } from '@/lib/hooks/use-centers';
import { useTranslation } from '@/lib/i18n';
import { ApiError } from '@/lib/api/client';
import type { Center, CenterStatus } from '@/lib/types/center';

interface AdminActionsMenuProps {
  center: Center;
}

// Mirrors backend `validateStatusTransition` in centers.service.ts.
// Keep in sync — if the backend opens new transitions, update here too.
const VALID_NEXT: Record<CenterStatus, ReadonlyArray<CenterStatus>> = {
  SETUP_PENDING: ['ACTIVE', 'CLOSED'],
  ACTIVE: ['SUSPENDED', 'CLOSED'],
  SUSPENDED: ['ACTIVE', 'CLOSED'],
  CLOSED: ['ACTIVE', 'SETUP_PENDING'],
};

// Canonical render order for status options.
const ALL_STATUSES: ReadonlyArray<CenterStatus> = [
  'SETUP_PENDING',
  'ACTIVE',
  'SUSPENDED',
  'CLOSED',
];

const STATUS_TRANSLATION_KEY: Record<CenterStatus, string> = {
  SETUP_PENDING: 'centers.statusSetupPending',
  ACTIVE: 'centers.statusActive',
  SUSPENDED: 'centers.statusSuspended',
  CLOSED: 'centers.statusClosed',
};

export function AdminActionsMenu({ center }: AdminActionsMenuProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [statusTarget, setStatusTarget] = useState<CenterStatus | null>(null);

  const deleteMutation = useDeleteCenter();
  const updateMutation = useUpdateCenter();

  const apiMessage = (err: unknown, fallback: string): string => {
    if (err instanceof ApiError) {
      const body = err.body as { message?: string | string[] } | null;
      const msg = body?.message;
      if (Array.isArray(msg) && msg.length > 0) return String(msg[0]);
      if (typeof msg === 'string' && msg) return msg;
    }
    return fallback;
  };

  const handleDelete = () => {
    deleteMutation.mutate(center.id, {
      onSuccess: () => {
        toast.success(t('centers.deletedToast'));
        setDeleteOpen(false);
        // Close the kebab on a confirmed action only — keeping it open
        // on cancel lets the user pick a different action without
        // re-opening the menu.
        setMenuOpen(false);
        router.push('/centers');
      },
      onError: (err) => {
        toast.error(apiMessage(err, t('centers.deleteError')));
        // Menu and dialog stay as they were — user can retry or cancel.
      },
    });
  };

  const handleStatusChange = (target: CenterStatus) => {
    updateMutation.mutate(
      { id: center.id, data: { status: target } },
      {
        onSuccess: () => {
          toast.success(t('centers.statusChangedToast'));
          setStatusTarget(null);
          setMenuOpen(false);
        },
        onError: (err) => {
          toast.error(apiMessage(err, t('centers.statusChangeError')));
          setStatusTarget(null);
          // Leave the kebab menu open so the user can try a different
          // target or cancel out without re-opening it.
        },
      },
    );
  };

  // Show: the current status (so user sees "Current" badge) + every valid
  // transition. Order stays canonical regardless of which entries appear.
  const allowedTransitions = VALID_NEXT[center.status];
  const optionsToShow = ALL_STATUSES.filter(
    (s) => s === center.status || allowedTransitions.includes(s),
  );

  return (
    <>
      <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            aria-label={t('centers.adminActions')}
            title={t('centers.adminActions')}
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="flex items-center gap-2">
            <Shield className="h-3.5 w-3.5" />
            {t('centers.adminActions')}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />

          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              {t('centers.changeStatus')}
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="w-56">
              {optionsToShow.map((s) => {
                const isCurrent = s === center.status;
                return (
                  <DropdownMenuItem
                    key={s}
                    disabled={isCurrent}
                    onSelect={(e) => {
                      e.preventDefault();
                      if (isCurrent) return;
                      // Keep the kebab open behind the AlertDialog. The
                      // overlay covers it anyway; if the user cancels
                      // the dialog the menu is still there for the next
                      // pick. Menu closes only on a confirmed action.
                      setStatusTarget(s);
                    }}
                    className="flex items-center justify-between gap-2"
                  >
                    <StatusBadge status={s} />
                    {isCurrent && (
                      <span
                        className="text-xs"
                        style={{ color: 'var(--kc-text-3)' }}
                      >
                        {t('centers.currentStatus')}
                      </span>
                    )}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuSubContent>
          </DropdownMenuSub>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            variant="destructive"
            disabled={center.status === 'CLOSED'}
            onSelect={(e) => {
              e.preventDefault();
              setDeleteOpen(true);
            }}
          >
            <Trash2 className="h-4 w-4" />
            {t('centers.delete')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DeleteCenterDialog
        centerName={center.name}
        isDeleting={deleteMutation.isPending}
        onConfirm={handleDelete}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
      />

      <AlertDialog
        open={statusTarget !== null}
        onOpenChange={(o) => {
          if (!o && !updateMutation.isPending) setStatusTarget(null);
        }}
      >
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('centers.confirmStatusChange')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('centers.confirmStatusChangeDescription')
                .replace('{from}', t(STATUS_TRANSLATION_KEY[center.status]))
                .replace(
                  '{to}',
                  statusTarget
                    ? t(STATUS_TRANSLATION_KEY[statusTarget])
                    : '',
                )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={updateMutation.isPending}>
              {t('centers.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                if (statusTarget) handleStatusChange(statusTarget);
              }}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {t('centers.confirmStatusChangeBtn')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
