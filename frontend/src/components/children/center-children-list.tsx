'use client';

import type { ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { LayoutGrid, Plus, Table as TableIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDebouncedValue } from '@/lib/hooks/use-debounced-value';
import { useCenterChildren } from '@/lib/hooks/use-children';
import { ageInMonths } from '@/lib/format-child';
import { useTranslation } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ChildTable } from './child-table';
import { ChildCard } from './child-card';
import { ChildrenEmptyState } from './children-empty-state';
import {
  ChildrenFilterBar,
  EMPTY_SECONDARY,
  secondaryActiveCount,
  type AgeGroup,
  type AttQuickFilter,
  type SecondaryFilters,
} from './children-filter-bar';

// Maps an ISO birth date to one of the four age-group buckets used by the
// secondary filter (months: infant <12 · toddler <36 · preschool <60 · school).
function ageGroupOf(birthIso: string): AgeGroup {
  const m = ageInMonths(birthIso);
  if (m < 12) return 'infant';
  if (m < 36) return 'toddler';
  if (m < 60) return 'preschool';
  return 'school';
}

/**
 * A center's children roster — search + table (tablet+) / cards (mobile) +
 * "+ New Child". Shared by the standalone /children page (DIRECTOR, with the
 * "Children" heading) AND the Children tab on /centers/[id] (SUPER_ADMIN
 * parity, no heading). The create button always carries ?centerId so the
 * wizard targets THIS center (the backend re-checks access).
 */
