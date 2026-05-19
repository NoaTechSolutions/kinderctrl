'use client';

import { CheckCircle2, Mail, PauseCircle, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { StaffStatus } from '@/lib/types/staff';

interface StaffStatusBadgeProps {
  status: StaffStatus;
  className?: string;
  hideIcon?: boolean;
}

const STATUS_CONFIG: Record<
  StaffStatus,
  {
    translationKey: string;
    bg: string;
    fg: string;
    icon: typeof Mail;
  }
> = {
  INVITED: {
    translationKey: 'staff.statusInvited',
    bg: 'var(--kc-info-bg)',
    fg: 'var(--kc-info)',
    icon: Mail,
  },
  ACTIVE: {
    translationKey: 'staff.statusActive',
    bg: 'var(--kc-success-bg)',
    fg: 'var(--kc-success)',
    icon: CheckCircle2,
  },
  SUSPENDED: {
    translationKey: 'staff.statusSuspended',
    bg: 'var(--kc-warning-bg)',
    fg: 'var(--kc-warning)',
    icon: PauseCircle,
  },
  TERMINATED: {
    translationKey: 'staff.statusTerminated',
    bg: 'var(--kc-error-bg)',
    fg: 'var(--kc-error)',
    icon: XCircle,
  },
};

export function StaffStatusBadge({
  status,
  className,
  hideIcon,
}: StaffStatusBadgeProps) {
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
