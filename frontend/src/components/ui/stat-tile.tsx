'use client';

import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

/**
 * Big-number KPI tile (SAAS standard): a large centered value over a small
 * uppercase label, NO icon. Default value tint is brand purple; pass `color`
 * for semantic states (e.g. warning). With `href` the whole tile becomes a
 * link (used by report stats that drill into a module).
 *
 * Mirrors the Centers Overview stat tiles. Use this anywhere a metric is shown
 * as a tile; for the denser icon+value mobile rows use `compact-stat-card.tsx`.
 */
export function StatTile({
  label,
  value,
  color,
  href,
  className,
}: {
  label: string;
  value: string;
  color?: string;
  href?: string;
  // Grid-item overrides (e.g. col-span-2 to span a full mobile row). When
  // there's an href the <Link> is the grid item, so the class goes there.
  className?: string;
}) {
  const card = (
    <Card
      className={cn(
        'h-24 gap-0 py-0',
        href && 'transition-shadow hover:shadow-md',
        !href && className,
      )}
    >
      <CardContent className="flex h-full flex-col items-center justify-center gap-1 p-3 text-center">
        <p
          className="text-[32px] font-bold leading-none tabular-nums"
          style={{ color: color ?? 'var(--kc-p-600)' }}
        >
          {value}
        </p>
        <p
          className="text-xs font-medium uppercase tracking-wide leading-tight"
          style={{ color: 'var(--kc-text-3)' }}
        >
          {label}
        </p>
      </CardContent>
    </Card>
  );
  return href ? (
    <Link href={href} className={cn('block', className)}>
      {card}
    </Link>
  ) : (
    card
  );
}
