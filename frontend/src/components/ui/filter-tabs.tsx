'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface FilterTab<T extends string> {
  value: T;
  // ReactNode (not just string) so callers can pass responsive labels, e.g.
  // a short span on mobile + the full label on sm: up.
  label: ReactNode;
}

interface FilterTabsProps<T extends string> {
  tabs: ReadonlyArray<FilterTab<T>>;
  value: T;
  onChange: (value: T) => void;
  ariaLabel?: string;
}

/**
 * Horizontal segmented control. Scrolls horizontally on narrow viewports
 * rather than wrapping — keeps the row visually compact. Built from
 * scratch (no Radix dep) because the design here is intentionally simpler
 * than @radix-ui/react-tabs' panel/trigger model.
 */
export function FilterTabs<T extends string>({
  tabs,
  value,
  onChange,
  ariaLabel,
}: FilterTabsProps<T>) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className="flex w-full gap-1 overflow-x-auto rounded-lg p-1"
      style={{ background: 'var(--kc-surface-2)' }}
    >
      {tabs.map((tab) => {
        const selected = tab.value === value;
        return (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => {
              if (!selected) onChange(tab.value);
            }}
            className={cn(
              'flex-none whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
              selected ? 'shadow-sm' : 'hover:bg-background/50',
            )}
            style={
              selected
                ? {
                    background: 'var(--kc-surface)',
                    color: 'var(--kc-text-1)',
                  }
                : { color: 'var(--kc-text-3)' }
            }
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
