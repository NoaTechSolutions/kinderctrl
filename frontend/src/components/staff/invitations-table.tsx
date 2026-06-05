'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ChevronDown, MoreVertical, RefreshCw, XCircle } from 'lucide-react';
import { toast, useConfirm } from '@/lib/toast';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { FilterDropdown } from '@/components/ui/filter-dropdown';
import { FilterTabs } from '@/components/ui/filter-tabs';
import { Pagination } from '@/components/ui/pagination';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ApiError } from '@/lib/api/client';
import {
  useInvitations,
  useResendInvitation,
  useRevokeInvitation,
} from '@/lib/hooks/use-staff';
import { useMediaQuery } from '@/lib/hooks/use-media-query';
import { useTranslation } from '@/lib/i18n';
import { useAuthStore } from '@/store/auth';
import {
  RESEND_MAX_IN_WINDOW,
  RESEND_WINDOW_MS,
  type Invitation,
  type InvitationStatus,
} from '@/lib/types/staff';

type StatusFilter = InvitationStatus | 'ALL';

// Per-viewport page sizes — same convention as centers + /staff lists
// (PO QA #22). Backend caps at @Max(100); these are well under that.
const MOBILE_LIMIT = 10;
const DESKTOP_LIMIT = 15;

// Maps each lifecycle state to a chip style. PENDING uses the brand
// primary; ACCEPTED green; EXPIRED red; CANCELLED muted grey. Tokens
// come from globals.css so dark mode stays in sync.
const STATUS_STYLES: Record<InvitationStatus, { bg: string; fg: string }> = {
  PENDING: { bg: 'var(--kc-p-50)', fg: 'var(--kc-p-700)' },
  ACCEPTED: {
    bg: 'color-mix(in oklch, var(--kc-success), transparent 85%)',
    fg: 'var(--kc-success)',
  },
  EXPIRED: { bg: 'var(--kc-error-bg)', fg: 'var(--kc-error)' },
  CANCELLED: { bg: 'var(--kc-surface-2)', fg: 'var(--kc-text-3)' },
};

