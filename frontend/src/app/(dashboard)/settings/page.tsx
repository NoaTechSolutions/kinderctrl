'use client';

import { Building2, Server, SlidersHorizontal } from 'lucide-react';
import { CardWithHeader } from '@/components/ui/card-with-header';
import { ThemeDropdown } from '@/components/auth/theme-dropdown';
import { TimeFormatDropdown } from '@/components/auth/time-format-dropdown';
import { useRequireRole } from '@/lib/hooks/use-require-role';
import { useTranslation } from '@/lib/i18n';
import { useAuthStore } from '@/store/auth';

// Settings (Fase 1) — three role-gated sections:
//   • Personal (all roles): Theme + Time Format. These moved here from
//     Profile > Preferences and reuse the same ThemeDropdown /
//     TimeFormatDropdown (hence the same useTheme / useTimeFormat
//     persistence), so changing them here applies app-wide exactly as before.
//   • Center (DIRECTOR + SUPER_ADMIN): placeholder — coming soon.
//   • System (SUPER_ADMIN only): placeholder — coming soon.
// Gating mirrors the spec: STAFF/PARENT → Personal only; DIRECTOR → + Center;
// SUPER_ADMIN → all three.
export default function SettingsPage() {
  const { t } = useTranslation();
  const { ready, allowed } = useRequireRole([
    'SUPER_ADMIN',
    'DIRECTOR',
    'STAFF',
    'PARENT',
  ]);
  const role = useAuthStore((s) => s.user?.role);

  if (!ready || !allowed) return null;

  const isSuperAdmin = role === 'SUPER_ADMIN';
  const canSeeCenter = isSuperAdmin || role === 'DIRECTOR';

  return (
    <div className="w-full max-w-3xl space-y-6 overflow-x-hidden">
      <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight">
        {t('settings.pageTitle')}
      </h1>

      {/* Personal — every role */}
      <CardWithHeader icon={SlidersHorizontal} title={t('settings.personalTitle')}>
        {/* 2-column grid from 360px up (matches the old Profile Preferences
            card). Each cell stacks its label over the control so long labels
            never compete with the dropdown for width. */}
        <div className="grid grid-cols-1 gap-3 min-[360px]:grid-cols-2">
          <SettingRow label={t('settings.theme')}>
            <ThemeDropdown />
          </SettingRow>
          <SettingRow label={t('settings.timeFormat')}>
            <TimeFormatDropdown />
          </SettingRow>
        </div>
      </CardWithHeader>

      {/* Center — DIRECTOR + SUPER_ADMIN */}
      {canSeeCenter && (
        <CardWithHeader icon={Building2} title={t('settings.centerTitle')}>
          <ComingSoon label={t('settings.comingSoon')} />
        </CardWithHeader>
      )}

      {/* System — SUPER_ADMIN only */}
      {isSuperAdmin && (
        <CardWithHeader icon={Server} title={t('settings.systemTitle')}>
          <ComingSoon label={t('settings.comingSoon')} />
        </CardWithHeader>
      )}
    </div>
  );
}

// Label-over-control cell — mirrors the old Profile PreferenceRow so the
// Personal section reads identically to where these settings used to live.
function SettingRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <p className="truncate text-sm font-medium" style={{ color: 'var(--kc-text-1)' }}>
        {label}
      </p>
      <div>{children}</div>
    </div>
  );
}

function ComingSoon({ label }: { label: string }) {
  return (
    <p className="py-6 text-center text-sm" style={{ color: 'var(--kc-text-3)' }}>
      {label}
    </p>
  );
}
