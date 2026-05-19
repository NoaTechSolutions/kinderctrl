'use client';

import { useState } from 'react';
import { Unlock, ShieldAlert, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useLockedUsers, useUnlockUser } from '@/lib/hooks/use-locked-users';
import { useTranslation } from '@/lib/i18n';
import { ApiError } from '@/lib/api/client';
import type { LockedUser } from '@/lib/api/admin';

function formatRemaining(lockedUntilIso: string): string {
  const ms = new Date(lockedUntilIso).getTime() - Date.now();
  if (ms <= 0) return '—';
  const minutes = Math.ceil(ms / 60_000);
  return `${minutes}m`;
}

export default function LockedAccountsPage() {
  const { t } = useTranslation();
  const { data, isLoading, error } = useLockedUsers();
  const unlockMutation = useUnlockUser();
  const [pendingId, setPendingId] = useState<string | null>(null);

  const handleUnlock = (user: LockedUser) => {
    // Confirm before unlocking — irreversible from a "this triggered an
    // audit log entry" standpoint, and we want admins to think before
    // they click on the wrong row.
    const ok = window.confirm(
      t('admin.confirmUnlock').replace('{email}', user.email),
    );
    if (!ok) return;
    setPendingId(user.id);
    unlockMutation.mutate(user.id, {
      onSuccess: () => {
        toast.success(t('admin.unlockedToast'));
        setPendingId(null);
      },
      onError: (err) => {
        const msg =
          err instanceof ApiError && err.message
            ? err.message
            : t('admin.unlockError');
        toast.error(msg);
        setPendingId(null);
      },
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight">
          {t('admin.lockedAccountsTitle')}
        </h1>
        <p
          className="mt-1.5 text-sm"
          style={{ color: 'var(--kc-text-3)' }}
        >
          {t('admin.lockedAccountsDescription')}
        </p>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-lg border p-4"
          style={{
            background: 'var(--kc-error-bg)',
            borderColor:
              'color-mix(in oklch, var(--kc-error), transparent 70%)',
          }}
        >
          <p className="text-sm" style={{ color: 'var(--kc-error)' }}>
            {error.message}
          </p>
        </div>
      )}

      {isLoading && (
        <div className="space-y-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      )}

      {!isLoading && data && data.length === 0 && (
        <div
          className="flex flex-col items-center justify-center py-16 text-center"
          style={{ color: 'var(--kc-text-3)' }}
        >
          <ShieldAlert
            className="h-12 w-12 mb-3"
            style={{ color: 'var(--kc-text-4)' }}
          />
          <p className="text-sm">{t('admin.noLockedAccounts')}</p>
        </div>
      )}

      {!isLoading && data && data.length > 0 && (
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
                <TableHead>{t('admin.colEmail')}</TableHead>
                <TableHead>{t('admin.colRole')}</TableHead>
                <TableHead className="hidden md:table-cell">
                  {t('admin.colCenter')}
                </TableHead>
                <TableHead>{t('admin.colRemaining')}</TableHead>
                <TableHead className="hidden lg:table-cell">
                  {t('admin.colLastLogin')}
                </TableHead>
                <TableHead className="w-[100px] text-right">
                  {t('admin.colActions')}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((u) => (
                <TableRow key={u.id}>
                  <TableCell
                    className="font-medium truncate max-w-[260px]"
                    title={u.email}
                  >
                    {u.email}
                  </TableCell>
                  <TableCell>{u.role}</TableCell>
                  <TableCell className="hidden md:table-cell text-sm">
                    {u.center?.name ?? '—'}
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {formatRemaining(u.lockedUntil)}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-sm">
                    {u.lastLoginAt
                      ? new Date(u.lastLoginAt).toLocaleString()
                      : '—'}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleUnlock(u)}
                      disabled={pendingId === u.id}
                    >
                      {pendingId === u.id ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Unlock className="mr-2 h-4 w-4" />
                      )}
                      {t('admin.unlock')}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
