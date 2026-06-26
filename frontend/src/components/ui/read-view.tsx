'use client';

import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
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
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-3',
  4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
};
export function ReadGrid({ children, cols = 2 }: { children: ReactNode; cols?: 2 | 3 | 4 }) {
  return <dl className={`grid gap-x-6 gap-y-4 ${READ_GRID_COLS[cols]}`}>{children}</dl>;
}

// One label/value pair (card design). Label row = optional semantic icon +
// uppercase 10px muted label; value is clean text below (no box/border/bg).
// Empty renders NOTHING (no dash / "Not set") — the field-to-field gap separates.
// `full` spans both columns (long text like notes / plans).
export function ReadRow({
  label,
  value,
  full,
  icon: Icon,
  children,
}: {
  label: string;
  value?: string | null;
  full?: boolean;
  icon?: LucideIcon;
  children?: ReactNode;
}) {
  // Empty = empty (global rule). A lone placeholder ('—' / '–' / 'N/A') counts
  // as empty too, so the many callers still passing one render blank without
  // each needing an edit.
  const trimmed = typeof value === 'string' ? value.trim() : '';
  const valueEmpty = trimmed === '' || trimmed === '—' || trimmed === '–' || trimmed === 'N/A';
  const hasValue = children != null || !valueEmpty;
  return (
    // Fixed min-height so a value-less field still holds its grid slot (label +
    // icon only) — the grid never collapses/reflows whether data is present.
    <div className={full ? 'min-h-12 sm:col-span-full' : 'min-h-12'}>
      <dt
        className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.05em]"
        style={{ color: 'var(--kc-text-3)' }}
      >
        {Icon && (
          <Icon className="h-3.5 w-3.5 flex-none" style={{ color: 'var(--kc-p-600)' }} />
        )}
        {label}
      </dt>
      {hasValue && (
        <dd
          className="mt-1 text-[13px] break-words whitespace-pre-wrap"
          style={{ color: 'var(--kc-text-1)' }}
        >
          {children ?? value}
        </dd>
      )}
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
