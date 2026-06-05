'use client';

import { Settings2 } from 'lucide-react';
import { CardWithHeader } from '@/components/ui/card-with-header';
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
// Each cell is just the setting label + its control (the descriptive
// per-row subtitle was removed under the global "title only" rule).
export function PreferencesSection() {
  const { t } = useTranslation();
  return (
    <CardWithHeader icon={Settings2} title={t('profile.preferencesTitle')}>
      {/* 2-column grid (Israel: 2 columns by default, desktop + mobile). Falls
          back to 1 column on very narrow phones (<360px) so the controls don't
          cramp — M (375) and L (480) keep 2 columns. Each cell is a vertical
          label/subtitle + control block; min-w-0 on the cells lets long labels
          truncate instead of pushing width. */}
      <div className="grid grid-cols-1 gap-3 min-[360px]:grid-cols-2">
        <PreferenceRow label={t('profile.theme')}>
          <ThemeDropdown />
        </PreferenceRow>
        <PreferenceRow label={t('profile.timeFormat')}>
          <TimeFormatDropdown />
        </PreferenceRow>
      </div>
    </CardWithHeader>
  );
}

// Local row primitive — mirrors ProfileRow's shape but without the
// leading icon (the colored header icon already establishes context
// for the card). Keeps Preferences visually distinct from Personal
// Info / Security where every row carries its own icon.
function PreferenceRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  // Vertical cell: label above the control. Descriptive subtitle removed per
  // the global "title only, no subtitle" rule — each cell is now just the
  // setting label + its control, stacked so nothing competes for width.
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <p
        className="truncate text-sm font-medium"
        style={{ color: 'var(--kc-text-1)' }}
      >
        {label}
      </p>
      <div>{children}</div>
    </div>
  );
}