// Self-contained invitations management surface (PO QA #13/#22). Renders:
//   • status filter tabs
//   • paginated desktop table (hidden sm:block)
//   • paginated mobile cards (sm:hidden)
//   • per-row Resend/Cancel actions, disabled for non-PENDING rows
//   • live MM:SS countdown when a row's per-invitation rate limit is hit
// Used by both /staff/invite (Director) and /admin/invitations (SUPER_ADMIN);
// the role-aware Center column / quota suppression differentiate the two.
export function InvitationsTable() {
  const { t } = useTranslation();
  const userRole = useAuthStore((s) => s.user?.role);
  // SUPER_ADMIN manages multiple centers — they need the column to know
  // WHICH center each invitation belongs to. DIRECTOR sees only their own
  // center(s) and the column is just noise (PO QA #13 AJUSTE 1).
  const showCenterColumn = userRole === 'SUPER_ADMIN';
  // PO QA #17 AJUSTE 2: SUPER_ADMIN bypasses the resend rate limit. The
  // backend doesn't bump the counters on their actions, but we also need
  // to suppress the client-side quota labels + countdown so the menu
  // always reads "Resend" for them.
  const isSuperAdmin = userRole === 'SUPER_ADMIN';

  // Pagination + viewport
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const limit = isDesktop ? DESKTOP_LIMIT : MOBILE_LIMIT;
  const pageParam = Number(searchParams.get('page'));
  const page =
    Number.isFinite(pageParam) && pageParam >= 1 ? pageParam : 1;

  const [filter, setFilter] = useState<StatusFilter>('PENDING');
  // Tracks which mobile cards are expanded — same pattern as the
  // multi-open Collapsible behavior in staff-card.tsx. Plain Set so the
  // user can browse several invitations at once on a long list.
  const [expandedCardIds, setExpandedCardIds] = useState<Set<string>>(
    () => new Set(),
  );
  const toggleExpanded = (id: string) =>
    setExpandedCardIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const { data, isLoading, error } = useInvitations({
    page,
    limit,
    status: filter === 'ALL' ? undefined : filter,
  });
  const rows = data?.data;
  const pagination = data?.pagination;
  const resendMutation = useResendInvitation();
  const revokeMutation = useRevokeInvitation();
  const [pendingActionId, setPendingActionId] = useState<string | null>(null);

  const setPage = (next: number) => {
    const params = new URLSearchParams(searchParams.toString());
    if (next <= 1) params.delete('page');
    else params.set('page', String(next));
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  };

  // When the filter changes, the page index from the prior filter no
  // longer indexes anything meaningful — reset to page 1.
  const handleFilterChange = (next: StatusFilter) => {
    if (next === filter) return;
    setFilter(next);
    if (page !== 1) setPage(1);
  };

  // Tick every second only while at least one PENDING row is at its
  // resend limit — so the menu item's countdown stays live (PO QA #15).
  // SUPER_ADMIN is never at-limit so the tick stays idle for them.
  const hasAtLimitRow = useMemo(() => {
    if (!rows || isSuperAdmin) return false;
    const now = Date.now();
    return rows.some(
      (inv) =>
        inv.status === 'PENDING' && describeResendQuota(inv, now).atLimit,
    );
  }, [rows, isSuperAdmin]);
  const now = useNowTick(hasAtLimitRow);

  const filterTabs: ReadonlyArray<{ value: StatusFilter; label: string }> = [
    { value: 'PENDING', label: t('staff.invStatusPending') },
    { value: 'ACCEPTED', label: t('staff.invStatusAccepted') },
    { value: 'EXPIRED', label: t('staff.invStatusExpired') },
    { value: 'CANCELLED', label: t('staff.invStatusCancelled') },
    { value: 'ALL', label: t('staff.invFilterAll') },
  ];

  const handleResend = (id: string, email: string) => {
    setPendingActionId(id);
    resendMutation.mutate(id, {
      onSuccess: () => {
        toast.success(
          t('staff.pendingResendSuccess').replace('{email}', email),
        );
        setPendingActionId(null);
      },
      onError: (err) => {
        const msg =
          err instanceof ApiError && err.message
            ? err.message
            : t('staff.pendingResendError');
        toast.error(msg);
        setPendingActionId(null);
      },
    });
  };

  // PO QA #51: branded destructive ConfirmDialog for the revoke action
  // (red Confirm button + alert icon). Replaces the native window.confirm
  // — which had no styling and lost the {email} context after dismiss.
  const confirm = useConfirm();
  const handleRevoke = async (id: string, email: string) => {
    const ok = await confirm({
      title: t('staff.pendingRevokeTitle'),
      description: t('staff.pendingRevokeConfirm').replace('{email}', email),
      confirmText: t('staff.pendingRevoke'),
      variant: 'destructive',
    });
    if (!ok) return;
    setPendingActionId(id);
    revokeMutation.mutate(id, {
      onSuccess: () => {
        toast.success(t('staff.pendingRevokeSuccess'));
        setPendingActionId(null);
      },
      onError: (err) => {
        const msg =
          err instanceof ApiError && err.message
            ? err.message
            : t('staff.pendingRevokeError');
        toast.error(msg);
        setPendingActionId(null);
      },
    });
  };

  const formatDate = (iso: string) => new Date(iso).toLocaleDateString();

  // Action menu is shared between table rows and mobile cards — same
  // disabled/label logic in both contexts.
  const ActionMenu = ({ inv }: { inv: Invitation }) => {
    const isWorking = pendingActionId === inv.id;
    const isPending = inv.status === 'PENDING';
    const resendInfo = isSuperAdmin
      ? UNLIMITED_QUOTA
      : describeResendQuota(inv, now);
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            aria-label={t('staff.pendingActions')}
            disabled={!isPending || isWorking}
            className="flex-none"
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            disabled={resendInfo.atLimit}
            onSelect={(e) => {
              if (resendInfo.atLimit) {
                e.preventDefault();
                return;
              }
              handleResend(inv.id, inv.email);
            }}
          >
            <RefreshCw className="h-4 w-4" />
            {resendInfo.atLimit
              ? t('staff.pendingResendAvailableIn').replace(
                  '{time}',
                  formatCountdown(resendInfo.msUntilReset),
                )
              : resendInfo.used > 0
                ? t('staff.pendingResendRemaining').replace(
                    '{remaining}',
                    String(resendInfo.remaining),
                  )
                : t('staff.pendingResend')}
          </DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            onSelect={(e) => {
              e.preventDefault();
              handleRevoke(inv.id, inv.email);
            }}
          >
            <XCircle className="h-4 w-4" />
            {t('staff.pendingRevoke')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  const StatusPill = ({ status }: { status: InvitationStatus }) => {
    const style = STATUS_STYLES[status];
    return (
      <span
        className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
        style={{ background: style.bg, color: style.fg }}
      >
        {t(`staff.invStatus${capitalize(status)}`)}
      </span>
    );
  };

  return (
    <div className="space-y-4">
      {/* Desktop: full filter tabs row. */}
      <div className="hidden sm:block">
        <FilterTabs<StatusFilter>
          tabs={filterTabs}
          value={filter}
          onChange={handleFilterChange}
          ariaLabel={t('staff.invFilterAria')}
        />
      </div>
      {/* Mobile: same options inside a dropdown so 5 tabs don't overflow
          at 320px (BUG-015 pattern from the centers list). PO QA #23. */}
      <div className="sm:hidden flex justify-end">
        <FilterDropdown<StatusFilter>
          options={filterTabs}
          value={filter}
          onChange={handleFilterChange}
          ariaLabel={t('staff.invFilterAria')}
        />
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
            {t('staff.invLoadError')}
          </p>
        </div>
      )}

      {isLoading && (
        <>
          {/* Desktop skeleton — matches the table's row height. */}
          <div className="hidden sm:block space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
          {/* Mobile skeleton — card-shaped to avoid a layout shift. */}
          <div className="sm:hidden space-y-3">
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
          </div>
        </>
      )}

      {!isLoading && !error && rows && rows.length === 0 && (
        <div
          className="rounded-lg border py-12 text-center"
          style={{
            background: 'var(--kc-surface)',
            borderColor: 'var(--kc-border)',
            color: 'var(--kc-text-3)',
          }}
        >
          <p className="text-sm">{t('staff.invEmpty')}</p>
        </div>
      )}

      {!isLoading && rows && rows.length > 0 && (
        <>
          {/* Desktop: full table (PO QA #15 — wrapper matches staff-table). */}
          <div
            className="hidden sm:block rounded-lg border overflow-x-auto [&_th:first-child]:pl-4 [&_th:last-child]:pr-4 [&_td:first-child]:pl-4 [&_td:last-child]:pr-4"
            style={{
              background: 'var(--kc-surface)',
              borderColor: 'var(--kc-border)',
            }}
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('staff.email')}</TableHead>
                  {showCenterColumn && (
                    <TableHead>{t('staff.invColCenter')}</TableHead>
                  )}
                  <TableHead>{t('staff.invColSent')}</TableHead>
                  <TableHead>{t('staff.invColExpires')}</TableHead>
                  <TableHead>{t('staff.invColStatus')}</TableHead>
                  <TableHead className="w-[80px] text-right">
                    {t('staff.colActions')}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell className="font-medium">{inv.email}</TableCell>
                    {showCenterColumn && (
                      <TableCell
                        style={{ color: 'var(--kc-text-3)' }}
                        className="text-sm"
                      >
                        {inv.centerName}
                      </TableCell>
                    )}
                    <TableCell
                      style={{ color: 'var(--kc-text-3)' }}
                      className="text-sm"
                    >
                      {formatDate(inv.createdAt)}
                    </TableCell>
                    <TableCell
                      style={{ color: 'var(--kc-text-3)' }}
                      className="text-sm"
                    >
                      {formatDate(inv.expiresAt)}
                    </TableCell>
                    <TableCell>
                      <StatusPill status={inv.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <ActionMenu inv={inv} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile: collapsible cards (PO QA #23). Header shows email +
              center + chevron; body holds Sent / Expires / Status +
              inline Resend / Cancel buttons. Same multi-open pattern as
              staff-card.tsx — users can keep several open while browsing.
              min-w-0 on each row keeps long emails from blowing out the
              viewport. */}
          <div className="sm:hidden space-y-3">
            {rows.map((inv) => {
              const isOpen = expandedCardIds.has(inv.id);
              const isWorking = pendingActionId === inv.id;
              const isPending = inv.status === 'PENDING';
              const resendInfo = isSuperAdmin
                ? UNLIMITED_QUOTA
                : describeResendQuota(inv, now);
              return (
                <Collapsible
                  key={inv.id}
                  open={isOpen}
                  onOpenChange={() => toggleExpanded(inv.id)}
                >
                  <Card className="overflow-hidden gap-3 py-3">
                    <CollapsibleTrigger asChild>
                      <button
                        type="button"
                        className="block w-full cursor-pointer bg-transparent text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                        style={
                          {
                            '--tw-ring-color':
                              'color-mix(in oklch, var(--kc-p-500), transparent 60%)',
                          } as React.CSSProperties
                        }
                        aria-label={
                          isOpen
                            ? `${t('staff.pendingActions')} ${inv.email}`
                            : `${inv.email} — ${t('staff.invColStatus')}: ${t(`staff.invStatus${capitalize(inv.status)}`)}`
                        }
                      >
                        <CardHeader className="grid-cols-1">
                          {/* PO QA #24 layout: row 1 = email (left) +
                              status pill (right) + chevron (far right).
                              Row 2 = center name below (SUPER_ADMIN only,
                              same hierarchy as staff-card.tsx where the
                              secondary identifier sits under the name). */}
                          <div className="space-y-1 min-w-0">
                            <div className="flex items-center gap-2 min-w-0">
                              <span
                                className={cn(
                                  'font-medium text-sm leading-tight min-w-0 flex-1',
                                  isOpen ? '' : 'truncate',
                                )}
                                title={isOpen ? undefined : inv.email}
                              >
                                {inv.email}
                              </span>
                              <StatusPill status={inv.status} />
                              <ChevronDown
                                className={cn(
                                  'h-5 w-5 flex-none transition-transform duration-200',
                                  isOpen && 'rotate-180',
                                )}
                                style={{ color: 'var(--kc-text-3)' }}
                                aria-hidden
                              />
                            </div>
                            {showCenterColumn && (
                              <p
                                className="text-xs truncate min-w-0"
                                style={{ color: 'var(--kc-text-3)' }}
                                title={inv.centerName}
                              >
                                {inv.centerName}
                              </p>
                            )}
                          </div>
                        </CardHeader>
                      </button>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <CardContent className="space-y-2.5 text-sm">
                        <CardRow label={t('staff.invColSent')}>
                          {formatDate(inv.createdAt)}
                        </CardRow>
                        <CardRow label={t('staff.invColExpires')}>
                          {formatDate(inv.expiresAt)}
                        </CardRow>
                        {isPending && (
                          <div className="flex gap-2 pt-1">
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1"
                              disabled={resendInfo.atLimit || isWorking}
                              onClick={() =>
                                handleResend(inv.id, inv.email)
                              }
                            >
                              <RefreshCw className="mr-1 h-4 w-4" />
                              {resendInfo.atLimit
                                ? formatCountdown(resendInfo.msUntilReset)
                                : resendInfo.used > 0
                                  ? t('staff.pendingResendRemaining').replace(
                                      '{remaining}',
                                      String(resendInfo.remaining),
                                    )
                                  : t('staff.pendingResend')}
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              className="flex-1"
                              disabled={isWorking}
                              onClick={() => handleRevoke(inv.id, inv.email)}
                            >
                              <XCircle className="mr-1 h-4 w-4" />
                              {t('staff.pendingRevoke')}
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              );
            })}
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

// One row of a mobile invitation card: label on the left, value on the
// right. Truncates long values so the card never blows out the viewport.
function CardRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 min-w-0">
      <span style={{ color: 'var(--kc-text-3)' }} className="flex-none">
        {label}
      </span>
      <span className="min-w-0 truncate text-right">{children}</span>
    </div>
  );
}

function capitalize(s: string) {
  return s.charAt(0) + s.slice(1).toLowerCase();
}

// Synthetic quota for SUPER_ADMIN — used=0, never at-limit, no countdown.
// Pushes the menu item's render branches into the "plain Resend" path
// without needing role conditionals at the call site (PO QA #17).
const UNLIMITED_QUOTA = {
  used: 0,
  remaining: Number.POSITIVE_INFINITY,
  atLimit: false,
  msUntilReset: 0,
} as const;

// Mirror server-side resend rate limit logic so the menu item can preview
// the quota without a roundtrip. Caller passes `nowMs` for purity — the
// useNowTick hook below feeds it a value that updates every second while
// any row is at the limit, which is what drives the live countdown.
//
// `used` is 0 when the sliding window has drifted past 1h since the last
// resend (the next attempt resets to 1 server-side). `msUntilReset` is
// only meaningful while `atLimit` — represents how long until the bucket
// becomes stale and the user can resend again.
function describeResendQuota(
  inv: Invitation,
  nowMs: number,
): {
  used: number;
  remaining: number;
  atLimit: boolean;
  msUntilReset: number;
} {
  if (!inv.lastResendAt) {
    return {
      used: 0,
      remaining: RESEND_MAX_IN_WINDOW,
      atLimit: false,
      msUntilReset: 0,
    };
  }
  const lastResendMs = new Date(inv.lastResendAt).getTime();
  const windowEnd = lastResendMs + RESEND_WINDOW_MS;
  const windowAlive = nowMs < windowEnd;
  const used = windowAlive ? inv.resendCount : 0;
  const remaining = Math.max(0, RESEND_MAX_IN_WINDOW - used);
  const atLimit = remaining === 0;
  return {
    used,
    remaining,
    atLimit,
    msUntilReset: atLimit ? Math.max(0, windowEnd - nowMs) : 0,
  };
}

// MM:SS for the countdown shown next to a rate-limited Resend menu item.
// Always at least one minute slot — "0:42" reads better than "42s" when
// the rest of the countdown shows minutes.
function formatCountdown(ms: number): string {
  const totalSec = Math.max(0, Math.ceil(ms / 1000));
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${String(sec).padStart(2, '0')}`;
}

// Returns Date.now() updated every second WHILE `active` is true. When
// inactive, returns a stable timestamp captured on the last activation
// boundary so consumers don't see a stale value but also don't burn
// re-renders. Component-scoped — multiple InvitationsTable instances each
// run their own tick. Cleans up on unmount/deactivate.
function useNowTick(active: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [active]);
  return now;
}
