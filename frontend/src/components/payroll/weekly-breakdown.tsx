'use client';

import { useState } from 'react';
import { BarChart3, CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { CardWithHeader } from '@/components/ui/card-with-header';
import { Skeleton } from '@/components/ui/skeleton';
import type { DayCalc } from '@/lib/api/attendance';

// ── local formatting/date helpers (kept self-contained to avoid coupling) ──

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

function toYYYYMM(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function prevMonth(yyyymm: string): string {
  const [y, m] = yyyymm.split('-').map(Number);
  return toYYYYMM(new Date(y, m - 2, 1));
}

function nextMonth(yyyymm: string): string {
  const [y, m] = yyyymm.split('-').map(Number);
  return toYYYYMM(new Date(y, m, 1));
}

function formatMonthShort(yyyymm: string): string {
  const [y, m] = yyyymm.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

// ── week buckets ──

export interface WeekBucket {
  label: string; // chart x-axis, e.g. "1-7"
  rangeLabel: string; // summary card, e.g. "Jun 1-7"
  weekKey: string;
  month: string; // "YYYY-MM"
  startDay: number;
  endDay: number;
  regularHours: number;
  overtimeHours: number;
  days: DayCalc[];
}

/**
 * Split a month into 4 fixed "weeks" by day-of-month (1-7, 8-14, 15-21,
 * 22-end). ALWAYS returns 4 buckets (empty ones at 0h) so the chart renders 4
 * evenly-spaced bars. Day-of-month chunks, not ISO weeks.
 */
export function buildMonthWeeks(month: string, days: DayCalc[]): WeekBucket[] {
  const [y, m] = month.split('-').map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  const monShort = new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'short' });
  const ranges: Array<[number, number]> = [
    [1, 7],
    [8, 14],
    [15, 21],
    [22, lastDay],
  ];
  const byDate = new Map(days.map((d) => [d.date, d]));

  return ranges.map(([start, end], i) => {
    const bucketDays: DayCalc[] = [];
    let regularHours = 0;
    let overtimeHours = 0;
    for (let dnum = start; dnum <= end; dnum++) {
      const iso = `${month}-${String(dnum).padStart(2, '0')}`;
      const d = byDate.get(iso);
      if (d) {
        bucketDays.push(d);
        regularHours += d.regularHours;
        overtimeHours += d.overtimeHours;
      }
    }
    return {
      weekKey: `${month}-w${i + 1}`,
      label: `${start}-${end}`,
      rangeLabel: `${monShort} ${start}-${end}`,
      month,
      startDay: start,
      endDay: end,
      regularHours,
      overtimeHours,
      days: bucketDays,
    };
  });
}

// Distinct badge color per week (icon + title), per the design.
const WEEK_COLORS = ['text-primary', 'text-green-500', 'text-amber-500', 'text-purple-500'];

/** One week's (day-of-month chunk) summary in a color-coded CardWithHeader. */
function WeekSummaryCard({
  index,
  bucket,
  rate,
  otRate,
}: {
  index: number;
  bucket: WeekBucket;
  rate: number | null;
  otRate: number;
}) {
  const worked = bucket.regularHours + bucket.overtimeHours;
  const pay =
    rate != null && worked > 0
      ? bucket.regularHours * rate + bucket.overtimeHours * rate * otRate
      : null;
  const byDate = new Map(bucket.days.map((d) => [d.date, d]));
  const color = WEEK_COLORS[index % WEEK_COLORS.length];

  const cells: Array<{ iso: string; abbr: string; hours: number; isOT: boolean }> = [];
  for (let dnum = bucket.startDay; dnum <= bucket.endDay; dnum++) {
    const iso = `${bucket.month}-${String(dnum).padStart(2, '0')}`;
    const dt = new Date(iso + 'T12:00:00');
    const dow = dt.getDay();
    if (dow === 0 || dow === 6) continue; // weekdays only
    const d = byDate.get(iso);
    cells.push({
      iso,
      abbr: dt.toLocaleDateString('en-US', { weekday: 'short' }),
      hours: d ? d.regularHours + d.overtimeHours : 0,
      isOT: !!d && d.overtimeHours > 0,
    });
  }

  return (
    <CardWithHeader
      icon={CalendarDays}
      title={`Week ${index + 1} (${bucket.rangeLabel})`}
      iconClassName={color}
      titleClassName={color}
      contentClassName="space-y-2"
    >
      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs">
        <span style={{ color: 'var(--kc-text-2)' }}>
          Regular: <b style={{ color: 'var(--kc-text-1)' }}>{fmtHours(bucket.regularHours)}</b>
        </span>
        <span style={{ color: bucket.overtimeHours > 0 ? 'var(--kc-warning)' : 'var(--kc-text-2)' }}>
          OT: {fmtHours(bucket.overtimeHours)}{bucket.overtimeHours > 0 ? ' ⚡' : ''}
        </span>
        {pay != null && (
          <span style={{ color: 'var(--kc-text-2)' }}>
            Pay: <b style={{ color: 'var(--kc-p-600)' }}>{fmtCurrency(pay)}</b>
          </span>
        )}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px]">
        {cells.map((c) => (
          <span key={c.iso} className="tabular-nums">
            <span style={{ color: 'var(--kc-text-3)' }}>{c.abbr} </span>
            <span style={{ color: c.hours === 0 ? 'var(--kc-text-3)' : c.isOT ? 'var(--kc-warning)' : 'var(--kc-text-1)' }}>
              {c.hours === 0 ? '-' : `${c.hours.toFixed(1)}h${c.isOT ? ' ⚡' : ''}`}
            </span>
          </span>
        ))}
      </div>
    </CardWithHeader>
  );
}

