'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronRight,
  Edit,
  Eye,
  Loader2,
  MoreVertical,
  Shield,
  Trash2,
} from 'lucide-react';
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
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { DeleteCenterDialog } from './delete-dialog';
import { StatusBadge } from './status-badge';
import { useDeleteCenter, useUpdateCenter } from '@/lib/hooks/use-centers';
import { useTranslation } from '@/lib/i18n';
import { ApiError } from '@/lib/api/client';
import type { Center, CenterStatus } from '@/lib/types/center';

interface AdminActionsMenuProps {
  center: Center;
  // Prepend View / Edit items to the menu. Used from the centers list
  // table where the kebab is the only action surface; the detail page
  // keeps these as separate buttons (the page IS view) and omits them.
  showView?: boolean;
  showEdit?: boolean;
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

// Tiny inline media query hook. Mobile-first per the project's
// IMPROVEMENT-035 rule (min-width only). Extract to lib/hooks/ when a
// second consumer appears — single use case today.
function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia('(min-width: 768px)');
    setIsDesktop(mql.matches);
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);
  return isDesktop;
}

export function AdminActionsMenu({
  center,
  showView = false,
  showEdit = false,
}: AdminActionsMenuProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const isDesktop = useIsDesktop();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileView, setMobileView] = useState<'main' | 'status'>('main');
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

  const closeMenu = () => {
    setMenuOpen(false);
    setMobileView('main');
  };

  const handleDelete = () => {
    deleteMutation.mutate(center.id, {
      onSuccess: () => {
        toast.success(t('centers.deletedToast'));
        setDeleteOpen(false);
        closeMenu();
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
          closeMenu();
        },
        onError: (err) => {
          toast.error(apiMessage(err, t('centers.statusChangeError')));
          setStatusTarget(null);
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
      {isDesktop ? (
        // -------- DESKTOP: DropdownMenu with nested submenu --------
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
          <DropdownMenuContent
            align="end"
            collisionPadding={12}
            className="w-56 max-w-[calc(100vw-1.5rem)]"
          >
            <DropdownMenuLabel className="flex items-center gap-2">
              <Shield className="h-3.5 w-3.5" />
              {t('centers.adminActions')}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />

            {showView && (
              <DropdownMenuItem
                onSelect={() => router.push(`/centers/${center.id}`)}
              >
                <Eye className="h-4 w-4" />
                {t('centers.view')}
              </DropdownMenuItem>
            )}
            {showEdit && (
              <DropdownMenuItem
                disabled={center.status === 'CLOSED'}
                onSelect={(e) => {
                  if (center.status === 'CLOSED') {
                    e.preventDefault();
                    return;
                  }
                  router.push(`/centers/${center.id}/edit`);
                }}
              >
                <Edit className="h-4 w-4" />
                {t('centers.edit')}
              </DropdownMenuItem>
            )}
            {(showView || showEdit) && <DropdownMenuSeparator />}

            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                {t('centers.changeStatus')}
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent
                collisionPadding={12}
                className="w-56 max-w-[calc(100vw-1.5rem)]"
              >
                {optionsToShow.map((s) => {
                  const isCurrent = s === center.status;
                  return (
                    <DropdownMenuItem
                      key={s}
                      disabled={isCurrent}
                      onSelect={(e) => {
                        e.preventDefault();
                        if (isCurrent) return;
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
      ) : (
        // -------- MOBILE: BottomSheet with main/status sub-views --------
        <>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setMenuOpen(true)}
            aria-label={t('centers.adminActions')}
            title={t('centers.adminActions')}
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
          <BottomSheet
            open={menuOpen}
            onOpenChange={(o) => {
              setMenuOpen(o);
              if (!o) setMobileView('main');
            }}
            title={
              mobileView === 'status'
                ? t('centers.changeStatus')
                : t('centers.adminActions')
            }
            onBack={
              mobileView === 'status'
                ? () => setMobileView('main')
                : undefined
            }
          >
            {mobileView === 'main' ? (
              <div className="flex flex-col gap-1">
                {showView && (
                  <SheetActionRow
                    onClick={() => {
                      closeMenu();
                      router.push(`/centers/${center.id}`);
                    }}
                    leading={<Eye className="h-4 w-4" />}
                  >
                    {t('centers.view')}
                  </SheetActionRow>
                )}
                {showEdit && (
                  <SheetActionRow
                    disabled={center.status === 'CLOSED'}
                    onClick={() => {
                      if (center.status === 'CLOSED') return;
                      closeMenu();
                      router.push(`/centers/${center.id}/edit`);
                    }}
                    leading={<Edit className="h-4 w-4" />}
                  >
                    {t('centers.edit')}
                  </SheetActionRow>
                )}
                <SheetActionRow
                  onClick={() => setMobileView('status')}
                  trailing={<ChevronRight className="h-4 w-4 opacity-60" />}
                >
                  {t('centers.changeStatus')}
                </SheetActionRow>
                <SheetActionRow
                  variant="destructive"
                  disabled={center.status === 'CLOSED'}
                  onClick={() => setDeleteOpen(true)}
                  leading={<Trash2 className="h-4 w-4" />}
                >
                  {t('centers.delete')}
                </SheetActionRow>
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                {optionsToShow.map((s) => {
                  const isCurrent = s === center.status;
                  return (
                    <SheetActionRow
                      key={s}
                      disabled={isCurrent}
                      onClick={() => {
                        if (isCurrent) return;
                        setStatusTarget(s);
                      }}
                      trailing={
                        isCurrent ? (
                          <span
                            className="text-xs"
                            style={{ color: 'var(--kc-text-3)' }}
                          >
                            {t('centers.currentStatus')}
                          </span>
                        ) : undefined
                      }
                    >
                      <StatusBadge status={s} />
                    </SheetActionRow>
                  );
                })}
              </div>
            )}
          </BottomSheet>
        </>
      )}

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

// Plain button styled as a menu row inside the BottomSheet. Kept local
// because the BottomSheet itself is intentionally subcomponent-free —
// see ui/bottom-sheet.tsx JSDoc for the rationale.
function SheetActionRow({
  children,
  onClick,
  disabled,
  variant = 'default',
  leading,
  trailing,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: 'default' | 'destructive';
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex min-h-11 w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50 enabled:active:bg-accent enabled:hover:bg-accent"
      style={{
        color:
          variant === 'destructive' ? 'var(--kc-error)' : 'var(--kc-text)',
      }}
    >
      <span className="flex min-w-0 items-center gap-2">
        {leading}
        <span className="min-w-0 truncate">{children}</span>
      </span>
      {trailing}
    </button>
  );
}
