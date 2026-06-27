'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Edit,
  Eye,
  KeyRound,
  MoreVertical,
  PauseCircle,
  PlayCircle,
  Trash2,
} from 'lucide-react';
import { toast } from '@/lib/toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ApiError } from '@/lib/api/client';
import { useChangeStaffStatus, useDeleteStaff } from '@/lib/hooks/use-staff';
import { useTranslation } from '@/lib/i18n';
import { useAuthStore } from '@/store/auth';
import type { Staff } from '@/lib/types/staff';
import { DeleteStaffDialog } from './delete-staff-dialog';
import { KioskPinDialog } from './kiosk-pin-dialog';

/**
 * Row/card actions kebab — shared by StaffTable (variant="table") and StaffCard
 * (variant="card"). Self-contained: owns the Delete / Change-status / Kiosk-PIN
 * dialogs so both surfaces get the full action set without the parent wiring
 * them. Renders NOTHING for non-managers (the row/card already links to the
 * detail page); the backend re-checks every action regardless.
 *
 * Mirrors children/child-actions-menu.tsx (the SAAS kebab template). Staff has
 * a richer action set than Children — Kiosk PIN + Suspend/Reactivate + Delete —
 * so those are preserved here ("Suspend" is the staff "deactivate").
 */
export function StaffActionsMenu({
  staff,
  variant,
}: {
  staff: Staff;
  variant: 'card' | 'table';
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const role = useAuthStore((s) => s.user?.role);
  const deleteMutation = useDeleteStaff();
  const statusMutation = useChangeStaffStatus();

  const [pendingDelete, setPendingDelete] = useState(false);
  const [pendingStatus, setPendingStatus] = useState(false);
  const [pinOpen, setPinOpen] = useState(false);

  const canManage = role === 'DIRECTOR' || role === 'SUPER_ADMIN';
  if (!canManage) return null;

  const detailHref = `/staff/${staff.id}`;
  const fullName = `${staff.firstName} ${staff.lastName}`;
  const isTerminated = staff.status === 'TERMINATED';
  const canToggleStatus =
    staff.status === 'ACTIVE' || staff.status === 'SUSPENDED';

  // Kebab trigger sizing per SEARCH-FILTER-PATTERN.md: 26px in tables, 28px on
  // cards. Square, rounded, hairline border, surface bg.
  const size = variant === 'card' ? 28 : 26;

  const handleConfirmStatus = () => {
    const next = staff.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    statusMutation.mutate(
      { id: staff.id, status: next },
      {
        onSuccess: () => {
          toast.success(
            next === 'SUSPENDED' ? 'Staff suspended' : 'Staff reactivated',
          );
          setPendingStatus(false);
        },
        onError: (err) => {
          toast.error(
            err instanceof ApiError && err.message
              ? err.message
              : 'Could not change status',
          );
        },
      },
    );
  };

  const handleConfirmDelete = () => {
    deleteMutation.mutate(staff.id, {
      onSuccess: () => {
        toast.success(t('staff.deletedToast'));
        setPendingDelete(false);
      },
      onError: (err) => {
        toast.error(
          err instanceof ApiError && err.message
            ? err.message
            : t('staff.deleteError'),
        );
      },
    });
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label={t('staff.actionsMenu')}
            className="inline-flex flex-none items-center justify-center rounded-md border transition-colors hover:bg-[var(--kc-surface-2)]"
            style={{
              width: size,
              height: size,
              borderColor: 'var(--kc-border)',
              background: 'var(--kc-surface)',
            }}
          >
            <MoreVertical className="h-4 w-4" style={{ color: 'var(--kc-text-3)' }} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => router.push(detailHref)}>
            <Eye className="h-4 w-4" />
            {t('staff.view')}
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={isTerminated}
            onSelect={(e) => {
              if (isTerminated) {
                e.preventDefault();
                return;
              }
              router.push(`/staff/${staff.id}/edit`);
            }}
          >
            <Edit className="h-4 w-4" />
            {t('staff.edit')}
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              setPinOpen(true);
            }}
          >
            <KeyRound className="h-4 w-4" />
            {staff.kioskPinSet ? 'Manage Kiosk PIN' : 'Set Kiosk PIN'}
          </DropdownMenuItem>
          {canToggleStatus && (
            <DropdownMenuItem
              onSelect={(e) => {
                e.preventDefault();
                setPendingStatus(true);
              }}
            >
              {staff.status === 'ACTIVE' ? (
                <PauseCircle className="h-4 w-4" />
              ) : (
                <PlayCircle className="h-4 w-4" />
              )}
              {staff.status === 'ACTIVE' ? 'Suspend' : 'Reactivate'}
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            disabled={isTerminated}
            onSelect={(e) => {
              e.preventDefault();
              setPendingDelete(true);
            }}
          >
            <Trash2 className="h-4 w-4" />
            {t('staff.delete')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DeleteStaffDialog
        staffName={fullName}
        isDeleting={deleteMutation.isPending}
        onConfirm={handleConfirmDelete}
        open={pendingDelete}
        onOpenChange={(o) => {
          if (!o && !deleteMutation.isPending) setPendingDelete(false);
        }}
      />

      <KioskPinDialog
        staffId={staff.id}
        staffName={fullName}
        isSet={staff.kioskPinSet}
        open={pinOpen}
        onOpenChange={setPinOpen}
      />

      <Dialog
        open={pendingStatus}
        onOpenChange={(o) => {
          if (!o && !statusMutation.isPending) setPendingStatus(false);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {staff.status === 'ACTIVE'
                ? 'Suspend staff member?'
                : 'Reactivate staff member?'}
            </DialogTitle>
            <DialogDescription>
              {fullName}
              {staff.status === 'ACTIVE'
                ? ' will be suspended and lose access until reactivated.'
                : ' will be reactivated and regain access.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPendingStatus(false)}
              disabled={statusMutation.isPending}
            >
              Cancel
            </Button>
            <Button onClick={handleConfirmStatus} disabled={statusMutation.isPending}>
              {staff.status === 'ACTIVE' ? 'Suspend' : 'Reactivate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
