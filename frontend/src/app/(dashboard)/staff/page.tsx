'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Filter, Mail, Plus } from 'lucide-react';
import { useStaff } from '@/lib/hooks/use-staff';
import { useMediaQuery } from '@/lib/hooks/use-media-query';
import { useDebouncedValue } from '@/lib/hooks/use-debounced-value';
import { useTranslation } from '@/lib/i18n';
import { useAuthStore } from '@/store/auth';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SearchInput } from '@/components/ui/search-input';
import { Pagination } from '@/components/ui/pagination';
import { StaffListSkeleton } from '@/components/skeletons/staff-list-skeleton';
import { StaffTable } from '@/components/staff/staff-table';
import { StaffCard } from '@/components/staff/staff-card';
import { EmptyState } from '@/components/staff/empty-state';
import type { StaffRole, StaffStatus } from '@/lib/types/staff';

// PO QA #61: filter button options. TERMINATED is intentionally not in
// FILTER_STATUSES because the backend's findAll already strips
// TERMINATED rows from the list (see staff.service.ts line ~467); a
// filter for an unreachable state would just confuse the user.
const FILTER_STATUSES: ReadonlyArray<StaffStatus> = [
  'INVITED',
  'ACTIVE',
  'SUSPENDED',
];
const FILTER_ROLES: ReadonlyArray<StaffRole> = [
  'TEACHER',
  'ASSISTANT',
  'ADMIN',
];

const STATUS_LABEL_KEY: Record<StaffStatus, string> = {
  INVITED: 'staff.statusInvited',
  ACTIVE: 'staff.statusActive',
  SUSPENDED: 'staff.statusSuspended',
  TERMINATED: 'staff.statusTerminated',
};
const ROLE_LABEL_KEY: Record<StaffRole, string> = {
  TEACHER: 'staff.roleTeacher',
  ASSISTANT: 'staff.roleAssistant',
  ADMIN: 'staff.roleAdmin',
};

// Per-viewport page sizes mirror the centers list (PO QA #20). Mobile
// cards scroll vertically so a tighter page reads better; desktop's
// denser table can fit more rows. Backend caps at @Max(100); these
// values are well under that. Bumping requires no schema change.
const MOBILE_LIMIT = 10;
const DESKTOP_LIMIT = 15;

