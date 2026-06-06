'use client';

import { CheckCircle2, Clock, PauseCircle, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n';
import type { ChildEnrollmentStatus } from '@/lib/types/child';

const STATUS_CONFIG: Record<
  ChildEnrollmentStatus,
  { labelKey: string; bg: string; fg: string; icon: typeof Clock }
> = {
  PENDING: {
    labelKey: 'children.statusPending',
    bg: 'var(--kc-warning-bg)',
    fg: 'var(--kc-warning)',
    icon: Clock,
  },
  ACTIVE: {
    labelKey: 'children.statusActive',
    bg: 'var(--kc-success-bg)',
    fg: 'var(--kc-success)',
    icon: CheckCircle2,
  },
  INACTIVE: {
    labelKey: 'children.statusInactive',
    bg: 'var(--kc-surface-2)',
    fg: 'var(--kc-text-3)',
    icon: PauseCircle,
  },
  WITHDRAWN: {
    labelKey: 'children.statusWithdrawn',
    bg: 'var(--kc-error-bg)',
    fg: 'var(--kc-error)',
    icon: XCircle,
  },
};

export function ChildStatusBadge({
  status,
  className,
  hideIcon,
}: {
  status: ChildEnrollmentStatus;
  className?: string;
  hideIcon?: boolean;
}) {
  const { t } = useTranslation();
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.PENDING;
  const Icon = cfg.icon;
  return (
    <Badge
      className={cn(
        'border-transparent font-medium inline-flex items-center gap-1',
        className,
      )}
      style={{ background: cfg.bg, color: cfg.fg }}
    >
      {!hideIcon && <Icon className="h-3 w-3" aria-hidden />}
      {t(cfg.labelKey)}
    </Badge>
  );
}
