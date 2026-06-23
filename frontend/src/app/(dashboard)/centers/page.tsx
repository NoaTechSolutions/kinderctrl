'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  usePathname,
  useRouter,
  useSearchParams,
} from 'next/navigation';
import { Plus } from 'lucide-react';
import { useCenters } from '@/lib/hooks/use-centers';
import { useMediaQuery } from '@/lib/hooks/use-media-query';
import { useDebouncedValue } from '@/lib/hooks/use-debounced-value';
import { useTranslation } from '@/lib/i18n';
import { useAuthStore } from '@/store/auth';
import { Button } from '@/components/ui/button';
import { SearchInput } from '@/components/ui/search-input';
import { Skeleton } from '@/components/ui/skeleton';
import { Pagination } from '@/components/ui/pagination';
import { FilterTabs, type FilterTab } from '@/components/ui/filter-tabs';
import { FilterDropdown } from '@/components/ui/filter-dropdown';
import { CenterCard } from '@/components/centers/center-card';
import { CenterTable } from '@/components/centers/center-table';
import { EmptyState } from '@/components/centers/empty-state';
import { CriticalAlerts } from '@/components/admin/critical-alerts';
import type { CenterStatus, CentersQuery } from '@/lib/types/center';

type StatusFilter = 'ALL' | CenterStatus;

// Valid filter values, kept module-scoped for parseStatus (which runs
// during render init before hooks). Labels are localized inside the
// component via `t()` so they stay in sync with translations.ts.
const STATUS_VALUES: ReadonlyArray<StatusFilter> = [
  'ALL',
  'ACTIVE',
  'SETUP_PENDING',
  'SUSPENDED',
  'CLOSED',
];

