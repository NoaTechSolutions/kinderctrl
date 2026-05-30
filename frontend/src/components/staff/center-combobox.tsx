'use client';

import { useMemo, useState } from 'react';
import { Check, Search } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { useTranslation } from '@/lib/i18n';
import { useCenters } from '@/lib/hooks/use-centers';
import { cn } from '@/lib/utils';

interface CenterComboboxProps {
  value?: string;
  onChange: (value: string | undefined) => void;
  disabled?: boolean;
  // Optional id for the search input + accessibility wiring.
  id?: string;
}

// Searchable Center picker for SUPER_ADMIN flows (PO QA #6 Opción Y + #8
// reuse). Inline list (no Popover/cmdk dep) — vertical space cost is fine
// in the form contexts that need it. Filters by center name OR director
// email, since SUPER_ADMIN is picking the Director implicitly via Center.
export function CenterCombobox({
  value,
  onChange,
  disabled,
  id = 'center-combobox',
}: CenterComboboxProps) {
  const { t } = useTranslation();
  const centersQuery = useCenters({});
  const centers = centersQuery.data?.data ?? [];

  const [search, setSearch] = useState('');
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return centers;
    return centers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.owner?.email ?? '').toLowerCase().includes(q),
    );
  }, [centers, search]);

  return (
    // w-full + min-w-0: defensive against grid/flex parents that wouldn't
    // otherwise constrain the listbox's intrinsic min-content. Long center
    // names have no break opportunity, and without these the parent column
    // grows past the viewport (PO QA #18/#21). Matches the same pattern
    // we apply to grid items elsewhere in the staff form.
    <div className="space-y-2 w-full min-w-0">
      <div className="relative">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none"
          style={{ color: 'var(--kc-text-3)' }}
          aria-hidden
        />
        <Input
          id={id}
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('staff.centerSearchPlaceholder')}
          disabled={disabled || centersQuery.isLoading}
          className="pl-9"
          aria-label={t('staff.centerSearchPlaceholder')}
        />
      </div>
      <div
        role="listbox"
        aria-label={t('staff.assignToCenter')}
        // PO QA #33: responsive cap based on viewport — `100vh - 300px`
        // leaves room for the topbar + back link + section heading
        // above the listbox so the cap grows with available space.
        // Typical laptop (1080vh) → ~780px cap → ~50 items fit inline.
        // Compact viewport (600vh) → ~300px cap → fallback to scroll.
        // The REAL UX answer for huge datasets is the search input
        // above this listbox — typing 2-3 letters filters to <5 items
        // and the cap stops mattering.
        className="rounded-md border max-h-[calc(100vh-300px)] overflow-y-auto"
        style={{
          background: 'var(--kc-surface)',
          borderColor: 'var(--kc-border)',
        }}
      >
        {centersQuery.isLoading && (
          <div
            className="px-3 py-4 text-sm"
            style={{ color: 'var(--kc-text-3)' }}
          >
            {t('staff.complianceLoading')}
          </div>
        )}
        {!centersQuery.isLoading && filtered.length === 0 && (
          <div
            className="px-3 py-4 text-sm"
            style={{ color: 'var(--kc-text-3)' }}
          >
            {t('staff.centerSearchEmpty')}
          </div>
        )}
        {filtered.map((c) => {
          const isSelected = c.id === value;
          return (
            <button
              key={c.id}
              type="button"
              role="option"
              aria-selected={isSelected}
              onClick={() => onChange(c.id)}
              disabled={disabled}
              className={cn(
                'w-full text-left px-3 py-2 flex items-start gap-2 transition-colors focus-visible:outline-none',
                isSelected
                  ? 'bg-primary/10 border-l-2 border-primary'
                  : 'hover:bg-secondary focus-visible:bg-secondary',
              )}
            >
              <span className="flex-1 min-w-0">
                <span className="block font-medium text-sm truncate">
                  {c.name}
                </span>
                <span
                  className="block text-xs truncate"
                  style={{ color: 'var(--kc-text-3)' }}
                >
                  Director: {c.owner?.email ?? '(no owner)'}
                </span>
              </span>
              {isSelected && (
                <Check
                  className="h-5 w-5 flex-none mt-0.5 text-green-600"
                  strokeWidth={3}
                  aria-hidden
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
