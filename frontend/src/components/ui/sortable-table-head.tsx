'use client';

import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { TableHead } from '@/components/ui/table';

interface SortableTableHeadProps {
  label: string;
  /** Is this column the currently-active sort. */
  active: boolean;
  dir: 'asc' | 'desc';
  onClick: () => void;
  className?: string;
}

/**
 * Sortable column header — the SAAS standard. Idle shows ArrowUpDown in
 * --kc-text-4 (muted); active shows ArrowUp (asc) / ArrowDown (desc) and the
 * whole header in --kc-p-600 (purple). One sort active at a time is the caller's
 * responsibility. See SEARCH-FILTER-PATTERN.md › Table patterns.
 */
export function SortableTableHead({
  label,
  active,
  dir,
  onClick,
  className,
}: SortableTableHeadProps) {
  const Icon = active ? (dir === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown;
  return (
    <TableHead className={className}>
      <button
        type="button"
        onClick={onClick}
        aria-label={label}
        className="inline-flex items-center gap-1.5 transition-colors hover:text-[var(--kc-text-1)]"
        style={active ? { color: 'var(--kc-p-600)' } : undefined}
      >
        {label}
        <Icon
          className="h-3.5 w-3.5"
          style={{ color: active ? 'var(--kc-p-600)' : 'var(--kc-text-4)' }}
          aria-hidden
        />
      </button>
    </TableHead>
  );
}
