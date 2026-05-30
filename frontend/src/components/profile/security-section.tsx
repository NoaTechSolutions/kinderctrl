'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronRight, KeyRound, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CardWithHeader } from '@/components/ui/card-with-header';
import { Separator } from '@/components/ui/separator';
import { useTranslation } from '@/lib/i18n';
import { ChangePasswordModal } from './change-password-modal';
import { ProfileRow } from './profile-row';

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
      <CardWithHeader icon={ShieldCheck} title={t('profile.securityTitle')}>
          <ProfileRow
            icon={KeyRound}
            label={t('profile.password')}
            value="••••••••"
            action={
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setOpen(true)}
              >
                {t('profile.changePassword')}
              </Button>
            }
          />
          <Separator />

          {/* v4: Forgot password escape hatch. Rendered as a row with
              description + ChevronRight so it reads as a navigation
              link, not a destructive action. Goes to /forgot-password
              — the public reset flow that sends an email and walks
              the user through resetting via tokenized link. */}
          <Link
            href="/forgot-password"
            className="block -mx-2 -my-1 px-2 py-1 rounded-md transition-colors hover:bg-[var(--kc-surface-2)]"
            aria-label={t('profile.forgotPasswordLabel')}
          >
            <ProfileRow
              icon={KeyRound}
              label={t('profile.forgotPasswordLabel')}
              value={
                <span
                  className="text-xs"
                  style={{ color: 'var(--kc-text-3)' }}
                >
                  {t('profile.forgotPasswordHint')}
                </span>
              }
              action={
                <ChevronRight
                  className="h-4 w-4"
                  style={{ color: 'var(--kc-text-3)' }}
                  aria-hidden
                />
              }
            />
          </Link>
      </CardWithHeader>

      <ChangePasswordModal open={open} onOpenChange={setOpen} />
    </>
  );
}
