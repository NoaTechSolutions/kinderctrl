'use client';

import { Lock } from 'lucide-react';
import { useRequireRole } from '@/lib/hooks/use-require-role';
import { useTranslation } from '@/lib/i18n';
import { useMyAuthProfile } from '@/lib/hooks/use-profile';
import { ProfileSkeleton } from '@/components/skeletons/profile-skeleton';
import { HeroCard } from '@/components/profile/hero-card';
import { PersonalInfoSection } from '@/components/profile/personal-info-section';
import { EmergencyContactSection } from '@/components/profile/emergency-contact-section';
import { SecuritySection } from '@/components/profile/security-section';
import { useAuthStore } from '@/store/auth';

// Profile v3 — unified /profile page, role-aware.
//
// Layout (Israel's spec):
//   • Hero card — full width (all roles)
//   • Asymmetric grid 60/40 on desktop, 1-column on mobile:
//       Left col  (lg:col-span-7) — Personal Info + Emergency Contact
//       Right col (lg:col-span-5) — Security
//   • STAFF "Additional info" legacy card — full width below
//
// Theme + Time Format (the old Preferences card) moved to /settings >
// Personal in the Settings module — same dropdowns/persistence, new home.
//
// v2 dropped: Contact Info card + Center Info card. Email moved INTO
// Personal Info (with inline destructive Change button). Timezone /
// language UI removed from /profile entirely — language still
// switchable via topbar dropdown; timezone editing belongs on
// /centers/[id]/edit. v3 also dropped the "Edit profile" button on
// the hero (Personal Info card owns the single edit affordance now)
// AND the page subtitle.
//
// SUPER_ADMIN doesn't see Emergency Contact ("no aplica" per Israel)
// — the left column shrinks to just Personal Info. The asymmetric
// layout reads cleaner than forcing a uniform card grid.
export default function ProfilePage() {
  const { t } = useTranslation();
  const { ready, allowed } = useRequireRole([
    'SUPER_ADMIN',
    'DIRECTOR',
    'STAFF',
  ]);
  const { data: profile, isLoading } = useMyAuthProfile();
  const user = useAuthStore((s) => s.user);

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  if (!ready || !allowed) return null;

  return (
    <div className="w-full space-y-6 overflow-x-hidden">
      {/* overflow-x-hidden: safety net so nothing can cause horizontal page
          scroll on phones (the real fixes are break-words in ProfileRow +
          min-w-0 on flex children). */}
      <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight">
        {t('profile.pageTitle')}
      </h1>

      {isLoading || !profile ? (
        <ProfileSkeleton />
      ) : (
        <>
          <HeroCard profile={profile} />

          {/* Asymmetric 60/40 grid. On mobile (<lg) cards stack in
              source order: Personal → Emergency → Security. On desktop the
              right column reads as "secondary" (security) next to the primary
              identity stack on the left. */}
          <div className="grid gap-6 md:grid-cols-12">
            {/* min-w-0 on the grid columns: grid items default to min-width:auto,
                which would let a wide child (long email row) force the track past
                the viewport. min-w-0 lets the column shrink so the truncates inside
                actually take effect. */}
            <div className="min-w-0 space-y-6 md:col-span-7">
              <PersonalInfoSection profile={profile} />
              {!isSuperAdmin && (
                <EmergencyContactSection profile={profile} />
              )}
            </div>

            <div className="min-w-0 space-y-6 md:col-span-5">
              <SecuritySection email={profile.email} />
            </div>
          </div>

          {/* v14: STAFF-only "Additional Information" card removed.
              The fields it owned have all moved to dedicated cards
              in earlier versions:
                - DOB         → Personal Info card (v14, this PR)
                - Address     → Personal Info card (v3)
                - Emergency C → Emergency Contact card with tabs (v6)
              No data migration needed — last-write-wins on the same
              Staff columns. */}

          {/* v4: trust-reassurance footer banner. Sits below every
              card, including the STAFF-only legacy editor, so it's the
              last thing the user sees on the page. Lock icon + muted
              copy — intentionally low-key so it doesn't compete with
              the card content above. */}
          <div
            className="flex items-center justify-center gap-2 pt-2 pb-1"
            style={{ color: 'var(--kc-text-3)' }}
          >
            <Lock className="h-3.5 w-3.5 flex-none" aria-hidden />
            <p className="text-xs">{t('profile.footerSecurity')}</p>
          </div>
        </>
      )}
    </div>
  );
}