// ── month nav hook (current month + 2 back) ──

export function useMonthNav() {
  const currentMonth = toYYYYMM(new Date());
  const minMonth = prevMonth(prevMonth(currentMonth));
  const [month, setMonth] = useState(currentMonth);
  return {
    month,
    currentMonth,
    canPrev: month > minMonth,
    canNext: month < currentMonth,
    goPrev: () => setMonth(prevMonth(month)),
    goNext: () => setMonth(nextMonth(month)),
  };
}

// ── the card: chart (left) + 4 colored week cards (right) ──

const navBtn =
  'flex h-7 w-7 items-center justify-center rounded-md border transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-40';

/**
 * Shared "Weekly Breakdown" card used by both the Director Individual tab and
 * the STAFF My Payroll page. Pure presentation — the caller owns the month
 * state and data fetching (Director uses usePayrollStaff, STAFF uses
 * useMyPayroll) and passes the resolved days/rate in.
 */
export function WeeklyBreakdownCard({
  month,
  canPrev,
  canNext,
  onPrev,
  onNext,
  isLoading,
  days,
  rate,
  otRate,
  totalRegular,
  totalOvertime,
  totalPay,
}: {
  month: string;
  canPrev: boolean;
  canNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  isLoading: boolean;
  days: DayCalc[];
  rate: number | null;
  otRate: number;
  /** Authoritative month totals from the backend (already "to date" for the
   *  current month, since punches only exist up to today). */
  totalRegular: number;
  totalOvertime: number;
  totalPay: number;
}) {
  const buckets = buildMonthWeeks(month, days);

  const nav = (
    <div className="flex items-center gap-1">
      <button type="button" disabled={!canPrev} onClick={onPrev} className={navBtn} style={{ borderColor: 'var(--kc-border)' }} aria-label="Previous month">
        <ChevronLeft className="h-4 w-4" style={{ color: 'var(--kc-text-3)' }} />
      </button>
      <span className="min-w-[5.5rem] text-center text-sm font-medium" style={{ color: 'var(--kc-text-1)' }}>
        {formatMonthShort(month)}
      </span>
      <button type="button" disabled={!canNext} onClick={onNext} className={navBtn} style={{ borderColor: 'var(--kc-border)' }} aria-label="Next month">
        <ChevronRight className="h-4 w-4" style={{ color: 'var(--kc-text-3)' }} />
      </button>
    </div>
  );

  return (
    <CardWithHeader icon={BarChart3} title="Weekly Breakdown">
      <div className="mb-3 flex justify-end pt-1">{nav}</div>
      {isLoading ? (
        <Skeleton className="h-[220px] w-full rounded" />
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[3fr_2fr] lg:items-center">
          <div className="min-w-0">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={buckets} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--kc-border)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 12, fill: 'var(--kc-text-3)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: 'var(--kc-text-3)' }} axisLine={false} tickLine={false} width={36} tickFormatter={(v) => `${v}h`} />
                <Tooltip
                  contentStyle={{ background: 'var(--kc-surface)', border: '1px solid var(--kc-border)', borderRadius: 'var(--kc-r-2)', fontSize: 13 }}
                  labelStyle={{ color: 'var(--kc-text-1)', fontWeight: 600 }}
                  formatter={(value, name) => [fmtHours(Number(value)), name === 'regularHours' ? 'Regular' : 'Overtime']}
                />
                <Legend formatter={(value) => <span style={{ fontSize: 12, color: 'var(--kc-text-2)' }}>{value === 'regularHours' ? 'Regular' : 'Overtime'}</span>} />
                <Bar dataKey="regularHours" stackId="hours" fill="var(--kc-p-500)" radius={[0, 0, 0, 0]} />
                <Bar dataKey="overtimeHours" stackId="hours" fill="var(--kc-warning)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>

            {/* Month total (authoritative backend totals; for the current month
                these are already "to date" since no future punches exist). */}
            <div className="mt-3 rounded-lg border px-4 py-2" style={{ borderColor: 'var(--kc-border)', background: 'var(--kc-surface-2)' }}>
              <div className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--kc-text-3)' }}>
                Month Total
              </div>
              <div className="mt-0.5 flex flex-wrap items-baseline gap-x-2 text-sm">
                <span className="font-semibold tabular-nums" style={{ color: 'var(--kc-text-1)' }}>
                  {fmtHours(totalRegular + totalOvertime)}
                </span>
                <span style={{ color: 'var(--kc-text-3)' }}>·</span>
                <span className="tabular-nums" style={{ color: totalOvertime > 0 ? 'var(--kc-warning)' : 'var(--kc-text-2)' }}>
                  {fmtHours(totalOvertime)} OT{totalOvertime > 0 ? ' ⚡' : ''}
                </span>
                <span style={{ color: 'var(--kc-text-3)' }}>·</span>
                <span className="font-semibold tabular-nums" style={{ color: 'var(--kc-p-600)' }}>
                  {fmtCurrency(totalPay)}
                </span>
              </div>
            </div>
          </div>
          <div className="space-y-6 pt-4 lg:max-h-[440px] lg:overflow-y-auto lg:px-1">
            {buckets.map((b, i) => (
              <WeekSummaryCard key={b.weekKey} index={i} bucket={b} rate={rate} otRate={otRate} />
            ))}
          </div>
        </div>
      )}
    </CardWithHeader>
  );
}
