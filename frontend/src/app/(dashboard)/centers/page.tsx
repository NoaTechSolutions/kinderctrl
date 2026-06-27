'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { LayoutGrid, Plus, Table as TableIcon } from 'lucide-react';
import { useCenters } from '@/lib/hooks/use-centers';
import { useMediaQuery } from '@/lib/hooks/use-media-query';
import { useDebouncedValue } from '@/lib/hooks/use-debounced-value';
import { useTranslation } from '@/lib/i18n';
import { useAuthStore } from '@/store/auth';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Pagination } from '@/components/ui/pagination';
import { CenterCard } from '@/components/centers/center-card';
import { CenterTable } from '@/components/centers/center-table';
import {
  CentersFilterBar,
  type StatusFilter,
} from '@/components/centers/center-filter-bar';
import { EmptyState } from '@/components/centers/empty-state';
import type { CenterStatus, CentersQuery } from '@/lib/types/center';

// Valid filter values, kept module-scoped for parseStatus (which runs during
// render init before hooks).
const STATUS_VALUES: ReadonlyArray<StatusFilter> = [
  'ALL',
  'ACTIVE',
  'SETUP_PENDING',
  'SUSPENDED',
  'CLOSED',
];

const MOBILE_LIMIT = 10;
const DESKTOP_LIMIT = 15;

function parseStatus(raw: string | null): StatusFilter {
  if (!raw) return 'ALL';
  return (STATUS_VALUES as readonly string[]).includes(raw)
    ? (raw as StatusFilter)
    : 'ALL';
}

function parsePage(raw: string | null): number {
  const n = Number(raw);
  return Number.isInteger(n) && n >= 1 ? n : 1;
}

