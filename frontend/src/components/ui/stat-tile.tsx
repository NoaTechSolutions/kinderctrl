'use client';

import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';

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
}: {
  label: string;
  value: string;
  color?: string;
  href?: string;
}) {
  const card = (
    <Card
      className={
        href
          ? 'h-24 gap-0 py-0 transition-shadow hover:shadow-md'
          : 'h-24 gap-0 py-0'
      }
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
    <Link href={href} className="block">
      {card}
    </Link>
  ) : (
    card
  );
}
