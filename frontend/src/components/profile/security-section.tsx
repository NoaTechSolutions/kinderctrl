'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { ChevronRight, KeyRound, Lock, Pencil, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ReadCard } from '@/components/ui/section-frame';
import { ReadGrid, ReadRow } from '@/components/ui/read-view';
import { toast, useConfirm } from '@/lib/toast';
import { useTranslation } from '@/lib/i18n';
import { forgotPassword } from '@/lib/api/auth';
import { ApiError } from '@/lib/api/client';
import { ChangePasswordModal } from './change-password-modal';

// Profile v4 — Security card. Just two affordances:
//   1. Change password (destructive, opens modal with current-password
//      gate + branded ConfirmDialog → server revokes all sessions).
//   2. Forgot password (v5) — was a passive navigate to /forgot-password.
//      Now warns first via the branded ConfirmDialog (same pattern as
//      Withdraw / Approve All), then fires the existing forgotPassword(email)
//      flow directly using the signed-in user's email. The escape hatch for
//      when the user can't recall their current password.
// Header uses the red icon-badge per spec — destructive area cue.
export function SecuritySection({ email }: { email: string }) {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const [open, setOpen] = useState(false);

  // Existing forgot-password flow (same api the public /forgot-password page
  // calls). We already know the email, so we send straight from here.
  const forgotMutation = useMutation({
    mutationFn: () => forgotPassword(email),
    onSuccess: () => toast.success(t('profile.forgotPasswordSentToast')),
    onError: (error: Error) => {
      const message =
        error instanceof ApiError && error.message
          ? error.message
          : t('profile.forgotPasswordError');
      toast.error(message);
    },
  });

  const handleForgotPassword = async () => {
    const ok = await confirm({
      title: t('profile.forgotPasswordConfirmTitle'),
      description: t('profile.forgotPasswordConfirmBody'),
      confirmText: t('profile.forgotPasswordConfirmAction'),
      cancelText: t('staff.cancel'),
      variant: 'warning',
    });
    if (!ok) return;
    forgotMutation.mutate();
  };

  return (
    <>
      <ReadCard icon={ShieldCheck} title={t('profile.securityTitle')}>
        <div className="space-y-4">
          {/* Password is the one read field here; its inline destructive
              "Change" affordance rides the ReadRow action slot. */}
          <ReadGrid cols={2}>
            <ReadRow
              icon={Lock}
              label={t('profile.password')}
              value="••••••••"
              full
              action={
                <>
                  {/* Mobile: icon-only for consistency with the Email row. */}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 sm:hidden"
                    onClick={() => setOpen(true)}
                    aria-label={t('profile.changePassword')}
                    title={t('profile.changePassword')}
                  >
                    <Pencil className="h-4 w-4" aria-hidden />
                  </Button>
                  {/* Desktop: full text button (unchanged). */}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="hidden sm:inline-flex"
                    onClick={() => setOpen(true)}
                  >
                    {t('profile.changePassword')}
                  </Button>
                </>
              }
            />
          </ReadGrid>

          {/* v5: Forgot password escape hatch — a navigation affordance, not
              a read field, so it stays a custom row (the card pattern is for
              read-mode field values). Now a button: click warns via the
              branded ConfirmDialog, then fires forgotPassword(email). */}
          <button
            type="button"
            onClick={() => void handleForgotPassword()}
            disabled={forgotMutation.isPending}
            className="flex w-full items-center gap-1.5 -mx-2 px-2 py-2 rounded-md text-left transition-colors hover:bg-[var(--kc-surface-2)] disabled:opacity-60"
            aria-label={t('profile.forgotPasswordLabel')}
          >
            <KeyRound
              className="h-3.5 w-3.5 flex-none"
              style={{ color: 'var(--kc-p-600)' }}
              aria-hidden
            />
            <span className="min-w-0 flex-1">
              <span
                className="block text-[10px] font-semibold uppercase tracking-[0.05em]"
                style={{ color: 'var(--kc-text-3)' }}
              >
                {t('profile.forgotPasswordLabel')}
              </span>
              <span className="block text-xs" style={{ color: 'var(--kc-text-3)' }}>
                {t('profile.forgotPasswordHint')}
              </span>
            </span>
            <ChevronRight
              className="h-4 w-4 flex-none"
              style={{ color: 'var(--kc-text-3)' }}
              aria-hidden
            />
          </button>
        </div>
      </ReadCard>

      <ChangePasswordModal open={open} onOpenChange={setOpen} />
    </>
  );
}
