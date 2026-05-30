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
import type { BackgroundCheckStatus, CprStatus } from '@/lib/types/staff';

// ─── Shared badge primitive ─────────────────────────────────────────
type Tone = 'success' | 'warning' | 'error' | 'neutral';
type Variant = 'compact' | 'full';

const TONE_STYLES: Record<Tone, { bg: string; fg: string }> = {
  success: { bg: 'var(--kc-success-bg)', fg: 'var(--kc-success)' },
  warning: { bg: 'var(--kc-warning-bg)', fg: 'var(--kc-warning)' },
  error: { bg: 'var(--kc-error-bg)', fg: 'var(--kc-error)' },
  neutral: {
    bg: 'color-mix(in oklch, var(--kc-text-3), transparent 85%)',
    fg: 'var(--kc-text-2)',
  },
};

function ComplianceBadge({
  tone,
  icon: Icon,
  label,
  variant = 'compact',
  className,
}: {
  tone: Tone;
  icon: typeof CheckCircle2;
  label: string;
  variant?: Variant;
  className?: string;
}) {
  const style = TONE_STYLES[tone];
  const iconSize = variant === 'full' ? 'h-4 w-4' : 'h-3.5 w-3.5';
  return (
    <Badge
      className={cn(
        'border-transparent font-medium inline-flex items-center gap-1.5',
        className,
      )}
      style={{ background: style.bg, color: style.fg }}
    >
      <Icon className={iconSize} aria-hidden />
      {label}
    </Badge>
  );
}

// ─── Background Check badge ─────────────────────────────────────────
//
// PO QA #48 spec — color-coded states pulled from (status, approved):
//   PENDING                       → warning (yellow + Clock)
//   COMPLETED + approved=true     → success (green + CheckCircle2)
//   COMPLETED + approved=false    → error   (red + XCircle)
//   CANCELLED                     → neutral (gray + CircleSlash)
type BgConfig = { tone: Tone; icon: typeof CheckCircle2; key: string };

function deriveBg(
  status: BackgroundCheckStatus,
  approved: boolean | null,
): BgConfig {
  if (status === 'PENDING') {
    return { tone: 'warning', icon: Clock, key: 'staff.bgStatusPending' };
  }
  if (status === 'CANCELLED') {
    return {
      tone: 'neutral',
      icon: CircleSlash,
      key: 'staff.bgStatusCancelled',
    };
  }
  // COMPLETED
  if (approved === true) {
    return {
      tone: 'success',
      icon: CheckCircle2,
      key: 'staff.bgStatusCompleted',
    };
  }
  return {
    tone: 'error',
    icon: XCircle,
    key: 'staff.bgStatusCompletedNotApproved',
  };
}

export function BackgroundCheckBadge({
  status,
  approved,
  variant = 'compact',
  className,
}: {
  status: BackgroundCheckStatus;
  approved: boolean | null;
  variant?: Variant;
  className?: string;
}) {
  const { t } = useTranslation();
  const config = deriveBg(status, approved);
  return (
    <ComplianceBadge
      tone={config.tone}
      icon={config.icon}
      label={t(config.key)}
      variant={variant}
      className={className}
    />
  );
}

// ─── CPR badge ──────────────────────────────────────────────────────
//
// PO QA #49 — color-coded states pulled directly from the stored
// cprStatus enum (no date derivation):
//   PENDING   → warning (yellow + Clock)
//   ACTIVE    → success (green + CheckCircle2)
//   EXPIRED   → error   (red + AlertTriangle)
//   CANCELLED → neutral (gray + CircleSlash)
//
// Per spec, badge = stored status. If the stored ACTIVE has a past
// expiry, the badge still reads ACTIVE — admin must explicitly move
// it to EXPIRED. Validation at save-time prevents the inconsistency
// going forward.
const CPR_CONFIG: Record<CprStatus, { tone: Tone; icon: typeof CheckCircle2; key: string }> = {
  PENDING: { tone: 'warning', icon: Clock, key: 'staff.cprStatusPending' },
  ACTIVE: {
    tone: 'success',
    icon: CheckCircle2,
    key: 'staff.cprStatusActive',
  },
  EXPIRED: {
    tone: 'error',
    icon: AlertTriangle,
    key: 'staff.cprStatusExpired',
  },
  CANCELLED: {
    tone: 'neutral',
    icon: CircleSlash,
    key: 'staff.cprStatusCancelled',
  },
};

export function CprStatusBadge({
  status,
  variant = 'compact',
  className,
}: {
  status: CprStatus;
  variant?: Variant;
  className?: string;
}) {
  const { t } = useTranslation();
  const config = CPR_CONFIG[status];
  return (
    <ComplianceBadge
      tone={config.tone}
      icon={config.icon}
      label={t(config.key)}
      variant={variant}
      className={className}
    />
  );
}

// ─── Combined widget (kept for future table-row use) ────────────────
//
// Two stacked badges sharing the layout of the per-row "compliance"
// column. Not currently wired in — the staff list table uses neither
// the compact nor full variant yet. Retained so we don't have to
// rebuild it when the column lands.
interface StaffComplianceStatusProps {
  backgroundCheckStatus: BackgroundCheckStatus;
  backgroundCheckApproved: boolean | null;
  cprStatus: CprStatus;
  variant?: Variant;
  className?: string;
}

export function StaffComplianceStatus({
  backgroundCheckStatus,
  backgroundCheckApproved,
  cprStatus,
  variant = 'compact',
  className,
}: StaffComplianceStatusProps) {
  return (
    <div
      className={cn('flex flex-wrap items-center gap-1.5', className)}
      aria-label="Compliance status"
    >
      <BackgroundCheckBadge
        status={backgroundCheckStatus}
        approved={backgroundCheckApproved}
        variant={variant}
      />
      <CprStatusBadge status={cprStatus} variant={variant} />
    </div>
  );
}
