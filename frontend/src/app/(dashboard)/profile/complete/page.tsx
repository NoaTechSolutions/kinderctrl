'use client';

import { useRouter } from 'next/navigation';
import { useRequireRole } from '@/lib/hooks/use-require-role';
import { useTranslation } from '@/lib/i18n';
import { useMyProfile } from '@/lib/hooks/use-staff';
import { useAuthStore } from '@/store/auth';
import { ProfileForm } from '@/components/staff/profile-form';

// Post-invitation onboarding (PO QA #8 Opción C). STAFF-only — DIRECTOR
// and SUPER_ADMIN never land here (no /me/profile for them anyway).
export default function ProfileCompletePage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { ready, allowed } = useRequireRole(['STAFF']);
  const { data: profile, isLoading } = useMyProfile();
  const user = useAuthStore((s) => s.user);

  if (!ready || !allowed) return null;

  const done = () => router.push('/dashboard');

  // Personalized greeting (PO QA #11). user.staff.firstName comes from
  // /auth/me; falls back to a generic "aboard" when not yet populated.
  const firstName = user?.staff?.firstName?.trim();
  const greeting = firstName
    ? t('staff.profileCompleteTitleNamed').replace('{firstName}', firstName)
    : t('staff.profileCompleteTitleFallback');

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight">
          {greeting}
        </h1>
        <p
          className="mt-1.5 text-sm"
          style={{ color: 'var(--kc-text-3)' }}
        >
          {t('staff.profileCompleteSubtitle')}
        </p>
      </div>

      {isLoading ? (
        <p className="text-sm" style={{ color: 'var(--kc-text-3)' }}>
          {t('staff.complianceLoading')}
        </p>
      ) : (
        <ProfileForm
          initial={profile}
          showSkip
          onSaved={done}
          onSkip={done}
        />
      )}
    </div>
  );
}
