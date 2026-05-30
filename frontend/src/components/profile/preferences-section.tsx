'use client';

import { Settings2 } from 'lucide-react';
import { CardWithHeader } from '@/components/ui/card-with-header';
import { Separator } from '@/components/ui/separator';
import { ThemeDropdown } from '@/components/auth/theme-dropdown';
import { TimeFormatDropdown } from '@/components/auth/time-format-dropdown';
import { useTranslation } from '@/lib/i18n';

// Profile v4 — Preferences card.
//   • Theme dropdown (Light / Dark / System) — purely client-side
//     (localStorage); ThemeDropdown is the existing topbar component
//     reused inline so the two surfaces stay in sync automatically.
//   • Time format dropdown (12h / 24h) — server-persisted via
//     TimeFormatProvider's PATCH /auth/me/preferences write-through;
//     dropdown change here mirrors immediately in the topbar.
//
// Each row gets a label + subtitle pair on the left and the dropdown
// on the right — the subtitle's job is to make the preference's effect
// obvious before the user clicks (Israel's spec).
export function PreferencesSection() {
  const { t } = useTranslation();
  return (
    <CardWithHeader icon={Settings2} title={t('profile.preferencesTitle')}>
      <PreferenceRow
        label={t('profile.theme')}
        subtitle={t('profile.themeHint')}
      >
        <ThemeDropdown />
      </PreferenceRow>
      <Separator />
      <PreferenceRow
        label={t('profile.timeFormat')}
        subtitle={t('profile.timeFormatHint')}
      >
        <TimeFormatDropdown />
      </PreferenceRow>
    </CardWithHeader>
  );
}

// Local row primitive — mirrors ProfileRow's shape but without the
// leading icon (the colored header icon already establishes context
// for the card). Keeps Preferences visually distinct from Personal
// Info / Security where every row carries its own icon.
function PreferenceRow({
  label,
  subtitle,
  children,
}: {
  label: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2 py-2.5 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p
          className="text-sm font-medium"
          style={{ color: 'var(--kc-text-1)' }}
        >
          {label}
        </p>
        <p
          className="text-xs"
          style={{ color: 'var(--kc-text-3)' }}
        >
          {subtitle}
        </p>
      </div>
      <div className="flex-none">{children}</div>
    </div>
  );
}
