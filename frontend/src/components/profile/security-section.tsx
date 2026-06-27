'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronRight, KeyRound, Lock, Pencil, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ReadCard } from '@/components/ui/section-frame';
import { ReadGrid, ReadRow } from '@/components/ui/read-view';
import { useTranslation } from '@/lib/i18n';
import { ChangePasswordModal } from './change-password-modal';

// Profile v4 — Security card. Just two affordances:
//   1. Change password (destructive, opens modal with current-password
//      gate + branded ConfirmDialog → server revokes all sessions).
//   2. Forgot password (passive, navigates to /forgot-password — the
//      public reset-by-email flow). Useful escape hatch when the user
//      can't remember their current password and the in-app change
//      modal therefore can't help.
// Header uses the red icon-badge per spec — destructive area cue.
export function SecuritySection() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

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

          {/* v4: Forgot password escape hatch — a navigation affordance, not
              a read field, so it stays a custom Link row (the card pattern is
              for read-mode field values). Goes to /forgot-password — the
              public reset flow that emails a tokenized reset link. */}
          <Link
            href="/forgot-password"
            className="flex items-center gap-1.5 -mx-2 px-2 py-2 rounded-md transition-colors hover:bg-[var(--kc-surface-2)]"
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
          </Link>
        </div>
      </ReadCard>

      <ChangePasswordModal open={open} onOpenChange={setOpen} />
    </>
  );
}
