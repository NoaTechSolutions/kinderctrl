'use client';

import { useState } from 'react';
import {
  Cake,
  Mail,
  MapPin,
  Pencil,
  Phone,
  ShieldCheck,
  User as UserIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CardWithHeader } from '@/components/ui/card-with-header';
import { Separator } from '@/components/ui/separator';
import { useTranslation, type Locale } from '@/lib/i18n';
import type { MyProfile } from '@/lib/api/auth';
import { formatPhoneUS } from '@/lib/utils/phone';
import { getDisplayRole } from '@/lib/user-display';
import { useAuthStore } from '@/store/auth';
import { PersonalInfoModal } from './personal-info-modal';
import { ChangeEmailModal } from './change-email-modal';
import { ProfileRow } from './profile-row';

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
  // 4 are null the ProfileRow falls back to the emptyPlaceholder.
  const addressLine =
    [profile.street, profile.city, profile.state, profile.zipCode]
      .filter((piece) => piece && piece.trim() !== '')
      .join(', ') || null;

  return (
    <>
      <CardWithHeader
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
          {/* v4: rows separated by <Separator /> instead of pure
              spacing. Reads as a denser, more deliberate list — the
              implicit grouping ("these are all my identity fields")
              comes through stronger. */}
          <ProfileRow
            icon={UserIcon}
            label={t('profile.fullName')}
            value={fullName}
            emptyPlaceholder={t('profile.notSet')}
          />
          <Separator />

          <ProfileRow
            icon={Mail}
            label={t('profile.email')}
            value={profile.email}
            action={
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setEmailOpen(true)}
              >
                {t('profile.change')}
              </Button>
            }
          />
          <Separator />

          <ProfileRow
            icon={Phone}
            label={t('profile.phone')}
            value={profile.phone ? formatPhoneUS(profile.phone) : null}
            emptyPlaceholder={t('profile.notSet')}
          />
          <Separator />

          <ProfileRow
            icon={ShieldCheck}
            label={t('profile.role')}
            value={roleLabel ? <RoleBadge label={roleLabel} /> : null}
            emptyPlaceholder="—"
          />
          <Separator />

          <ProfileRow
            icon={MapPin}
            label={t('profile.address')}
            value={addressLine}
            emptyPlaceholder={t('profile.notSet')}
          />

          {/* v14: STAFF-only DOB row, last in the stack. We don't
              render it for DIRECTOR / SUPER_ADMIN because they have
              no Staff satellite (DOB lives on Staff.dateOfBirth) and
              showing a perma-empty row would just be noise. The role
              gate stays here so it lives next to the data shape. */}
          {isStaff && (
            <>
              <Separator />
              <ProfileRow
                icon={Cake}
                label={t('profile.dateOfBirth')}
                value={dobLabel}
                emptyPlaceholder={t('profile.notSet')}
              />
            </>
          )}
          {/* v5: Edit button moved into the card header's action slot. */}
      </CardWithHeader>

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
// HeroCard's role badge so they read as the same affordance.
// v5: `mt-1` gives the badge breathing room from the row's label —
// without it the compact badge sat flush against the label baseline,
// which read tighter than the other text-valued rows. inline-flex
// honors vertical margin so the rule applies here.
function RoleBadge({ label }: { label: string }) {
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium mt-1"
      style={{ background: 'var(--kc-p-50)', color: 'var(--kc-p-700)' }}
    >
      {label}
    </span>
  );
}
