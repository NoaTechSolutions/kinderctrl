'use client';

import type { ReactNode } from 'react';
import { useTranslation } from '@/lib/i18n';
import type { Locale } from '@/lib/i18n';

// Read-mode primitives shared by the detail tabs. Definition-list rows with an
// uppercase label and a value that falls back to an em-dash when empty.

export function fmtDate(iso: string | null | undefined, locale: Locale): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(locale === 'es' ? 'es-ES' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function joinAddress(parts: Array<string | null | undefined>): string | null {
  const a = parts.filter(Boolean).join(' ');
  return a.trim() || null;
}

// Responsive definition grid. Always 1 column below `sm` (≤375). `cols={4}`
// scales 1 → 2 (sm/tablet) → 4 (lg) so it never gets cramped on tablet.
const READ_GRID_COLS: Record<2 | 3 | 4, string> = {
  2: 'sm:grid-cols-2',
  3: 'sm:grid-cols-3',
  4: 'sm:grid-cols-2 lg:grid-cols-4',
};
export function ReadGrid({ children, cols = 2 }: { children: ReactNode; cols?: 2 | 3 | 4 }) {
  return <dl className={`grid gap-x-6 gap-y-4 ${READ_GRID_COLS[cols]}`}>{children}</dl>;
}

// One label/value pair. `value` of null/'' renders an em-dash. `full` spans both
// columns (for long text like notes / plans).
export function ReadRow({
  label,
  value,
  full,
  children,
}: {
  label: string;
  value?: string | null;
  full?: boolean;
  children?: ReactNode;
}) {
  const display = children ?? (value && value.trim() ? value : '—');
  return (
    <div className={full ? 'sm:col-span-full' : undefined}>
      <dt className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--kc-text-3)' }}>
        {label}
      </dt>
      <dd className="mt-0.5 text-sm break-words whitespace-pre-wrap" style={{ color: 'var(--kc-text-1)' }}>
        {display}
      </dd>
    </div>
  );
}

// Renders a comma-separated free-text value as chips (falls back to em-dash).
export function CommaChips({ value }: { value: string | null | undefined }) {
  const items = (value ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (!items.length) return <>—</>;
  return (
    <span className="flex flex-wrap gap-1.5">
      {items.map((it, i) => (
        <span
          key={`${it}-${i}`}
          className="inline-flex rounded-full px-2 py-0.5 text-xs"
          style={{ background: 'var(--kc-surface-2)', color: 'var(--kc-text-2)' }}
        >
          {it}
        </span>
      ))}
    </span>
  );
}

// Muted "nothing recorded yet" hint for an empty read section.
export function EmptyHint({ children }: { children: ReactNode }) {
  return (
    <p className="text-sm" style={{ color: 'var(--kc-text-3)' }}>
      {children}
    </p>
  );
}

// "Yes" / "No" from a boolean, localized.
export function useBoolText() {
  const { t } = useTranslation();
  return (v: boolean) => (v ? t('children.yes') : t('children.no'));
}
