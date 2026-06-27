'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, Clock, DollarSign, UserX, type LucideIcon } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useAuthStore } from '@/store/auth';
import { useCenterStats, useGlobalStats } from '@/lib/hooks/use-centers';

// The 3 derived alert counts every alerts surface speaks (matches the center
// stats / global stats `alerts` shape). They're COMPUTED server-side from live
// data (corrections >48h, overdue payrolls, staff with no clock-in 7d) — not
// stored notifications, so "Dismiss all" is a client-side hide (see below).
export interface AlertCounts {
  oldCorrections: number;
  overduePayrolls: number;
  staffWithoutClockIn: number;
}

const EMPTY: AlertCounts = {
  oldCorrections: 0,
  overduePayrolls: 0,
  staffWithoutClockIn: 0,
};

// One alert row's resolved config (icon + semantic color + count + message +
// the module route that resolves it). All routes are verified to exist:
//   corrections → /attendance/corrections (the manager review queue)
//   payroll     → /reports/payroll (period processing)
//   staff       → /attendance/team (team clock view — see who hasn't punched)
// SA's alerts are GLOBAL aggregates (no per-center attribution), so the links
// land on the general module rather than a specific center.
type AlertRow = {
  key: string;
  icon: LucideIcon;
  color: string;
  count: number;
  label: string;
  href: string;
};

function buildRows(a: AlertCounts): AlertRow[] {
  const rows: AlertRow[] = [];
  if (a.oldCorrections > 0) {
    rows.push({
      key: 'corrections',
      icon: Clock,
      color: 'var(--kc-warning)',
      count: a.oldCorrections,
      label: `correction request${a.oldCorrections > 1 ? 's' : ''} pending more than 48h`,
      href: '/attendance/corrections',
    });
  }
  if (a.overduePayrolls > 0) {
    rows.push({
      key: 'payroll',
      icon: DollarSign,
      color: 'var(--kc-error)',
      count: a.overduePayrolls,
      label: `payroll period${a.overduePayrolls > 1 ? 's' : ''} overdue`,
      href: '/reports/payroll',
    });
  }
  if (a.staffWithoutClockIn > 0) {
    rows.push({
      key: 'staff',
      icon: UserX,
      color: 'var(--kc-warning)',
      count: a.staffWithoutClockIn,
      label: `active staff with no clock-in in the last 7 days`,
      href: '/attendance/team',
    });
  }
  return rows;
}

/**
 * Bell + count badge + compact alerts dropdown (Option B). Presentational —
 * the caller supplies the alert counts (global for SA, per-center for a
 * DIRECTOR / the center header). Shared by the topbar and the center header.
 *
 * "Dismiss all" hides the alerts for the session (client-side). The alerts are
 * derived, not acknowledgeable notifications, so a refresh / new alert
 * re-surfaces them — the effect below un-dismisses whenever the counts change.
 */
export function AlertsBell({
  alerts,
  size = 18,
  ariaLabel = 'Alerts',
}: {
  alerts?: AlertCounts;
  size?: number;
  ariaLabel?: string;
}) {
  const router = useRouter();
  const live = alerts ?? EMPTY;
  const total =
    live.oldCorrections + live.overduePayrolls + live.staffWithoutClockIn;

  // Controlled so a row click can close the dropdown on its way to the route.
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  // A changed alert set un-dismisses, so a freshly-raised alert re-shows.
  useEffect(() => {
    setDismissed(false);
  }, [live.oldCorrections, live.overduePayrolls, live.staffWithoutClockIn]);

  const shown = dismissed ? 0 : total;
  const rows = dismissed ? [] : buildRows(live);

  const goTo = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={ariaLabel}
          className="relative inline-flex flex-none items-center justify-center rounded-md p-1.5 transition-colors hover:bg-[var(--kc-surface-2)]"
        >
          <Bell
            style={{ width: size, height: size, color: 'var(--kc-text-2)' }}
            aria-hidden
          />
          {shown > 0 && (
            <span
              className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold leading-none text-white"
              style={{ background: 'var(--kc-error)' }}
              aria-label={`${shown} active`}
            >
              {shown}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        {/* Header: count + Dismiss all */}
        <div
          className="flex items-center justify-between gap-2 border-b px-3 py-2.5"
          style={{ borderColor: 'var(--kc-border)' }}
        >
          <span className="text-sm font-semibold" style={{ color: 'var(--kc-text-1)' }}>
            {shown > 0 ? `${shown} active alert${shown > 1 ? 's' : ''}` : 'No alerts'}
          </span>
          {shown > 0 && (
            <button
              type="button"
              onClick={() => setDismissed(true)}
              className="text-xs font-medium transition-colors hover:underline"
              style={{ color: 'var(--kc-p-600)' }}
            >
              Dismiss all
            </button>
          )}
        </div>

        {rows.length > 0 ? (
          <ul className="py-1">
            {rows.map((r) => {
              const Icon = r.icon;
              return (
                <li key={r.key}>
                  {/* Whole row is the click target → navigates + closes. */}
                  <button
                    type="button"
                    onClick={() => goTo(r.href)}
                    className="flex w-full cursor-pointer items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-[var(--kc-surface-2)]"
                  >
                    {/* 24px rounded square, semantic-tinted */}
                    <span
                      className="flex h-6 w-6 flex-none items-center justify-center rounded-md"
                      style={{
                        background: `color-mix(in oklch, ${r.color}, transparent 85%)`,
                        color: r.color,
                      }}
                    >
                      <Icon className="h-3.5 w-3.5" aria-hidden />
                    </span>
                    <span
                      className="min-w-0 flex-1 text-xs"
                      style={{ color: 'var(--kc-text-2)' }}
                    >
                      {r.label}
                    </span>
                    <span
                      className="flex-none rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums"
                      style={{ background: 'var(--kc-surface)', color: 'var(--kc-text-2)' }}
                    >
                      {r.count}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="px-3 py-8 text-center text-sm" style={{ color: 'var(--kc-text-3)' }}>
            No alerts
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

/**
 * Topbar variant — picks the data source by role: SUPER_ADMIN sees the global
 * aggregate (all centers), a DIRECTOR sees their own center, everyone else
 * gets an (empty) bell so the affordance stays consistent SAAS-wide.
 */
export function TopbarAlertsBell() {
  const role = useAuthStore((s) => s.user?.role);
  const centerId = useAuthStore((s) => s.user?.centerId);

  if (role === 'SUPER_ADMIN') return <GlobalBell />;
  if (role === 'DIRECTOR' && centerId) return <CenterBell centerId={centerId} />;
  return <AlertsBell alerts={undefined} />;
}

function GlobalBell() {
  const { data } = useGlobalStats();
  return <AlertsBell alerts={data?.alerts} />;
}

function CenterBell({ centerId }: { centerId: string }) {
  const { data } = useCenterStats(centerId);
  return <AlertsBell alerts={data?.alerts} />;
}
