'use client';

import { useState } from 'react';
import {
  Cake,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Tag,
  User as UserIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ReadCard } from '@/components/ui/section-frame';
import { ReadGrid, ReadRow } from '@/components/ui/read-view';
import { useTranslation, type Locale } from '@/lib/i18n';
import type { MyProfile } from '@/lib/api/auth';
import { formatPhoneUS } from '@/lib/utils/phone';
import { getDisplayRole } from '@/lib/user-display';
import { useAuthStore } from '@/store/auth';
import { PersonalInfoModal } from './personal-info-modal';
import { ChangeEmailModal } from './change-email-modal';

// Profile v3 — Personal Information card. Now hosts every editable
// identity field in one place: name, email (with inline destructive
// Change), phone, role (badge), and address (4 fields collapsed onto
// a single MapPin row for readability). The Edit button at the bottom
// opens PersonalInfoModal which gates name + phone + address; email
// is destructive (session revoke) so it has its own inline button
// + dedicated ChangeEmailModal.
interface PersonalInfoSectionProps {
  profile: MyProfile;
}

export function PersonalInfoSection({ profile }: PersonalInfoSectionProps) {
  const { t, locale } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const [editOpen, setEditOpen] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);

  // v14: DOB row is STAFF-only and only renders when there's a date
  // on file. Format follows the user's i18n locale — "January 15,
  // 1990" / "15 de enero de 1990" — using native Intl rather than
  // pulling in date-fns (not a frontend dep).
  const isStaff = profile.role === 'STAFF';
  const dobLabel = profile.dateOfBirth
    ? formatDOB(profile.dateOfBirth, locale)
    : null;

  const fullName =
    profile.firstName || profile.lastName
      ? `${profile.firstName ?? ''} ${profile.lastName ?? ''}`.trim()
      : null;

  // Role is shown as a brand-tinted pill. Pulled from auth store
  // because MyProfile doesn't carry the STAFF subrole and we want
  // "Teacher" / "Assistant" / "Center Admin" for STAFF, not generic.
  const roleLabel = user ? getDisplayRole(user) : null;

  // Collapse 4 address columns into one readable line. Empty fields
  // are skipped so we don't render "123 Main St, , , 94102". When all
  // 4 are null the value is null and the ReadRow renders blank (empty = empty).
  const addressLine =
    [profile.street, profile.city, profile.state, profile.zipCode]
      .filter((piece) => piece && piece.trim() !== '')
      .join(', ') || null;

  return (
    <>
      <ReadCard
        icon={UserIcon}
        title={t('profile.personalInfoTitle')}
        action={
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setEditOpen(true)}
            aria-label={t('profile.edit')}
            title={t('profile.edit')}
          >
            <Pencil className="h-4 w-4" aria-hidden />
          </Button>
        }
      >
        {/* Card pattern: responsive read grid (1 col ≤375, 2 cols sm:up).
            Email keeps its inline destructive "Change" affordance via the
            ReadRow action slot; the header Edit opens PersonalInfoModal. */}
        <ReadGrid cols={2}>
          <ReadRow
            icon={UserIcon}
            label={t('profile.fullName')}
            value={fullName}
          />

          <ReadRow
            icon={Mail}
            label={t('profile.email')}
            value={profile.email}
            action={
              <>
                {/* Mobile: icon-only so the email gets the row width (375px). */}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 sm:hidden"
                  onClick={() => setEmailOpen(true)}
                  aria-label={t('profile.change')}
                  title={t('profile.change')}
                >
                  <Pencil className="h-4 w-4" aria-hidden />
                </Button>
                {/* Desktop: full text button (unchanged). */}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="hidden sm:inline-flex"
                  onClick={() => setEmailOpen(true)}
                >
                  {t('profile.change')}
                </Button>
              </>
            }
          />

          <ReadRow
            icon={Phone}
            label={t('profile.phone')}
            value={profile.phone ? formatPhoneUS(profile.phone) : null}
          />

          <ReadRow icon={Tag} label={t('profile.role')}>
            {roleLabel ? <RoleBadge label={roleLabel} /> : null}
          </ReadRow>

          <ReadRow
            icon={MapPin}
            label={t('profile.address')}
            value={addressLine}
            full
          />

          {/* v14: STAFF-only DOB row. We don't render it for DIRECTOR /
              SUPER_ADMIN because they have no Staff satellite (DOB lives on
              Staff.dateOfBirth) and a perma-empty row would just be noise. */}
          {isStaff && (
            <ReadRow
              icon={Cake}
              label={t('profile.dateOfBirth')}
              value={dobLabel}
            />
          )}
        </ReadGrid>
      </ReadCard>

      <PersonalInfoModal
        open={editOpen}
        onOpenChange={setEditOpen}
        profile={profile}
      />
      <ChangeEmailModal
        open={emailOpen}
        onOpenChange={setEmailOpen}
        currentEmail={profile.email}
      />
    </>
  );
}

// v14: long-form DOB renderer. YYYY-MM-DD on the wire → human-
// readable in the user's locale ("January 15, 1990" / "15 de enero
// de 1990"). Parses as local date (not UTC) so a YYYY-MM-DD doesn't
// shift a day in timezones west of UTC — explicit Date constructor
// with y/m/d ints avoids the new Date('2024-01-15') UTC-midnight gotcha.
function formatDOB(iso: string, locale: Locale): string {
  const [yStr, mStr, dStr] = iso.split('-');
  const y = Number(yStr);
  const m = Number(mStr);
  const d = Number(dStr);
  if (!y || !m || !d) return iso;
  const localDate = new Date(y, m - 1, d);
  return localDate.toLocaleDateString(
    locale === 'es' ? 'es-AR' : 'en-US',
    { year: 'numeric', month: 'long', day: 'numeric' },
  );
}

// Inline brand-tinted pill for the role row. Same visual tokens as the
// HeroCard's role badge so they read as the same affordance. Rendered as
// the ReadRow value (inside the <dd>, which already supplies the top margin).
function RoleBadge({ label }: { label: string }) {
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
      style={{ background: 'var(--kc-p-50)', color: 'var(--kc-p-700)' }}
    >
      {label}
    </span>
  );
}
