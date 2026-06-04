'use client';

import { Settings2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface AdminCenterBadgeProps {
  className?: string;
}

/**
 * Badge shown exclusively for the "KinderCtrl Admin" center
 * (`center.isAdminCenter === true`).  Uses a slate/indigo tone via
 * color-mix so it reads as "system-managed" and never clashes with the
 * semantic status colors (success/warning/error/info) used by StatusBadge.
 */
export function AdminCenterBadge({ className }: AdminCenterBadgeProps) {
  return (
    <Badge
      className={cn(
        'border-transparent font-medium inline-flex items-center gap-1',
        className,
      )}
      style={{
        background:
          'color-mix(in oklch, var(--kc-p-100, #e0e7ff), transparent 20%)',
        color: 'var(--kc-p-700, #3730a3)',
      }}
    >
      <Settings2 className="h-3 w-3" aria-hidden />
      Admin Center
    </Badge>
  );
}