// Page size deliberately differs by viewport: mobile lists scroll, desktop
// has a denser table. Backend caps at 100 so anything we send is honored.
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
  // 300ms debounce keeps every keystroke from firing a backend request;
  // the URL gets the committed value too so refresh / shareable links work.
  const debouncedQuery = useDebouncedValue(query, 300);

  const page = parsePage(searchParams.get('page'));
  const status = parseStatus(searchParams.get('status'));
  const limit = isDesktop ? DESKTOP_LIMIT : MOBILE_LIMIT;

  // Built inside the component so labels track the active locale.
  const statusTabs = useMemo<ReadonlyArray<FilterTab<StatusFilter>>>(
    () => [
      { value: 'ALL', label: t('centers.statusAll') },
      { value: 'ACTIVE', label: t('centers.statusActive') },
      { value: 'SETUP_PENDING', label: t('centers.statusSetupPending') },
      { value: 'SUSPENDED', label: t('centers.statusSuspended') },
      { value: 'CLOSED', label: t('centers.statusClosed') },
    ],
    [t],
  );

  const centersQuery: CentersQuery = {
    page,
    limit,
    ...(status !== 'ALL' && { status: status as CenterStatus }),
    ...(debouncedQuery.trim() && { search: debouncedQuery.trim() }),
  };
  const { data: centers, isLoading, error } = useCenters(centersQuery);

  // STAFF/PARENT don't belong on the centers index — both deep-link to
  // their assigned center. Backend already filters by role; this matches
  // the surface to the data.
  useEffect(() => {
    if (!hasHydrated || !user) return;
    if (
      (user.role === 'STAFF' || user.role === 'PARENT') &&
      user.centerId
    ) {
      router.replace(`/centers/${user.centerId}`);
    }
  }, [hasHydrated, user, router]);

  // URL is the source of truth for page + status. Routing through
  // useSearchParams keeps the back button + refresh + shareable links
  // all consistent. Changing the filter always resets to page 1 — a
  // stale page number can land on an empty page after the predicate
  // shrinks the result set.
  const setSearchParam = (updates: {
    page?: number;
    status?: StatusFilter;
  }) => {
    const next = new URLSearchParams(searchParams.toString());
    if (updates.status !== undefined) {
      if (updates.status === 'ALL') {
        next.delete('status');
      } else {
        next.set('status', updates.status);
      }
      next.delete('page');
    }
    if (updates.page !== undefined) {
      if (updates.page <= 1) {
        next.delete('page');
      } else {
        next.set('page', String(updates.page));
      }
    }
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  };

  // Search now happens server-side via the `search` query param —
  // useDebouncedValue throttles input + useCenters wires it into the request.
  // The visible list is just `centers.data`; no client-side filtering.
  const visible = centers?.data ?? [];

  // Typing in the search box must reset pagination — the page the user was
  // on may no longer exist once the result set shrinks. Wrap setQuery so
  // the page reset happens in one place.
  const onSearchChange = (next: string) => {
    setQuery(next);
    if (page > 1) setSearchParam({ page: 1 });
  };

  // Suppress the admin list flash while replace() runs.
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

  // PARENT/STAFF are scoped to a single center by data model, so the page
  // (only reachable when they have no centerId — the redirect above takes
  // them straight to their center otherwise) reads as singular and skips
  // the "All centers" subtitle. DIRECTOR keeps the existing rule: singular
  // only when they genuinely own exactly one center.
  const isSingleCenterRole =
    user?.role === 'PARENT' || user?.role === 'STAFF';
  const isSingularContext =
    isSingleCenterRole ||
    (user?.role === 'DIRECTOR' && centers?.pagination.total === 1);

  const total = centers?.pagination.total ?? 0;
  const hasSearch = debouncedQuery.trim().length > 0;
  const filterActive = status !== 'ALL';
  // Show the tabs whenever there's any data scoped to the role OR a
  // filter / search is active (so the user can clear it from an empty result).
  const showFilterTabs = total > 0 || filterActive || hasSearch;
  const showEmptyAll = !isLoading && total === 0 && !filterActive && !hasSearch;
  const showEmptyFiltered =
    !isLoading && total === 0 && (filterActive || hasSearch);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight">
            {isSingularContext
              ? t('centers.titleSingular')
              : t('centers.title')}
          </h1>
        </div>

        {canCreateCenter && (
          <Button asChild className="self-start">
            <Link href="/centers/new">
              <Plus className="mr-2 h-4 w-4" />
              {t('centers.create')}
            </Link>
          </Button>
        )}
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-lg border p-4"
          style={{
            background: 'var(--kc-error-bg)',
            borderColor:
              'color-mix(in oklch, var(--kc-error), transparent 70%)',
          }}
        >
          <p className="text-sm" style={{ color: 'var(--kc-error)' }}>
            {t('centers.loadError')}
            {error.message ? ` — ${error.message}` : ''}
          </p>
        </div>
      )}

      {/* SUPER_ADMIN-only critical alerts banner. The component renders null
          for other roles, so it's safe to mount unconditionally. */}
      <CriticalAlerts />

      {/* Desktop status tabs (BUG-015: hidden on mobile because 5 tabs
          overflow at 375px — mobile uses the dropdown below). */}
      {showFilterTabs && (
        <div className="hidden md:block">
          <FilterTabs
            tabs={statusTabs}
            value={status}
            onChange={(s) => setSearchParam({ status: s })}
            ariaLabel={t('centers.filterAria')}
          />
        </div>
      )}

      {/* Mobile filter dropdown — IMPROVEMENT-041: stays visible even when
          the current filter returns 0 results, so the user can change
          filters from the empty state without using the "Clear filter"
          fallback. When there IS data we keep the BUG-015 inline layout
          (search + dropdown on the same row); when there isn't, the
          dropdown sits alone aligned right. */}
      {showFilterTabs && (centers?.data.length || hasSearch) ? (
        <div className="md:hidden flex items-center gap-2">
          <SearchInput
            value={query}
            onChange={onSearchChange}
            placeholder={t('centers.searchPlaceholder')}
            ariaLabel={t('centers.searchAria')}
            className="flex-1"
          />
          <FilterDropdown
            options={statusTabs}
            value={status}
            onChange={(s) => setSearchParam({ status: s })}
            ariaLabel={t('centers.filterAria')}
          />
        </div>
      ) : null}

      {showFilterTabs && !hasSearch && (!centers || centers.data.length === 0) && (
        <div className="md:hidden flex justify-end">
          <FilterDropdown
            options={statusTabs}
            value={status}
            onChange={(s) => setSearchParam({ status: s })}
            ariaLabel={t('centers.filterAria')}
          />
        </div>
      )}

      {/* Desktop search — always visible alongside the table so users can keep
          refining the result set even when the current query returns nothing. */}
      {!isLoading && (centers?.data.length || hasSearch) ? (
        <div className="hidden md:block max-w-md">
          <SearchInput
            value={query}
            onChange={onSearchChange}
            placeholder={t('centers.searchPlaceholder')}
            ariaLabel={t('centers.searchAria')}
          />
        </div>
      ) : null}

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
              <Button variant="outline" size="sm" onClick={() => setSearchParam({ status: 'ALL' })}>
                {t('centers.clearFilter')}
              </Button>
            )}
          </div>
        </div>
      )}

      {!isLoading && visible.length > 0 && (
        <>
          <div className="hidden md:block">
            <CenterTable centers={visible} />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:hidden">
            {visible.map((c) => (
              <CenterCard key={c.id} center={c} />
            ))}
          </div>
        </>
      )}

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
