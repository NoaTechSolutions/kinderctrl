'use client';

import { CheckCircle2, Clock, PauseCircle, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { ChildEnrollmentStatus } from '@/lib/types/child';

const STATUS_CONFIG: Record<
  ChildEnrollmentStatus,
  { label: string; bg: string; fg: string; icon: typeof Clock }
> = {
  PENDING: {
    label: 'Pending',
    bg: 'var(--kc-warning-bg)',
    fg: 'var(--kc-warning)',
    icon: Clock,
  },
  ACTIVE: {
    label: 'Active',
    bg: 'var(--kc-success-bg)',
    fg: 'var(--kc-success)',
    icon: CheckCircle2,
  },
  INACTIVE: {
    label: 'Inactive',
    bg: 'var(--kc-surface-2)',
    fg: 'var(--kc-text-3)',
    icon: PauseCircle,
  },
  WITHDRAWN: {
    label: 'Withdrawn',
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
      {cfg.label}
    </Badge>
  );
}
