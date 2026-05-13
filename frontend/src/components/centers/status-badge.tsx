'use client';

import { CheckCircle2, Clock, PauseCircle, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { CenterStatus } from '@/lib/types/center';

interface StatusBadgeProps {
  status: CenterStatus;
  className?: string;
  /** Hide the icon (defaults to false — icon shown). */
  hideIcon?: boolean;
}

const STATUS_CONFIG: Record<
  CenterStatus,
  {
    translationKey: string;
    bg: string;
    fg: string;
    icon: typeof Clock;
  }
> = {
  SETUP_PENDING: {
    translationKey: 'centers.statusSetupPending',
    bg: 'var(--kc-warning-bg)',
    fg: 'var(--kc-warning)',
    icon: Clock,
  },
  ACTIVE: {
    translationKey: 'centers.statusActive',
    bg: 'var(--kc-success-bg)',
    fg: 'var(--kc-success)',
    icon: CheckCircle2,
  },
  SUSPENDED: {
    translationKey: 'centers.statusSuspended',
    bg: 'var(--kc-info-bg)',
    fg: 'var(--kc-info)',
    icon: PauseCircle,
  },
  CLOSED: {
    translationKey: 'centers.statusClosed',
    bg: 'var(--kc-error-bg)',
    fg: 'var(--kc-error)',
    icon: XCircle,
  },
};

export function StatusBadge({ status, className, hideIcon }: StatusBadgeProps) {
  const { t } = useTranslation();
  const cfg = STATUS_CONFIG[status];
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
      {t(cfg.translationKey)}
    </Badge>
  );
}
