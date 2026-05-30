'use client';

import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

// Profile v3 — reusable row inside info cards.
// Shape: [icon] [label / value]                                [action]
//
// Used by PersonalInfoSection (and reusable by other sections that
// adopt the same dense info-row pattern). Empty values render with
// muted italic placeholder via the `emptyPlaceholder` prop.
//
// `value` accepts ReactNode so callers can pass:
//   - a plain string ("John Doe")
//   - a Badge component (role display)
//   - a formatted JSX block (formatted phone with extra inline copy)
// When `value` is falsy (null/undefined/empty string) the placeholder
// renders instead with `text-muted` styling.
interface ProfileRowProps {
  icon: LucideIcon;
  label: string;
  value: ReactNode | null | undefined;
  emptyPlaceholder?: string;
  action?: ReactNode;
}

export function ProfileRow({
  icon: Icon,
  label,
  value,
  emptyPlaceholder = '—',
  action,
}: ProfileRowProps) {
  // Empty heuristic: explicit null/undefined OR an empty string. Other
  // falsy values (0, false) shouldn't appear in profile rows but if
  // they do, they render as-is — better than hiding real data.
  const isEmpty = value === null || value === undefined || value === '';
  return (
    <div className="flex items-center gap-3 py-2.5">
      <Icon
        className="h-4 w-4 flex-none"
        style={{ color: 'var(--kc-text-3)' }}
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <p
          className="text-xs font-medium"
          style={{ color: 'var(--kc-text-3)' }}
        >
          {label}
        </p>
        <div
          className="text-sm"
          style={
            isEmpty
              ? { color: 'var(--kc-text-3)', fontStyle: 'italic' }
              : { color: 'var(--kc-text-1)' }
          }
        >
          {isEmpty ? emptyPlaceholder : value}
        </div>
      </div>
      {action && <div className="flex-none">{action}</div>}
    </div>
  );
}
