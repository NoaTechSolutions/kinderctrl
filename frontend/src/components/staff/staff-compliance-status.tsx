'use client';

import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  CircleSlash,
  XCircle,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { BackgroundCheckStatus } from '@/lib/types/staff';

// 60-day window matches backend CPR_EXPIRING_WINDOW_DAYS in staff.service.ts.
// Keep them in sync — if the backend window changes, also bump here.
const CPR_EXPIRING_WINDOW_DAYS = 60;
const MS_PER_DAY = 86_400_000;

interface StaffComplianceStatusProps {
  backgroundCheckStatus: BackgroundCheckStatus;
  backgroundCheckExpiryDate: string | null;
  cprCertified: boolean;
  cprExpiryDate: string | null;
  // 'compact' = two small badges (for the table row).
  // 'full'    = two stacked rows with status + expiry date (for the detail view).
  variant?: 'compact' | 'full';
  className?: string;
}

// Derived CPR bucket — matches the backend summary buckets exactly.
// `expiring` is "certified, expires within window". `valid` covers both
// "no expiry" and "expiry > window".
type CprBucket = 'valid' | 'expiring' | 'expired' | 'missing';

function deriveCprBucket(
  certified: boolean,
  expiryIso: string | null,
): CprBucket {
  if (!certified) return 'missing';
  if (!expiryIso) return 'valid';
  const expiry = new Date(expiryIso).getTime();
  const now = Date.now();
  if (expiry <= now) return 'expired';
  if (expiry <= now + CPR_EXPIRING_WINDOW_DAYS * MS_PER_DAY) return 'expiring';
  return 'valid';
}

const BG_CONFIG: Record<
  BackgroundCheckStatus,
  { bg: string; fg: string; icon: typeof CheckCircle2; key: string }
> = {
  APPROVED: {
    bg: 'var(--kc-success-bg)',
    fg: 'var(--kc-success)',
    icon: CheckCircle2,
    key: 'staff.bgStatusApproved',
  },
  PENDING: {
    bg: 'var(--kc-warning-bg)',
    fg: 'var(--kc-warning)',
    icon: Clock,
    key: 'staff.bgStatusPending',
  },
  EXPIRED: {
    bg: 'var(--kc-warning-bg)',
    fg: 'var(--kc-warning)',
    icon: AlertTriangle,
    key: 'staff.bgStatusExpired',
  },
  REJECTED: {
    bg: 'var(--kc-error-bg)',
    fg: 'var(--kc-error)',
    icon: XCircle,
    key: 'staff.bgStatusRejected',
  },
  NOT_STARTED: {
    bg: 'var(--kc-error-bg)',
    fg: 'var(--kc-error)',
    icon: CircleSlash,
    key: 'staff.bgStatusNotStarted',
  },
};

const CPR_CONFIG: Record<
  CprBucket,
  { bg: string; fg: string; icon: typeof CheckCircle2; key: string }
> = {
  valid: {
    bg: 'var(--kc-success-bg)',
    fg: 'var(--kc-success)',
    icon: CheckCircle2,
    key: 'staff.cprStatusValid',
  },
  expiring: {
    bg: 'var(--kc-warning-bg)',
    fg: 'var(--kc-warning)',
    icon: AlertTriangle,
    key: 'staff.cprStatusExpiring',
  },
  expired: {
    bg: 'var(--kc-error-bg)',
    fg: 'var(--kc-error)',
    icon: AlertTriangle,
    key: 'staff.cprStatusExpired',
  },
  missing: {
    bg: 'var(--kc-info-bg)',
    fg: 'var(--kc-info)',
    icon: CircleSlash,
    key: 'staff.cprStatusMissing',
  },
};

function formatExpiry(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString();
}

export function StaffComplianceStatus({
  backgroundCheckStatus,
  backgroundCheckExpiryDate,
  cprCertified,
  cprExpiryDate,
  variant = 'compact',
  className,
}: StaffComplianceStatusProps) {
  const { t } = useTranslation();
  const bg = BG_CONFIG[backgroundCheckStatus];
  const bgIcon = bg.icon;
  const cprBucket = deriveCprBucket(cprCertified, cprExpiryDate);
  const cpr = CPR_CONFIG[cprBucket];
  const cprIcon = cpr.icon;

  if (variant === 'compact') {
    return (
      <div
        className={cn('flex flex-wrap items-center gap-1.5', className)}
        aria-label="Compliance status"
      >
        <Badge
          className="border-transparent font-medium inline-flex items-center gap-1"
          style={{ background: bg.bg, color: bg.fg }}
          title={`Background: ${t(bg.key)}`}
        >
          <bgIcon className="h-3 w-3" aria-hidden />
          {t('staff.backgroundCheckLabel')}
        </Badge>
        <Badge
          className="border-transparent font-medium inline-flex items-center gap-1"
          style={{ background: cpr.bg, color: cpr.fg }}
          title={`CPR: ${t(cpr.key)}`}
        >
          <cprIcon className="h-3 w-3" aria-hidden />
          {t('staff.cprLabel')}
        </Badge>
      </div>
    );
  }

  // Full variant
  const bgExpiry = formatExpiry(backgroundCheckExpiryDate);
  const cprExpiry = formatExpiry(cprExpiryDate);

  return (
    <dl className={cn('space-y-3', className)}>
      <div className="flex items-center gap-3">
        <Badge
          className="border-transparent font-medium inline-flex items-center gap-1"
          style={{ background: bg.bg, color: bg.fg }}
        >
          <bgIcon className="h-3.5 w-3.5" aria-hidden />
          {t(bg.key)}
        </Badge>
        <div className="min-w-0">
          <dt
            className="text-xs uppercase tracking-wider"
            style={{ color: 'var(--kc-text-3)' }}
          >
            {t('staff.backgroundCheckLabel')}
          </dt>
          <dd className="text-sm" style={{ color: 'var(--kc-text-3)' }}>
            {bgExpiry ? `Expires ${bgExpiry}` : t('staff.complianceUnknown')}
          </dd>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Badge
          className="border-transparent font-medium inline-flex items-center gap-1"
          style={{ background: cpr.bg, color: cpr.fg }}
        >
          <cprIcon className="h-3.5 w-3.5" aria-hidden />
          {t(cpr.key)}
        </Badge>
        <div className="min-w-0">
          <dt
            className="text-xs uppercase tracking-wider"
            style={{ color: 'var(--kc-text-3)' }}
          >
            {t('staff.cprLabel')}
          </dt>
          <dd className="text-sm" style={{ color: 'var(--kc-text-3)' }}>
            {cprExpiry ? `Expires ${cprExpiry}` : t('staff.complianceUnknown')}
          </dd>
        </div>
      </div>
    </dl>
  );
}
