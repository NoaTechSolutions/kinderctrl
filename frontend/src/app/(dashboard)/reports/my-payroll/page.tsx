'use client';

import { useState } from 'react';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  DollarSign,
  Download,
  TrendingUp,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { CardWithHeader } from '@/components/ui/card-with-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  WeeklyBreakdownCard,
  useMonthNav,
} from '@/components/payroll/weekly-breakdown';
import { useMyPayroll } from '@/lib/hooks/use-attendance';
import { getMyPayrollPdfUrl } from '@/lib/api/attendance';
import { useAuthStore } from '@/store/auth';
import { useRequireRole } from '@/lib/hooks/use-require-role';
import type { DayCalc } from '@/lib/api/attendance';

// ============================================ helpers

function toYYYYMM(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function prevMonth(yyyymm: string): string {
  const [y, m] = yyyymm.split('-').map(Number);
  return toYYYYMM(new Date(y, m - 2, 1));
}

function nextMonth(yyyymm: string): string {
  const [y, m] = yyyymm.split('-').map(Number);
  return toYYYYMM(new Date(y, m, 1));
}

function formatMonthLabel(yyyymm: string): string {
  const [y, m] = yyyymm.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function fmtHours(h: number): string {
  const hrs = Math.floor(h);
  const mins = Math.round((h - hrs) * 60);
  return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
}

function fmtCurrency(n: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(n);
}

function fmtTime(iso: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return '—';
  }
}

/** Director's approval-status badge for a day (read-only for staff). */
function ApprovalBadge({ status }: { status?: DayCalc['approvalStatus'] }) {
  if (status === 'APPROVED') {
    return (
      <Badge style={{ background: 'color-mix(in oklch, var(--kc-success), transparent 80%)', color: 'var(--kc-success)' }}>
        ✅ Approved
      </Badge>
    );
  }
  if (status === 'PENDING') {
    return (
      <Badge style={{ background: 'var(--kc-warning-bg)', color: 'var(--kc-warning)' }}>
        ⏳ Pending
      </Badge>
    );
  }
  if (status === 'REJECTED') {
    return (
      <Badge style={{ background: 'color-mix(in oklch, var(--kc-error), transparent 80%)', color: 'var(--kc-error)' }}>
        ❌ Rejected
      </Badge>
    );
  }
  return <span style={{ color: 'var(--kc-text-3)' }}>—</span>;
}

// ============================================ MonthPicker (page-level: stats + daily table)

function MonthPicker({ value, onChange }: { value: string; onChange: (m: string) => void }) {
  const isCurrentMonth = value === toYYYYMM(new Date());
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => onChange(prevMonth(value))}
        className="flex h-8 w-8 items-center justify-center rounded-md border transition-colors hover:bg-muted"
        style={{ borderColor: 'var(--kc-border)' }}
        aria-label="Previous month"
      >
        <ChevronLeft className="h-4 w-4" style={{ color: 'var(--kc-text-3)' }} />
      </button>
      <span className="min-w-[9rem] text-center text-sm font-medium" style={{ color: 'var(--kc-text-1)' }}>
        {formatMonthLabel(value)}
      </span>
      <button
        type="button"
        onClick={() => onChange(nextMonth(value))}
        disabled={isCurrentMonth}
        className="flex h-8 w-8 items-center justify-center rounded-md border transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-40"
        style={{ borderColor: 'var(--kc-border)' }}
        aria-label="Next month"
      >
        <ChevronRight className="h-4 w-4" style={{ color: 'var(--kc-text-3)' }} />
      </button>
    </div>
  );
}

// ============================================ StatCard

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: typeof Clock;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-center gap-2 mb-1">
          <Icon className="h-4 w-4" style={{ color }} />
          <span className="text-xs font-medium" style={{ color: 'var(--kc-text-3)' }}>{label}</span>
        </div>
        <p className="text-2xl font-display font-semibold tabular-nums" style={{ color }}>{value}</p>
      </CardContent>
    </Card>
  );
}

// ============================================ MyWeeklyBreakdown
//
// Reuses the shared WeeklyBreakdownCard (same as the Director Individual tab),
// but fed by the STAFF-only useMyPayroll endpoint. Has its OWN month nav
// (current + 2 back), independent of the page-level month picker. otRate
// defaults to 1.5 (staff can't read center payroll settings) — the per-week
// Pay is an estimate; the authoritative total comes from the backend.

function MyWeeklyBreakdown() {
  const nav = useMonthNav();
  const { data, isLoading } = useMyPayroll(nav.month);
  return (
    <WeeklyBreakdownCard
      month={nav.month}
      canPrev={nav.canPrev}
      canNext={nav.canNext}
      onPrev={nav.goPrev}
      onNext={nav.goNext}
      isLoading={isLoading}
      days={data?.days ?? []}
      rate={data?.staff.hourlyRate ?? null}
      otRate={1.5}
      totalRegular={data?.totalRegular ?? 0}
      totalOvertime={data?.totalOvertime ?? 0}
      totalPay={data?.totalPay ?? 0}
    />
  );
}

// ============================================ DaysTable

