'use client';

import { useRouter } from 'next/navigation';
import { Eye, MoreVertical, Pencil, UserMinus } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast, useConfirm } from '@/lib/toast';
import { useUpdateChildDetails } from '@/lib/hooks/use-children';
import { useTranslation } from '@/lib/i18n';
import { useAuthStore } from '@/store/auth';
import { childFullName } from '@/lib/format-child';
import type { ChildListItem } from '@/lib/types/child';

/**
 * Row/card actions kebab — shared by the table (variant="table") and the card
 * (variant="card"). Renders NOTHING for non-managers (PARENT): the card/row is
 * already a link to the profile, so an action-less menu would be noise. The
 * backend re-checks every action regardless of this client-side gate.
 *
 * Withdraw = PATCH enrollmentStatus → WITHDRAWN (confirmed first). A "Check in"
 * action will join here once the children-attendance module exists.
 */
export function ChildActionsMenu({
  child,
  variant,
}: {
  child: ChildListItem;
  variant: 'card' | 'table';
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const role = useAuthStore((s) => s.user?.role);
  const confirm = useConfirm();
  const update = useUpdateChildDetails();

  const canManage = role === 'DIRECTOR' || role === 'SUPER_ADMIN';
  if (!canManage) return null;

  const size = variant === 'card' ? 28 : 26;

  const handleWithdraw = async () => {
    const ok = await confirm({
      title: t('children.withdrawConfirmTitle'),
      description: t('children.withdrawConfirmDesc'),
      confirmText: t('children.actionWithdraw'),
      variant: 'destructive',
    });
    if (!ok) return;
    update.mutate(
      { childId: child.id, payload: { enrollmentStatus: 'WITHDRAWN' } },
      {
        onSuccess: () => toast.success(t('children.withdrawnToast')),
        onError: () => toast.error(t('children.withdrawError')),
      },
    );
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={t('children.actionsMenu')}
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
        <DropdownMenuItem onSelect={() => router.push(`/children/${child.id}`)}>
          <Eye className="h-4 w-4" />
          {t('children.actionView')}
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => router.push(`/children/${child.id}/edit`)}
        >
          <Pencil className="h-4 w-4" />
          {t('children.actionEdit')}
        </DropdownMenuItem>
        {child.enrollmentStatus !== 'WITHDRAWN' && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onSelect={(e) => {
                e.preventDefault();
                void handleWithdraw();
              }}
            >
              <UserMinus className="h-4 w-4" />
              {t('children.actionWithdraw')}
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