export default function CentersPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const user = useAuthStore((s) => s.user);
  const hasHydrated = useAuthStore((s) => s.hasHydrated);
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebouncedValue(query, 300);

  const page = parsePage(searchParams.get('page'));
  const status = parseStatus(searchParams.get('status'));
  const limit = isDesktop ? DESKTOP_LIMIT : MOBILE_LIMIT;

  // List view toggle (desktop only; mobile always shows cards). Persisted.
  // Default = cards (SAAS-wide default); a stored preference overrides it.
  const [view, setView] = useState<'table' | 'cards'>('cards');
  useEffect(() => {
    try {
      const stored = localStorage.getItem('kc-centers-view');
      if (stored === 'cards' || stored === 'table') setView(stored);
    } catch {
      // localStorage unavailable
    }
  }, []);
  const changeView = (next: 'table' | 'cards') => {
    setView(next);
    try {
      localStorage.setItem('kc-centers-view', next);
    } catch {
      // localStorage unavailable
    }
  };

  const centersQuery: CentersQuery = {
    page,
    limit,
    ...(status !== 'ALL' && { status: status as CenterStatus }),
    ...(debouncedQuery.trim() && { search: debouncedQuery.trim() }),
  };
  const { data: centers, isLoading, error } = useCenters(centersQuery);

  // STAFF/PARENT deep-link to their assigned center.
  useEffect(() => {
    if (!hasHydrated || !user) return;
    if ((user.role === 'STAFF' || user.role === 'PARENT') && user.centerId) {
      router.replace(`/centers/${user.centerId}`);
    }
  }, [hasHydrated, user, router]);

  // URL is the source of truth for page + status. Changing the filter resets
  // to page 1 (a stale page can land on an empty slice after the set shrinks).
  const setSearchParam = (updates: { page?: number; status?: StatusFilter }) => {
    const next = new URLSearchParams(searchParams.toString());
    if (updates.status !== undefined) {
      if (updates.status === 'ALL') next.delete('status');
      else next.set('status', updates.status);
      next.delete('page');
    }
    if (updates.page !== undefined) {
      if (updates.page <= 1) next.delete('page');
      else next.set('page', String(updates.page));
    }
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  };

  const visible = centers?.data ?? [];

  const onSearchChange = (next: string) => {
    setQuery(next);
    if (page > 1) setSearchParam({ page: 1 });
  };

  if (
    hasHydrated &&
    user &&
    (user.role === 'STAFF' || user.role === 'PARENT') &&
    user.centerId
  ) {
    return null;
  }

  const canCreateCenter =
    user?.role === 'SUPER_ADMIN' || user?.role === 'DIRECTOR';

  const isSingleCenterRole =
    user?.role === 'PARENT' || user?.role === 'STAFF';
  const isSingularContext =
    isSingleCenterRole ||
    (user?.role === 'DIRECTOR' && centers?.pagination.total === 1);

  const total = centers?.pagination.total ?? 0;
  const hasSearch = debouncedQuery.trim().length > 0;
  const filterActive = status !== 'ALL';
  const showFilterBar = total > 0 || filterActive || hasSearch;
  const showEmptyAll = !isLoading && total === 0 && !filterActive && !hasSearch;
  const showEmptyFiltered =
    !isLoading && total === 0 && (filterActive || hasSearch);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight">
            {isSingularContext ? t('centers.titleSingular') : t('centers.title')}
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start">
          {/* View toggle — desktop only; mobile (<md) always shows cards. */}
          <div
            role="group"
            aria-label={t('centers.viewToggle')}
            className="hidden rounded-lg border p-0.5 md:inline-flex"
            style={{ borderColor: 'var(--kc-border)', background: 'var(--kc-surface-2)' }}
          >
            <button
              type="button"
              onClick={() => changeView('table')}
              aria-pressed={view === 'table'}
              aria-label={t('centers.viewTable')}
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
              aria-label={t('centers.viewCards')}
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

          {canCreateCenter && (
            <Button asChild>
              <Link href="/centers/new">
                <Plus className="mr-2 h-4 w-4" />
                {t('centers.create')}
              </Link>
            </Button>
          )}
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
            {t('centers.loadError')}
            {error.message ? ` — ${error.message}` : ''}
          </p>
        </div>
      )}

      {showFilterBar && (
        <CentersFilterBar
          query={query}
          onQueryChange={onSearchChange}
          status={status}
          onStatusChange={(s) => setSearchParam({ status: s })}
        />
      )}

      {isLoading && (
        <>
          <div className="hidden md:block space-y-3">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:hidden">
            <Skeleton className="h-56 w-full" />
            <Skeleton className="h-56 w-full" />
          </div>
        </>
      )}

      {showEmptyAll && <EmptyState />}

      {showEmptyFiltered && (
        <div
          className="text-center py-12 space-y-3"
          style={{ color: 'var(--kc-text-3)' }}
        >
          <p className="text-sm">
            {hasSearch && filterActive
              ? t('centers.noMatchSearchStatus').replace('{query}', debouncedQuery)
              : hasSearch
                ? t('centers.noMatchSearch').replace('{query}', debouncedQuery)
                : t('centers.noMatchStatus')}
          </p>
          <div className="flex gap-2 justify-center">
            {hasSearch && (
              <Button variant="outline" size="sm" onClick={() => setQuery('')}>
                {t('centers.clearSearch')}
              </Button>
            )}
            {filterActive && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSearchParam({ status: 'ALL' })}
              >
                {t('centers.clearFilter')}
              </Button>
            )}
          </div>
        </div>
      )}

      {!isLoading &&
        visible.length > 0 &&
        (view === 'cards' ? (
          <div className="grid grid-cols-1 items-stretch gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {visible.map((c) => (
              <CenterCard key={c.id} center={c} />
            ))}
          </div>
        ) : (
          <>
            <div className="hidden md:block">
              <CenterTable centers={visible} />
            </div>
            <div className="grid grid-cols-1 items-stretch gap-4 sm:grid-cols-2 md:hidden">
              {visible.map((c) => (
                <CenterCard key={c.id} center={c} />
              ))}
            </div>
          </>
        ))}

      {centers && (
        <Pagination
          page={centers.pagination.page}
          totalPages={centers.pagination.totalPages}
          onPageChange={(p) => setSearchParam({ page: p })}
          disabled={isLoading}
        />
      )}
    </div>
  );
}