function DaysTable({ days }: { days: DayCalc[] }) {
  if (!days.length) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-sm" style={{ color: 'var(--kc-text-3)' }}>No data for this month</p>
      </div>
    );
  }

  return (
    <div
      className="rounded-lg border overflow-x-auto [&_th:first-child]:pl-4 [&_th:last-child]:pr-4 [&_td:first-child]:pl-4 [&_td:last-child]:pr-4"
      style={{ background: 'var(--kc-surface)', borderColor: 'var(--kc-border)' }}
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Clock In</TableHead>
            <TableHead>Clock Out</TableHead>
            <TableHead>Break In</TableHead>
            <TableHead>Break Out</TableHead>
            <TableHead className="text-right">Regular h</TableHead>
            <TableHead className="text-right">Overtime h</TableHead>
            <TableHead className="text-center">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {days.map((day) => (
            <TableRow key={day.date}>
              <TableCell className="font-medium tabular-nums" style={{ color: 'var(--kc-text-1)' }}>
                {new Date(day.date + 'T12:00:00').toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                })}
              </TableCell>
              <TableCell className="tabular-nums" style={{ color: 'var(--kc-text-2)' }}>
                {fmtTime(day.clockIn)}
              </TableCell>
              <TableCell className="tabular-nums" style={{ color: 'var(--kc-text-2)' }}>
                {fmtTime(day.clockOut)}
              </TableCell>
              <TableCell className="tabular-nums" style={{ color: 'var(--kc-text-3)' }}>
                {fmtTime(day.breakIn)}
              </TableCell>
              <TableCell className="tabular-nums" style={{ color: 'var(--kc-text-3)' }}>
                {fmtTime(day.breakOut)}
              </TableCell>
              <TableCell className="text-right tabular-nums" style={{ color: 'var(--kc-text-2)' }}>
                {fmtHours(day.regularHours)}
              </TableCell>
              <TableCell
                className="text-right tabular-nums"
                style={{ color: day.overtimeHours > 0 ? 'var(--kc-warning)' : 'var(--kc-text-3)' }}
              >
                {fmtHours(day.overtimeHours)}
              </TableCell>
              <TableCell className="text-center">
                <div className="flex items-center justify-center gap-1.5">
                  <ApprovalBadge status={day.approvalStatus} />
                  {day.adjusted && (
                    <Badge
                      style={{
                        background: 'color-mix(in oklch, var(--kc-warning), transparent 75%)',
                        color: 'var(--kc-warning)',
                      }}
                    >
                      Edited
                    </Badge>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// ============================================ loading skeleton

function PageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-lg" />
        ))}
      </div>
      <Skeleton className="h-[308px] w-full rounded-lg" />
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full rounded" />
        ))}
      </div>
    </div>
  );
}

// ============================================ main page

export default function MyPayrollPage() {
  // Defense-in-depth role gate — this is the STAFF self-service view; the
  // backend /attendance/payroll/my endpoint is @Roles(STAFF). DIRECTOR/SA land
  // here only by mistake, so bounce them before rendering.
  const { ready, allowed } = useRequireRole(['STAFF']);
  const [month, setMonth] = useState<string>(() => toYYYYMM(new Date()));
  const { data, isLoading } = useMyPayroll(month);
  const token = useAuthStore((s) => s.accessToken);

  if (!ready || !allowed) return null;

  return (
    <div className="space-y-6">
      {/* Header (no subtitle) */}
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold">My Payroll</h1>
        <MonthPicker value={month} onChange={setMonth} />
      </div>

      {/* Export PDF */}
      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const url = `${getMyPayrollPdfUrl(month)}&token=${token}`;
            window.open(url, '_blank');
          }}
        >
          <Download className="mr-1.5 h-3.5 w-3.5" /> Export PDF
        </Button>
      </div>

      {/* Content */}
      {isLoading ? (
        <PageSkeleton />
      ) : !data || !data.days.length ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <CalendarDays className="h-10 w-10" style={{ color: 'var(--kc-text-3)' }} />
          <p className="text-sm font-medium" style={{ color: 'var(--kc-text-2)' }}>
            No payroll data for this month
          </p>
          <p className="text-xs" style={{ color: 'var(--kc-text-3)' }}>
            Try selecting a different month
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* 3 stat cards */}
          <div className="grid gap-3 sm:grid-cols-3">
            <StatCard
              icon={Clock}
              label="Hours This Month"
              value={fmtHours(data.totalRegular + data.totalOvertime)}
              color="var(--kc-p-600)"
            />
            <StatCard
              icon={DollarSign}
              label="Estimated Pay"
              value={fmtCurrency(data.totalPay)}
              color="var(--kc-success)"
            />
            <StatCard
              icon={TrendingUp}
              label="OT Hours"
              value={fmtHours(data.totalOvertime)}
              color={data.totalOvertime > 0 ? 'var(--kc-warning)' : 'var(--kc-text-3)'}
            />
          </div>

          {/* Weekly breakdown (chart + colored week cards) — own month nav */}
          <MyWeeklyBreakdown />

          {/* Per-day detail with the director's approval status */}
          <CardWithHeader icon={CalendarDays} title="Daily Breakdown">
            <DaysTable days={data.days} />
          </CardWithHeader>
        </div>
      )}
    </div>
  );
}
