'use client';

import { useState } from 'react';
import Link from 'next/link';
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

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ApiError } from '@/lib/api/client';
import { useChangeStaffStatus, useDeleteStaff } from '@/lib/hooks/use-staff';
import { useTranslation } from '@/lib/i18n';
import { useAuthStore } from '@/store/auth';
import type { Staff } from '@/lib/types/staff';
import type { UserRole } from '@/store/auth';
import { StaffStatusBadge } from './staff-status-badge';
import { DeleteStaffDialog } from './delete-staff-dialog';
import { KioskPinDialog } from './kiosk-pin-dialog';

interface StaffTableProps {
  staff: Staff[];
  // When provided and equal to SUPER_ADMIN, an extra "Center" column is
  // shown so cross-center listings stay legible. Other roles only ever see
  // their own center's staff, so the column would be redundant.
  userRole?: UserRole;
}

const ROLE_LABEL_KEY: Record<Staff['role'], string> = {
  TEACHER: 'staff.roleTeacher',
  ASSISTANT: 'staff.roleAssistant',
  ADMIN: 'staff.roleAdmin',
};

const EMPLOYMENT_LABEL_KEY: Record<string, string> = {
  full_time: 'staff.employmentFullTime',
  part_time: 'staff.employmentPartTime',
};

export function StaffTable({ staff, userRole }: StaffTableProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const deleteMutation = useDeleteStaff();
  const statusMutation = useChangeStaffStatus();
  const canManage =
    user?.role === 'DIRECTOR' || user?.role === 'SUPER_ADMIN';
  const showCenter = userRole === 'SUPER_ADMIN';
  // PO QA #19 CAMBIO 1: Employment Type is operational data DIRECTORs use
  // to manage their own center; SUPER_ADMIN's cross-center view doesn't
  // act on it, so hide the column to reduce noise. STAFF role isn't on
  // this page (redirected elsewhere); defensive show.
  const showEmploymentType = userRole !== 'SUPER_ADMIN';
  const [pendingDelete, setPendingDelete] = useState<Staff | null>(null);
  // Change Status confirmation target. ACTIVE→SUSPENDED or SUSPENDED→ACTIVE;
  // the action is only offered for those two states (INVITED/TERMINATED have
  // their own lifecycle).
  const [pendingStatus, setPendingStatus] = useState<Staff | null>(null);
  const [pinStaff, setPinStaff] = useState<Staff | null>(null);

  const handleConfirmStatus = () => {
    if (!pendingStatus) return;
    const next = pendingStatus.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    statusMutation.mutate(
      { id: pendingStatus.id, status: next },
      {
        onSuccess: () => {
          toast.success(
            next === 'SUSPENDED' ? 'Staff suspended' : 'Staff reactivated',
          );
          setPendingStatus(null);
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
    if (!pendingDelete) return;
    deleteMutation.mutate(pendingDelete.id, {
      onSuccess: () => {
        toast.success(t('staff.deletedToast'));
        setPendingDelete(null);
      },
      onError: (err) => {
        const msg =
          err instanceof ApiError && err.message
            ? err.message
            : t('staff.deleteError');
        toast.error(msg);
      },
    });
  };

  return (
    <>
      <div
        className="rounded-lg border overflow-x-auto [&_th:first-child]:pl-4 [&_th:last-child]:pr-4 [&_td:first-child]:pl-4 [&_td:last-child]:pr-4"
        style={{
          background: 'var(--kc-surface)',
          borderColor: 'var(--kc-border)',
        }}
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('staff.colEmailName')}</TableHead>
              <TableHead>{t('staff.role')}</TableHead>
              {showCenter && (
                <TableHead className="hidden lg:table-cell">
                  {t('staff.center')}
                </TableHead>
              )}
              {showEmploymentType && (
                <TableHead className="hidden lg:table-cell">
                  {t('staff.employmentType')}
                </TableHead>
              )}
              <TableHead>{t('staff.status')}</TableHead>
              <TableHead className="hidden xl:table-cell">
                {t('staff.hireDate')}
              </TableHead>
              <TableHead className="w-[80px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {staff.map((s) => {
              const detailHref = `/staff/${s.id}`;
              const navigate = () => router.push(detailHref);
              const fullName = `${s.firstName} ${s.lastName}`;
              const employmentKey = EMPLOYMENT_LABEL_KEY[s.employmentType];
              return (
                <TableRow
                  key={s.id}
                  role="link"
                  tabIndex={0}
                  aria-label={`${t('staff.view')}: ${fullName}`}
                  className="cursor-pointer focus-visible:outline-none focus-visible:bg-muted/50"
                  onClick={navigate}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      navigate();
                    }
                  }}
                >
                  <TableCell
                    className="font-medium"
                    title={`${s.email} — ${fullName}`}
                  >
                    <span className="block max-w-[260px] truncate text-sm">
                      {s.email}
                    </span>
                    <span
                      className="block text-xs truncate max-w-[260px]"
                      style={{ color: 'var(--kc-text-3)' }}
                    >
                      {fullName}
                    </span>
                  </TableCell>
                  <TableCell>{t(ROLE_LABEL_KEY[s.role])}</TableCell>
                  {showCenter && (
                    <TableCell
                      className="hidden lg:table-cell truncate max-w-[180px]"
                      title={s.centerName ?? ''}
                    >
                      {s.centerName ?? '—'}
                    </TableCell>
                  )}
                  {showEmploymentType && (
                    <TableCell className="hidden lg:table-cell">
                      {employmentKey ? t(employmentKey) : s.employmentType}
                    </TableCell>
                  )}
                  <TableCell>
                    <StaffStatusBadge status={s.status} />
                  </TableCell>
                  <TableCell className="hidden xl:table-cell text-sm">
                    {new Date(s.hireDate).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <div
                      className="flex justify-end"
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => e.stopPropagation()}
                    >
                      {canManage ? (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={t('staff.view')}
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onSelect={() => router.push(detailHref)}
                            >
                              <Eye className="h-4 w-4" />
                              {t('staff.view')}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              disabled={s.status === 'TERMINATED'}
                              onSelect={(e) => {
                                if (s.status === 'TERMINATED') {
                                  e.preventDefault();
                                  return;
                                }
                                router.push(`/staff/${s.id}/edit`);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                              {t('staff.edit')}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onSelect={(e) => {
                                e.preventDefault();
                                setPinStaff(s);
                              }}
                            >
                              <KeyRound className="h-4 w-4" />
                              {s.kioskPinSet ? 'Manage Kiosk PIN' : 'Set Kiosk PIN'}
                            </DropdownMenuItem>
                            {(s.status === 'ACTIVE' ||
                              s.status === 'SUSPENDED') && (
                              <DropdownMenuItem
                                onSelect={(e) => {
                                  e.preventDefault();
                                  setPendingStatus(s);
                                }}
                              >
                                {s.status === 'ACTIVE' ? (
                                  <PauseCircle className="h-4 w-4" />
                                ) : (
                                  <PlayCircle className="h-4 w-4" />
                                )}
                                {s.status === 'ACTIVE'
                                  ? 'Suspend'
                                  : 'Reactivate'}
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              variant="destructive"
                              disabled={s.status === 'TERMINATED'}
                              onSelect={(e) => {
                                e.preventDefault();
                                setPendingDelete(s);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                              {t('staff.delete')}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      ) : (
                        <Button
                          asChild
                          variant="ghost"
                          size="icon"
                          aria-label={t('staff.view')}
                        >
                          <Link href={detailHref}>
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <DeleteStaffDialog
        staffName={
          pendingDelete
            ? `${pendingDelete.firstName} ${pendingDelete.lastName}`
            : ''
        }
        isDeleting={deleteMutation.isPending}
        onConfirm={handleConfirmDelete}
        open={!!pendingDelete}
        onOpenChange={(o) => {
          if (!o && !deleteMutation.isPending) setPendingDelete(null);
        }}
      />

      <KioskPinDialog
        staffId={pinStaff?.id ?? ''}
        staffName={pinStaff ? `${pinStaff.firstName} ${pinStaff.lastName}` : ''}
        isSet={pinStaff?.kioskPinSet ?? false}
        open={!!pinStaff}
        onOpenChange={(o) => {
          if (!o) setPinStaff(null);
        }}
      />

      <Dialog
        open={!!pendingStatus}
        onOpenChange={(o) => {
          if (!o && !statusMutation.isPending) setPendingStatus(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          {pendingStatus && (
            <>
              <DialogHeader>
                <DialogTitle>
                  {pendingStatus.status === 'ACTIVE'
                    ? 'Suspend staff member?'
                    : 'Reactivate staff member?'}
                </DialogTitle>
                <DialogDescription>
                  {pendingStatus.firstName} {pendingStatus.lastName}
                  {pendingStatus.status === 'ACTIVE'
                    ? ' will be suspended and lose access until reactivated.'
                    : ' will be reactivated and regain access.'}
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setPendingStatus(null)}
                  disabled={statusMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleConfirmStatus}
                  disabled={statusMutation.isPending}
                >
                  {pendingStatus.status === 'ACTIVE'
                    ? 'Suspend'
                    : 'Reactivate'}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