export default function StaffPage() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // 1024px+ counts as "desktop" for pagination — matches the centers
  // list. useMediaQuery is SSR-safe (returns false on first paint), so
  // the initial render uses MOBILE_LIMIT and refetches once the
  // breakpoint is known on the client.
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const limit = isDesktop ? DESKTOP_LIMIT : MOBILE_LIMIT;
  // URL is the source of truth for page so back-button + refresh + share
  // links all stay consistent (same pattern as the centers list).
  const pageParam = Number(searchParams.get('page'));
  const page =
    Number.isFinite(pageParam) && pageParam >= 1 ? pageParam : 1;

  const [query, setQuery] = useState('');
  // 300ms debounce — see useDebouncedValue. Pair with the server-side
  // search query param (`?search`) handled in staff.service.ts findAll.
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

  // PO QA #61: client-side multi-select filters for status + role.
  // Same caveat as the search input — filters the CURRENT page only.
  // Empty set = "no filter applied for this dimension"; once at least
  // one value is selected, only rows matching it pass. Stored as Set
  // so toggle is O(1) and the membership check during the useMemo
  // filter pass stays cheap even with many staff on a page.
  const [statusFilter, setStatusFilter] = useState<Set<StaffStatus>>(
    new Set(),
  );
  const [roleFilter, setRoleFilter] = useState<Set<StaffRole>>(new Set());
  const activeFilterCount = statusFilter.size + roleFilter.size;

  const toggleStatusFilter = (s: StaffStatus, checked: boolean) => {
    setStatusFilter((prev) => {
      const next = new Set(prev);
      if (checked) next.add(s);
      else next.delete(s);
      return next;
    });
  };
  const toggleRoleFilter = (r: StaffRole, checked: boolean) => {
    setRoleFilter((prev) => {
      const next = new Set(prev);
      if (checked) next.add(r);
      else next.delete(r);
      return next;
    });
  };
  const clearFilters = () => {
    setStatusFilter(new Set());
    setRoleFilter(new Set());
  };

  const canCreate =
    user?.role === 'DIRECTOR' || user?.role === 'SUPER_ADMIN';

  const setPage = (next: number) => {
    const params = new URLSearchParams(searchParams.toString());
    if (next <= 1) params.delete('page');
    else params.set('page', String(next));
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  };

  // Typing in the search box must reset pagination — the page the user was
  // on may no longer exist once the result set shrinks.
  const onSearchChange = (next: string) => {
    setQuery(next);
    if (page > 1) setPage(1);
  };

  // BUG 1: snap back to page 1 when the requested page is past the last
  // one. This happens when the desktop/mobile limit flips (skip then
  // exceeds total → backend returns an empty slice) or the result set
  // shrinks under the current page. Without this the list renders blank
  // with no way back. totalPages floors at 1, so page 1 is always valid
  // and the guard can't loop.
  useEffect(() => {
    if (!isLoading && pagination && page > pagination.totalPages) {
      setPage(1);
    }
    // setPage is recreated each render; the meaningful inputs are below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, pagination?.totalPages, page]);

  // Search is now server-side; only status + role filters run client-side
  // (they're a follow-up; same pattern can move them to ?status=&role= later).
  const filtered = useMemo(() => {
    if (!staff) return [];
    let result = staff;
    if (statusFilter.size > 0) {
      result = result.filter((s) => statusFilter.has(s.status));
    }
    if (roleFilter.size > 0) {
      result = result.filter((s) => roleFilter.has(s.role));
    }
    return result;
  }, [staff, query, statusFilter, roleFilter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight">
            {t('staff.title')}
          </h1>
          <p
            className="mt-1.5 text-sm"
            style={{ color: 'var(--kc-text-3)' }}
          >
            {t('staff.list')}
          </p>
        </div>

        {/* PO QA #28 Opción F: "Add Manually" button removed alongside
            the manual create endpoint.
            PO QA #29 Opción F++: SUPER_ADMIN gets a second button
            "Create Staff" linking to the full-page entry at
            /admin/staff/new. Same backend (POST /staff/invite) as the
            modal — just a different UI surface that opens the pre-fill
            section by default. */}
        {canCreate && (
          <div className="flex flex-wrap gap-2 self-start">
            {/* PO QA #56 (BUG 1): Invite is the secondary action
                (outline), Create Staff is the primary (default fill).
                Previous variant logic flipped Invite to filled for
                DIRECTOR — that worked when DIRECTOR didn't have a
                Create button, but now both roles see both buttons and
                they were rendering with identical styling. */}
            <Button asChild variant="outline">
              <Link href="/staff/invite">
                <Mail className="mr-1.5 h-4 w-4" />
                {t('staff.invite')}
              </Link>
            </Button>
            {/* PO QA #55 (FEATURE 3): DIRECTOR also gets the Create
                Staff button — routes to /staff/new (their surface) vs
                SUPER_ADMIN's /admin/staff/new. The admin route group
                guards on SUPER_ADMIN at the layout level so the two
                roles can't share that path; both submit to POST /staff
                which now accepts DIRECTOR (the service uses the
                caller's role to resolve centerId). */}
            {(user?.role === 'SUPER_ADMIN' ||
              user?.role === 'DIRECTOR') && (
              <Button asChild>
                <Link
                  href={
                    user?.role === 'SUPER_ADMIN'
                      ? '/admin/staff/new'
                      : '/staff/new'
                  }
                >
                  <Plus className="mr-1.5 h-4 w-4" />
                  {t('staff.adminCreateButton')}
                </Link>
              </Button>
            )}
          </div>
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
            {t('staff.loadError')}
            {error.message ? ` — ${error.message}` : ''}
          </p>
        </div>
      )}

      {!isLoading && (staff?.length || debouncedQuery.trim()) ? (
        <div className="flex items-center gap-2 max-w-md">
          <SearchInput
            value={query}
            onChange={onSearchChange}
            placeholder="Search by name or email…"
            ariaLabel="Search staff"
            className="flex-1 min-w-0"
          />
          {/* PO QA #61: filter button next to the search input. Same
              control on mobile and desktop — DropdownMenu portals
              outside the column flow so it doesn't squeeze the search
              input on narrow viewports. The badge counter on the
              trigger surfaces active filters at a glance. */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="relative h-10 w-10 flex-none"
                aria-label={t('staff.filterButton')}
              >
                <Filter className="h-4 w-4" />
                {activeFilterCount > 0 && (
                  <span
                    className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold leading-none"
                    style={{
                      background: 'var(--kc-p-600)',
                      color: 'var(--kc-on-primary, #fff)',
                    }}
                    aria-label={`${activeFilterCount} active`}
                  >
                    {activeFilterCount}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>{t('staff.filterStatus')}</DropdownMenuLabel>
              {FILTER_STATUSES.map((s) => (
                <DropdownMenuCheckboxItem
                  key={s}
                  checked={statusFilter.has(s)}
                  // Radix passes Indeterminate | boolean — narrow to
                  // boolean before mutating our Set.
                  onCheckedChange={(c) => toggleStatusFilter(s, c === true)}
                  // Keep menu open between toggles so the user can pick
                  // multiple in one go.
                  onSelect={(e) => e.preventDefault()}
                >
                  {t(STATUS_LABEL_KEY[s])}
                </DropdownMenuCheckboxItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuLabel>{t('staff.filterRole')}</DropdownMenuLabel>
              {FILTER_ROLES.map((r) => (
                <DropdownMenuCheckboxItem
                  key={r}
                  checked={roleFilter.has(r)}
                  onCheckedChange={(c) => toggleRoleFilter(r, c === true)}
                  onSelect={(e) => e.preventDefault()}
                >
                  {t(ROLE_LABEL_KEY[r])}
                </DropdownMenuCheckboxItem>
              ))}
              {activeFilterCount > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <div className="px-2 py-1.5">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start text-xs"
                      onClick={clearFilters}
                    >
                      {t('staff.filterClear')}
                    </Button>
                  </div>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ) : null}

      {isLoading && <StaffListSkeleton />}

      {/* Empty states split two ways (BUG 2). The "all empty" check uses
          pagination.total (across ALL pages), not staff.length (current
          page only) — landing on a now-empty page 2 is handled by the
          snap-to-page-1 effect above, never here.
            - total 0 + active search → search-specific message so a
              zero-match query doesn't read as "this center has no staff"
              (e.g. searching the center name "Sunshine").
            - total 0 + no search → first-run empty state. */}
      {!isLoading &&
        pagination &&
        pagination.total === 0 &&
        (hasActiveSearch ? (
          <div
            className="text-center py-12"
            style={{ color: 'var(--kc-text-3)' }}
          >
            <p className="text-sm">
              {t('staff.noStaffFound')}{' '}
              <span className="font-mono">&quot;{searchTerm}&quot;</span>
            </p>
          </div>
        ) : (
          <EmptyState />
        ))}

      {!isLoading &&
        staff &&
        staff.length > 0 &&
        filtered.length === 0 && (
          <div
            className="text-center py-12"
            style={{ color: 'var(--kc-text-3)' }}
          >
            <p className="text-sm">
              No staff match{' '}
              <span className="font-mono">&quot;{query}&quot;</span>
            </p>
          </div>
        )}

      {!isLoading && filtered.length > 0 && (
        <>
          {/* Table from tablet up (sm:), cards only on phones (<640px).
              StaffTable's wrapper has overflow-x-auto, so on a narrow tablet
              the table scrolls horizontally inside its own container rather
              than the page. */}
          <div className="hidden sm:block">
            <StaffTable staff={filtered} userRole={user?.role} />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:hidden">
            {filtered.map((s) => (
              <StaffCard key={s.id} staff={s} userRole={user?.role} />
            ))}
          </div>
        </>
      )}

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