export function CenterChildrenList({
  centerId,
  heading,
}: {
  centerId: string;
  heading?: ReactNode;
}) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const search = useDebouncedValue(query, 300).trim();
  const hasSearch = search.length > 0;

  // List view toggle (DIRECTOR/SA, desktop only). Persisted across sessions;
  // mobile (<md) always renders cards regardless of this. Default = table.
  const [view, setView] = useState<'table' | 'cards'>('table');
  useEffect(() => {
    try {
      const stored = localStorage.getItem('kc-children-view');
      if (stored === 'cards' || stored === 'table') setView(stored);
    } catch {
      // localStorage unavailable
    }
  }, []);
  const changeView = (next: 'table' | 'cards') => {
    setView(next);
    try {
      localStorage.setItem('kc-children-view', next);
    } catch {
      // localStorage unavailable
    }
  };

  // Quick attendance filter (chips) + secondary filters (popover). Status is
  // server-side (the endpoint supports enrollmentStatus, and it's the only way
  // to surface WITHDRAWN, which the list hides by default); everything else
  // filters the already-loaded data client-side.
  const [quick, setQuick] = useState<AttQuickFilter>('all');
  const [secondary, setSecondary] = useState<SecondaryFilters>(EMPTY_SECONDARY);
  const anyFilterActive = quick !== 'all' || secondaryActiveCount(secondary) > 0;

  const { data: children, isLoading, error } = useCenterChildren(centerId, {
    search: hasSearch ? search : undefined,
    enrollmentStatus: secondary.statuses.length ? secondary.statuses : undefined,
  });

  // Client-side secondary filters (allergies / age / infant sleep), then counts
  // per attendance bucket, then the quick-filter view. Counts reflect the
  // secondary-filtered set so the chips stay cumulative.
  const afterSecondary = useMemo(
    () =>
      (children ?? []).filter((c) => {
        if (secondary.hasAllergies && c.medicalSummary.allergies.length === 0)
          return false;
        if (secondary.hasInfantSleep && !c.hasInfantSleepPlan) return false;
        if (
          secondary.ageGroups.length &&
          !secondary.ageGroups.includes(ageGroupOf(c.dateOfBirth))
        )
          return false;
        return true;
      }),
    [children, secondary.hasAllergies, secondary.hasInfantSleep, secondary.ageGroups],
  );

  const counts = useMemo(() => {
    const c: Record<AttQuickFilter, number> = {
      all: 0,
      PRESENT: 0,
      NOT_ARRIVED: 0,
      END_OF_SHIFT: 0,
      NOT_SCHEDULED: 0,
    };
    for (const child of afterSecondary) {
      c.all++;
      const s = child.attendanceToday.status;
      if (
        s === 'PRESENT' ||
        s === 'NOT_ARRIVED' ||
        s === 'END_OF_SHIFT' ||
        s === 'NOT_SCHEDULED'
      ) {
        c[s]++;
      }
    }
    return c;
  }, [afterSecondary]);

  const displayed = useMemo(
    () =>
      quick === 'all'
        ? afterSecondary
        : afterSecondary.filter((c) => c.attendanceToday.status === quick),
    [afterSecondary, quick],
  );

  const showFilterBar =
    !isLoading &&
    !error &&
    ((children?.length ?? 0) > 0 || hasSearch || anyFilterActive);

  // Truly empty (no children at all) vs filtered-to-nothing — drives which
  // empty state to show.
  const noChildrenAtAll =
    (children?.length ?? 0) === 0 && !hasSearch && !anyFilterActive;

  return (
    <div className="space-y-6">
      <div
        className={cn(
          'flex flex-col gap-4 sm:flex-row sm:items-start',
          heading ? 'sm:justify-between' : 'sm:justify-end',
        )}
      >
        {heading}
        <div className="flex items-center gap-2 self-start">
          {/* View toggle — desktop only; mobile (<md) always shows cards. */}
          <div
            role="group"
            aria-label={t('children.viewToggle')}
            className="hidden rounded-lg border p-0.5 md:inline-flex"
            style={{ borderColor: 'var(--kc-border)', background: 'var(--kc-surface-2)' }}
          >
            <button
              type="button"
              onClick={() => changeView('table')}
              aria-pressed={view === 'table'}
              aria-label={t('children.viewTable')}
              className="flex h-8 w-8 items-center justify-center rounded-md transition-colors"
              style={
                view === 'table'
                  ? { background: 'var(--kc-surface)', color: 'var(--kc-text-1)' }
                  : { color: 'var(--kc-text-3)' }
              }
            >
              <TableIcon className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => changeView('cards')}
              aria-pressed={view === 'cards'}
              aria-label={t('children.viewCards')}
              className="flex h-8 w-8 items-center justify-center rounded-md transition-colors"
              style={
                view === 'cards'
                  ? { background: 'var(--kc-surface)', color: 'var(--kc-text-1)' }
                  : { color: 'var(--kc-text-3)' }
              }
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>
          <Button asChild>
            <Link href={`/children/new?centerId=${centerId}`}>
              <Plus className="mr-1.5 h-4 w-4" />
              {t('children.newChild')}
            </Link>
          </Button>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-lg border p-4"
          style={{
            background: 'var(--kc-error-bg)',
            borderColor: 'color-mix(in oklch, var(--kc-error), transparent 70%)',
          }}
        >
          <p className="text-sm" style={{ color: 'var(--kc-error)' }}>
            {t('children.loadError')}
            {error.message ? ` — ${error.message}` : ''}
          </p>
        </div>
      )}

      {showFilterBar && (
        <ChildrenFilterBar
          query={query}
          onQueryChange={setQuery}
          quick={quick}
          onQuickChange={setQuick}
          counts={counts}
          secondary={secondary}
          onSecondaryChange={setSecondary}
        />
      )}

      {isLoading && (
        <div className="space-y-3">
          <Skeleton className="h-12 w-full rounded-lg" />
          <Skeleton className="h-16 w-full rounded-lg" />
          <Skeleton className="h-16 w-full rounded-lg" />
          <Skeleton className="h-16 w-full rounded-lg" />
        </div>
      )}

      {!isLoading && children && displayed.length === 0 && (
        noChildrenAtAll ? (
          <ChildrenEmptyState canCreate />
        ) : (
          <div className="py-12 text-center" style={{ color: 'var(--kc-text-3)' }}>
            <p className="text-sm">
              {hasSearch ? (
                <>
                  {t('children.noMatchPrefix')}{' '}
                  <span className="font-mono">&quot;{search}&quot;</span>
                </>
              ) : (
                t('children.noMatchFilters')
              )}
            </p>
          </div>
        )
      )}

      {!isLoading && children && displayed.length > 0 && (
        view === 'cards' ? (
          // Cards everywhere (toggle=cards): md 2 · lg 3 · xl 4 · 2xl 5.
          <div className="grid grid-cols-1 items-stretch gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
            {displayed.map((c) => (
              <ChildCard key={c.id} child={c} />
            ))}
          </div>
        ) : (
          // Default (toggle=table): table on md+, cards on mobile (<md).
          <>
            <div className="hidden md:block">
              <ChildTable children={displayed} />
            </div>
            <div className="grid grid-cols-1 items-stretch gap-4 md:hidden">
              {displayed.map((c) => (
                <ChildCard key={c.id} child={c} />
              ))}
            </div>
          </>
        )
      )}
    </div>
  );
}
