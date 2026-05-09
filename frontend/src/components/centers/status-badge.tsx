'use client';

import { Badge } from '@/components/ui/badge';
import { useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { CenterStatus } from '@/lib/types/center';

interface StatusBadgeProps {
  status: CenterStatus;
  className?: string;
}

const STATUS_CONFIG: Record<
  CenterStatus,
  { translationKey: string; bg: string; fg: string }
> = {
  SETUP_PENDING: {
    translationKey: 'centers.statusSetupPending',
    bg: 'var(--kc-warning-bg)',
    fg: 'var(--kc-warning)',
  },
  ACTIVE: {
    translationKey: 'centers.statusActive',
    bg: 'var(--kc-success-bg)',
    fg: 'var(--kc-success)',
  },
  SUSPENDED: {
    translationKey: 'centers.statusSuspended',
    bg: 'var(--kc-info-bg)',
    fg: 'var(--kc-info)',
  },
  CLOSED: {
    translationKey: 'centers.statusClosed',
    bg: 'var(--kc-error-bg)',
    fg: 'var(--kc-error)',
  },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const { t } = useTranslation();
  const cfg = STATUS_CONFIG[status];

  return (
    <Badge
      className={cn('border-transparent font-medium', className)}
      style={{ background: cfg.bg, color: cfg.fg }}
    >
      {t(cfg.translationKey)}
    </Badge>
  );
}
