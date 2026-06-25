'use client';

import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FilterChipProps {
  icon: LucideIcon;
  label: string;
  count?: number;
  /**
   * The chip's SEMANTIC color — a CSS var or color value (e.g. var(--kc-success)).
   * Inactive renders a tint of it (color-mix); active fills with it solid. Pass a
   * SAAS token, never a hardcoded hex, so chips stay theme/dark-mode correct.
   */
  color: string;
  active: boolean;
  onClick: () => void;
  className?: string;
}

/**
 * Quick-filter chip — pill with an icon, label, and optional count. Two states:
 *  - inactive: a transparent tint of `color` + colored text/icon
 *  - active:   solid `color` fill + white text
 *
 * Part of the standard list search/filter pattern — see
 * src/components/ui/SEARCH-FILTER-PATTERN.md. Reuse this for any quick-filter
 * row (attendance, status, category…) instead of hand-rolling chips.
 */
export function FilterChip({
  icon: Icon,
  label,
  count,
  color,
  active,
  onClick,
  className,
}: FilterChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'inline-flex flex-none items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium transition-colors',
        className,
      )}
      style={
        active
          ? { background: color, color: '#fff' }
          : {
              background: `color-mix(in oklch, ${color}, transparent 88%)`,
              color,
            }
      }
    >
      <Icon className="h-3.5 w-3.5 flex-none" aria-hidden />
      <span className="whitespace-nowrap">{label}</span>
      {count !== undefined && (
        <span
          className="tabular-nums"
          style={{ opacity: active ? 0.9 : 0.7 }}
        >
          {count}
        </span>
      )}
    </button>
  );
}
