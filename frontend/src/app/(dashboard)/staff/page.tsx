'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { LayoutGrid, Mail, Plus, Table as TableIcon } from 'lucide-react';
import { useStaff } from '@/lib/hooks/use-staff';
import { useMediaQuery } from '@/lib/hooks/use-media-query';
import { useDebouncedValue } from '@/lib/hooks/use-debounced-value';
import { useTranslation } from '@/lib/i18n';
import { useAuthStore } from '@/store/auth';
import { Button } from '@/components/ui/button';
import { Pagination } from '@/components/ui/pagination';
import { StaffListSkeleton } from '@/components/skeletons/staff-list-skeleton';
import { StaffTable } from '@/components/staff/staff-table';
import { StaffCard } from '@/components/staff/staff-card';
import {
  StaffFilterBar,
  EMPTY_SECONDARY,
  secondaryActiveCount,
  type StatusQuickFilter,
  type StaffSecondaryFilters,
} from '@/components/staff/staff-filter-bar';
import { EmptyState } from '@/components/staff/empty-state';

// Per-viewport page sizes mirror the centers list (PO QA #20). Backend caps at
// @Max(100); these stay well under that.
const MOBILE_LIMIT = 10;
const DESKTOP_LIMIT = 15;

export default function StaffPage() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const limit = isDesktop ? DESKTOP_LIMIT : MOBILE_LIMIT;

  // URL is the source of truth for page (back-button + refresh + share links).
  const pageParam = Number(searchParams.get('page'));
  const page = Number.isFinite(pageParam) && pageParam >= 1 ? pageParam : 1;

  const [query, setQuery] = useState('');
  const debouncedQuery = useDebouncedValue(query, 300);
  const searchTerm = debouncedQuery.trim();
  const hasActiveSearch = searchTerm.length > 0;

  const { data, isLoading, error } = useStaff({
    page,
    limit,
    ...(hasActiveSearch && { search: searchTerm }),
  });
  const staff = data?.data;
  const pagination = data?.pagination;

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const canCreate = user?.role === 'DIRECTOR' || isSuperAdmin;

  // List view toggle (desktop only; mobile always shows cards). Persisted.
  // Default = cards (SAAS-wide default); a stored preference overrides it.
  const [view, setView] = useState<'table' | 'cards'>('cards');
  useEffect(() => {
    try {
      const stored = localStorage.getItem('kc-staff-view');
      if (stored === 'cards' || stored === 'table') setView(stored);
    } catch {
      // localStorage unavailable
    }
  }, []);
  const changeView = (next: 'table' | 'cards') => {
    setView(next);
    try {
      localStorage.setItem('kc-staff-view', next);
    } catch {
      // localStorage unavailable
    }
  };

  // Quick status chips + secondary filters (Role, Center). Both client-side
  // over the loaded page (search is the server-side axis).
  const [quick, setQuick] = useState<StatusQuickFilter>('all');
  const [secondary, setSecondary] =
    useState<StaffSecondaryFilters>(EMPTY_SECONDARY);
  const anyFilterActive =
    quick !== 'all' || secondaryActiveCount(secondary) > 0;

  // Center options (SUPER_ADMIN) derived from the loaded page's distinct centers.
  const centerOptions = useMemo(() => {
    if (!isSuperAdmin || !staff) return [];
    const map = new Map<string, string>();
    for (const s of staff) {
      if (s.centerId && s.centerName) map.set(s.centerId, s.centerName);
    }
    return [...map.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [isSuperAdmin, staff]);

  const afterSecondary = useMemo(() => {
    if (!staff) return [];
    return staff.filter((s) => {
      if (secondary.roles.length && !secondary.roles.includes(s.role))
        return false;
      if (
        secondary.centerIds.length &&
        (!s.centerId || !secondary.centerIds.includes(s.centerId))
      )
        return false;
      return true;
    });
  }, [staff, secondary.roles, secondary.centerIds]);

  const counts = useMemo(() => {
    const c: Record<StatusQuickFilter, number> = {
      all: 0,
      ACTIVE: 0,
      INVITED: 0,
      SUSPENDED: 0,
    };
    for (const s of afterSecondary) {
      c.all++;
      if (s.status === 'ACTIVE' || s.status === 'INVITED' || s.status === 'SUSPENDED') {
        c[s.status]++;
      }
    }
    return c;
  }, [afterSecondary]);

  const displayed = useMemo(
    () =>
      quick === 'all'
        ? afterSecondary
        : afterSecondary.filter((s) => s.status === quick),
    [afterSecondary, quick],
  );

  const setPage = (next: number) => {
    const params = new URLSearchParams(searchParams.toString());
    if (next <= 1) params.delete('page');
    else params.set('page', String(next));
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  };

  const onSearchChange = (next: string) => {
    setQuery(next);
    if (page > 1) setPage(1);
  };

  // Snap back to page 1 when the requested page is past the last one.
  useEffect(() => {
    if (!isLoading && pagination && page > pagination.totalPages) {
      setPage(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, pagination?.totalPages, page]);

  const showFilterBar =
    !isLoading &&
    !error &&
    ((staff?.length ?? 0) > 0 || hasActiveSearch || anyFilterActive);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight">
            {t('staff.title')}
          </h1>
          <p className="mt-1.5 text-sm" style={{ color: 'var(--kc-text-3)' }}>
            {t('staff.list')}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start">
          {/* View toggle — desktop only; mobile (<md) always shows cards. */}
          <div
            role="group"
            aria-label={t('staff.viewToggle')}
            className="hidden rounded-lg border p-0.5 md:inline-flex"
            style={{ borderColor: 'var(--kc-border)', background: 'var(--kc-surface-2)' }}
          >
            <button
              type="button"
              onClick={() => changeView('table')}
              aria-pressed={view === 'table'}
              aria-label={t('staff.viewTable')}
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
              aria-label={t('staff.viewCards')}
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

          {canCreate && (
            <>
              <Button asChild variant="outline">
                <Link href="/staff/invite">
                  <Mail className="mr-1.5 h-4 w-4" />
                  {t('staff.invite')}
                </Link>
              </Button>
              <Button asChild>
                <Link href={isSuperAdmin ? '/admin/staff/new' : '/staff/new'}>
                  <Plus className="mr-1.5 h-4 w-4" />
                  {t('staff.adminCreateButton')}
                </Link>
              </Button>
            </>
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
            {t('staff.loadError')}
            {error.message ? ` — ${error.message}` : ''}
          </p>
        </div>
      )}

      {showFilterBar && (
        <StaffFilterBar
          query={query}
          onQueryChange={onSearchChange}
          quick={quick}
          onQuickChange={setQuick}
          counts={counts}
          secondary={secondary}
          onSecondaryChange={setSecondary}
          showCenter={isSuperAdmin}
          centerOptions={centerOptions}
        />
      )}

      {isLoading && <StaffListSkeleton />}

      {/* Truly empty (no staff at all, no search) → first-run empty state. */}
      {!isLoading &&
        pagination &&
        pagination.total === 0 &&
        (hasActiveSearch ? (
          <div className="py-12 text-center" style={{ color: 'var(--kc-text-3)' }}>
            <p className="text-sm">
              {t('staff.noStaffFound')}{' '}
              <span className="font-mono">&quot;{searchTerm}&quot;</span>
            </p>
          </div>
        ) : (
          <EmptyState />
        ))}

      {/* Loaded rows but filtered to nothing (client-side chips/secondary). */}
      {!isLoading &&
        staff &&
        staff.length > 0 &&
        displayed.length === 0 && (
          <div className="py-12 text-center" style={{ color: 'var(--kc-text-3)' }}>
            <p className="text-sm">{t('staff.noStaffMatchFilters')}</p>
          </div>
        )}

      {!isLoading &&
        staff &&
        displayed.length > 0 &&
        (view === 'cards' ? (
          <div className="grid grid-cols-1 items-stretch gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
            {displayed.map((s) => (
              <StaffCard key={s.id} staff={s} userRole={user?.role} />
            ))}
          </div>
        ) : (
          <>
            <div className="hidden md:block">
              <StaffTable staff={displayed} userRole={user?.role} />
            </div>
            <div className="grid grid-cols-1 items-stretch gap-4 md:hidden">
              {displayed.map((s) => (
                <StaffCard key={s.id} staff={s} userRole={user?.role} />
              ))}
            </div>
          </>
        ))}

      {pagination && (
        <Pagination
          page={pagination.page}
          totalPages={pagination.totalPages}
          onPageChange={setPage}
          disabled={isLoading}
        />
      )}
    </div>
  );
}
