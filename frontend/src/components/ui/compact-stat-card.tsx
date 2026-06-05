'use client';

import { type LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

/**
 * Compact, fixed-height stat card for mobile stat rows. The fixed h-20 is what
 * guarantees every stat card lines up at the same compact height on phones —
 * regardless of icon/sublabel presence — and `truncate` keeps the value from
 * overflowing on the smallest (~320px) screens. Shared by the dashboard mobile
 * stat grids and the /kiosk-settings mobile stat row so they stay consistent
 * and never drift.
 */
export function CompactStatCard({
  icon: Icon,
  iconColor,
  label,
  value,
  sublabel,
}: {
  icon?: LucideIcon;
  iconColor?: string;
  label: string;
  value: string;
  sublabel?: string;
}) {
  return (
    <Card className="h-20 gap-0 py-0">
      {/* py-0/gap-0 override the shadcn Card defaults (py-6 + gap-6) — without
          this they'd eat ~48px of the h-20, leaving no room for the value
          (it overflowed and read as "label only"). */}
      <CardContent className="flex h-full flex-col items-center justify-center gap-0.5 p-2 text-center">
        {Icon && <Icon className="h-4 w-4 flex-none" style={{ color: iconColor }} />}
        <p
          className="w-full truncate text-[10px] font-medium uppercase leading-tight tracking-wide"
          style={{ color: 'var(--kc-text-3)' }}
        >
          {label}
        </p>
        <p
          className="w-full truncate text-xs font-semibold leading-tight"
          style={{ color: 'var(--kc-text-1)' }}
        >
          {value}
        </p>
        {sublabel && (
          <p className="text-[10px] leading-tight" style={{ color: 'var(--kc-text-3)' }}>
            {sublabel}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
