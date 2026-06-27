'use client';

import Link from 'next/link';
import {
  Ban,
  Building2,
  CheckCircle2,
  Clock,
  FileText,
  Mail,
  MapPin,
  PauseCircle,
  Phone,
  type LucideIcon,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { useTranslation } from '@/lib/i18n';
import { useAuthStore } from '@/store/auth';
import { formatPhoneUS } from '@/lib/utils/phone';
import { AdminCenterBadge } from './admin-center-badge';
import { AdminActionsMenu } from './admin-actions-menu';
import type { Center, CenterStatus } from '@/lib/types/center';

interface CenterCardProps {
  center: Center;
}

type Translator = (key: string) => string;

// Deterministic avatar tint by center id (SAAS tokens), mirroring the staff /
// children cards.
const AVATAR_PALETTE = [
  'var(--kc-p-600)',
  'var(--kc-info)',
  'var(--kc-warning)',
  'var(--kc-error)',
];
function avatarColor(id: string): string {
  let sum = 0;
  for (let i = 0; i < id.length; i++) sum += id.charCodeAt(i);
  return AVATAR_PALETTE[sum % AVATAR_PALETTE.length];
}

// Status band — centers have no daily attendance, so the band carries the
// center STATUS (color + icon + label). Same visual language as the staff /
// children card bands.
const BAND: Record<
  CenterStatus,
  { icon: LucideIcon; labelKey: string; fg: string; bg: string }
> = {
  ACTIVE: {
    icon: CheckCircle2,
    labelKey: 'centers.statusActive',
    fg: 'var(--kc-success)',
    bg: 'var(--kc-success-bg)',
  },
  SETUP_PENDING: {
    icon: Clock,
    labelKey: 'centers.statusSetupPending',
    fg: 'var(--kc-warning)',
    bg: 'var(--kc-warning-bg)',
  },
  SUSPENDED: {
    icon: PauseCircle,
    labelKey: 'centers.statusSuspended',
    fg: 'var(--kc-error)',
    bg: 'var(--kc-error-bg)',
  },
  CLOSED: {
    icon: Ban,
    labelKey: 'centers.statusClosed',
    fg: 'var(--kc-text-3)',
    bg: 'var(--kc-surface-2)',
  },
};

function StatusBand({ status, t }: { status: CenterStatus; t: Translator }) {
  const cfg = BAND[status] ?? BAND.ACTIVE;
  const Icon = cfg.icon;
  return (
    <div
      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium"
      style={{ background: cfg.bg, color: cfg.fg }}
    >
      <Icon className="h-3.5 w-3.5 flex-none" aria-hidden />
      <span className="truncate">{t(cfg.labelKey)}</span>
    </div>
  );
}

// Roster card — used on phones AND the desktop "cards" view (toggle). Status
// band + Building2 avatar + key info + an actions kebab (SA-managed normal
// centers only; the whole card navigates to the detail page otherwise).
export function CenterCard({ center }: CenterCardProps) {
  const { t } = useTranslation();
  const isSuperAdmin = useAuthStore((s) => s.user?.role) === 'SUPER_ADMIN';
  // Admin center is system-managed — no kebab actions (status/delete/edit).
  const showKebab = isSuperAdmin && !center.isAdminCenter;

  return (
    <Card className="relative flex h-full flex-col gap-0 overflow-hidden py-0 transition-shadow hover:shadow-md">
      <Link
        href={`/centers/${center.id}`}
        aria-label={center.name}
        className="absolute inset-0 z-0"
      />
      <div className="pointer-events-none relative flex h-full flex-col">
        {/* 1 — status band */}
        <StatusBand status={center.status} t={t} />

        {/* 2 — Building2 avatar (4/3) */}
        <div
          className="relative w-full overflow-hidden"
          style={{ aspectRatio: '4 / 3' }}
        >
          <div
            className="flex h-full w-full items-center justify-center text-white"
            style={{ background: avatarColor(center.id) }}
          >
            <Building2 className="h-12 w-12" aria-hidden />
          </div>
        </div>

        {/* 3 — body */}
        <div className="flex flex-1 flex-col p-3">
          <div className="space-y-2">
            <div className="flex items-start justify-between gap-2">
              <h3
                className="truncate text-base font-semibold leading-tight"
                style={{ color: 'var(--kc-text-1)' }}
                title={center.name}
              >
                {center.name}
              </h3>
              {center.isAdminCenter && <AdminCenterBadge className="flex-none" />}
            </div>

            <div className="border-t" style={{ borderColor: 'var(--kc-border)' }} />

            <InfoRow icon={MapPin} truncate title={`${center.street}, ${center.city}, ${center.state} ${center.zipCode}`}>
              {center.city}, {center.state} {center.zipCode}
            </InfoRow>
            <InfoRow icon={Phone}>{formatPhoneUS(center.phone)}</InfoRow>
            <InfoRow icon={Mail} truncate title={center.email}>
              {center.email}
            </InfoRow>
            {center.licenseNumber && (
              <InfoRow icon={FileText}>
                {t('centers.licenseNumber')}: {center.licenseNumber}
              </InfoRow>
            )}
          </div>

          {/* Bottom: kebab pinned bottom-right (SA-managed normal centers). */}
          <div className="mt-auto pt-3 flex items-end justify-end">
            {showKebab && (
              <span className="pointer-events-auto relative z-10">
                <AdminActionsMenu center={center} showView showEdit />
              </span>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

function InfoRow({
  icon: Icon,
  children,
  truncate,
  title,
}: {
  icon: LucideIcon;
  children: React.ReactNode;
  truncate?: boolean;
  title?: string;
}) {
  return (
    <div
      className="flex items-start gap-2 text-sm"
      style={{ color: 'var(--kc-text-2)' }}
    >
      <Icon
        className="h-3.5 w-3.5 mt-0.5 flex-none"
        style={{ color: 'var(--kc-text-4)' }}
        aria-hidden
      />
      <span className={truncate ? 'truncate min-w-0' : 'min-w-0'} title={title}>
        {children}
      </span>
    </div>
  );
}
