'use client';

import {
  Building2,
  Clock,
  Palette,
  Server,
  SlidersHorizontal,
  type LucideIcon,
} from 'lucide-react';
import { ReadCard } from '@/components/ui/section-frame';
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
      <ReadCard icon={SlidersHorizontal} title={t('settings.personalTitle')}>
        {/* 2-column grid from 360px up (matches the old Profile Preferences
            card). Each cell stacks its label over the control so long labels
            never compete with the dropdown for width. */}
        <div className="grid grid-cols-1 gap-3 min-[360px]:grid-cols-2">
          <SettingRow icon={Palette} label={t('settings.theme')}>
            <ThemeDropdown />
          </SettingRow>
          <SettingRow icon={Clock} label={t('settings.timeFormat')}>
            <TimeFormatDropdown />
          </SettingRow>
        </div>
      </ReadCard>

      {/* Center — DIRECTOR + SUPER_ADMIN */}
      {canSeeCenter && (
        <ReadCard icon={Building2} title={t('settings.centerTitle')}>
          <ComingSoon label={t('settings.comingSoon')} />
        </ReadCard>
      )}

      {/* System — SUPER_ADMIN only */}
      {isSuperAdmin && (
        <ReadCard icon={Server} title={t('settings.systemTitle')}>
          <ComingSoon label={t('settings.comingSoon')} />
        </ReadCard>
      )}
    </div>
  );
}

// Label-over-control cell. Card-pattern label (10px uppercase + purple icon,
// matching ReadRow / the Settings cards in Centers) over a live dropdown — the
// controls themselves stay as-is (these are simple selects, not edit fields).
function SettingRow({
  icon: Icon,
  label,
  children,
}: {
  icon: LucideIcon;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <p
        className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.05em]"
        style={{ color: 'var(--kc-text-3)' }}
      >
        <Icon
          className="h-3.5 w-3.5 flex-none"
          style={{ color: 'var(--kc-p-600)' }}
          aria-hidden
        />
        <span className="truncate">{label}</span>
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
