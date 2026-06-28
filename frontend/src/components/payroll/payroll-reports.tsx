'use client';

/**
 * PayrollReports — reusable reporting UI (stats + charts + Team + Individual sub-tabs).
 *
 * Owns:
 *   - month state + MonthPicker
 *   - SummaryCards (4 stat cards)
 *   - WeeklyHoursChart + MonthlyCostChart
 *   - FilterTabs (Overview / Team / Individual) — here "Overview" means the
 *     stats+charts section only; period-list and Settings modal stay director-only
 *     on the /reports/payroll page.
 *   - TeamTabContent + IndividualTabContent + AdjustHoursDialog
 *
 * Used by:
 *   - /reports/payroll/page.tsx  — Director view (centerId = undefined → own center)
 *   - /centers/[id]/page.tsx     — SUPER_ADMIN Reports tab (centerId = center.id)
 */

import { type CSSProperties, useState, useRef } from 'react';
import Link from 'next/link';
import { useQueries } from '@tanstack/react-query';
import {
  AlertTriangle,
  BarChart3,
  CalendarDays,
  Plus,
  CheckCheck,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  DollarSign,
  Download,
  FileSpreadsheet,
  FileText,
  History,
  ListChecks,
  Loader2,
  TrendingUp,
  Users,
  XCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { ReadCard } from '@/components/ui/section-frame';
import { StatTile } from '@/components/ui/stat-tile';
import { FilterTabs } from '@/components/ui/filter-tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { DateField } from '@/components/ui/date-field';
import { WeeklyBreakdownCard, useMonthNav } from '@/components/payroll/weekly-breakdown';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  usePayrollSummary,
  usePayrollMonthlyChart,
  usePayrollWeeklyChart,
  usePayrollTeam,
  usePayrollStaff,
  usePayrollSettings,
  useAdjustPayrollHours,
  useStaffAdjustments,
  useApproveAllPayroll,
  usePayrollPeriods,
  useCreatePayrollPeriod,
  useApprovePayrollPeriod,
  usePayrollReport,
  useCenterCorrections,
  useSetPeriodFrequency,
  payrollV2Keys,
} from '@/lib/hooks/use-attendance';
import type { PayrollTeamRow, DayCalc, PayrollAdjustment, PayrollPeriod } from '@/lib/api/attendance';
import { getRangeExportUrl, getPayrollSummary } from '@/lib/api/attendance';
import { useAuthStore } from '@/store/auth';
import { WeeklyApprovalSection } from '@/components/attendance/weekly-approval-section';

// ============================================================ helpers

function toYYYYMM(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function prevMonth(yyyymm: string): string {
  const [y, m] = yyyymm.split('-').map(Number);
  const d = new Date(y, m - 2, 1);
  return toYYYYMM(d);
}

function nextMonth(yyyymm: string): string {
  const [y, m] = yyyymm.split('-').map(Number);
  const d = new Date(y, m, 1);
  return toYYYYMM(d);
}

function formatMonthLabel(yyyymm: string): string {
  const [y, m] = yyyymm.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

/** Short month label, e.g. "Jun 2026" — used by the Current Period month tabs. */
function formatMonthShort(yyyymm: string): string {
  const [y, m] = yyyymm.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
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
    maximumFractionDigits: 0,
  }).format(n);
}

// ============================================================ StatCard

// Thin wrapper over the shared big-number StatTile primitive. Keeps the
// existing call sites (which pass an icon) unchanged; the icon is intentionally
// dropped — the new tile style is icon-less big-number.
function StatCard({
  label,
  value,
  color,
  href,
  className,
}: {
  icon: typeof Users;
  label: string;
  value: string;
  color: string;
  href?: string;
  // Grid-item overrides (e.g. col-span-2 to make a card span a full mobile row).
  className?: string;
}) {
  return (
    <StatTile
      label={label}
      value={value}
      color={color}
      href={href}
      className={className}
    />
  );
}

// ============================================================ MonthPicker

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
      <span
        className="min-w-[9rem] text-center text-sm font-medium"
        style={{ color: 'var(--kc-text-1)' }}
      >
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

// ============================================================ SummaryCards

function SummaryCards({ month, centerId }: { month: string; centerId?: string }) {
  const { data: summary, isLoading } = usePayrollSummary(month, centerId);

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="pt-4">
              <div className="h-16 flex items-center justify-center">
                <span className="text-sm" style={{ color: 'var(--kc-text-3)' }}>
                  No data
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      <StatCard
        icon={Clock}
        label="Regular Hours"
        value={fmtHours(summary.totalRegularHours)}
        color="var(--kc-p-600)"
      />
      <StatCard
        icon={AlertTriangle}
        label="Overtime Hours"
        value={fmtHours(summary.totalOvertimeHours)}
        color="var(--kc-warning)"
      />
      <StatCard
        icon={DollarSign}
        label="Total Cost"
        value={fmtCurrency(summary.totalCost)}
        color="var(--kc-success)"
      />
      <StatCard
        icon={Users}
        label="Active Staff"
        value={String(summary.activeStaff)}
        color="var(--kc-p-600)"
      />
    </div>
  );
}

// ============================================================ WeeklyHoursChart

function WeeklyHoursChart({ month, centerId }: { month: string; centerId?: string }) {
  const { data, isLoading } = usePayrollWeeklyChart(month, centerId);

  const formatted = (data ?? []).map((pt) => ({
    ...pt,
    label: pt.weekStart.slice(5), // "MM-DD"
  }));

  return (
    <ReadCard icon={BarChart3} title="Weekly Hours">
      {isLoading ? (
        <div className="space-y-2 pt-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-6 w-full rounded" />
          ))}
          <Skeleton className="h-48 w-full rounded" />
        </div>
      ) : !formatted.length ? (
        <div className="flex h-[260px] items-center justify-center">
          <p className="text-sm" style={{ color: 'var(--kc-text-3)' }}>
            No weekly data for this month
          </p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={formatted} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--kc-border)" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 12, fill: 'var(--kc-text-3)' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 12, fill: 'var(--kc-text-3)' }}
              axisLine={false}
              tickLine={false}
              width={36}
              tickFormatter={(v) => `${v}h`}
            />
            <Tooltip
              contentStyle={{
                background: 'var(--kc-surface)',
                border: '1px solid var(--kc-border)',
                borderRadius: 'var(--kc-r-2)',
                fontSize: 13,
              }}
              labelStyle={{ color: 'var(--kc-text-1)', fontWeight: 600 }}
              formatter={(value, name) => [
                fmtHours(Number(value)),
                name === 'regularHours' ? 'Regular' : 'Overtime',
              ]}
            />
            <Legend
              formatter={(value) => (
                <span style={{ fontSize: 12, color: 'var(--kc-text-2)' }}>
                  {value === 'regularHours' ? 'Regular' : 'Overtime'}
                </span>
              )}
            />
            <Bar dataKey="regularHours" stackId="hours" fill="var(--kc-p-500)" radius={[0, 0, 0, 0]} />
            <Bar
              dataKey="overtimeHours"
              stackId="hours"
              fill="var(--kc-warning)"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      )}
    </ReadCard>
  );
}

// ============================================================ MonthlyCostChart

function MonthlyCostChart({ centerId }: { centerId?: string }) {
  const { data, isLoading } = usePayrollMonthlyChart(3, centerId);

  const formatted = (data ?? []).map((pt) => ({
    ...pt,
    label: pt.month.slice(0, 7),
    displayLabel: new Date(pt.month + '-01').toLocaleDateString('en-US', {
      month: 'short',
      year: '2-digit',
    }),
  }));

  return (
    <ReadCard icon={TrendingUp} title="Cost Trend (3 months)">
      {isLoading ? (
        <div className="space-y-2 pt-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-6 w-full rounded" />
          ))}
          <Skeleton className="h-48 w-full rounded" />
        </div>
      ) : !formatted.length ? (
        <div className="flex h-[260px] items-center justify-center">
          <p className="text-sm" style={{ color: 'var(--kc-text-3)' }}>
            No trend data available
          </p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={formatted} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--kc-border)" vertical={false} />
            <XAxis
              dataKey="displayLabel"
              tick={{ fontSize: 12, fill: 'var(--kc-text-3)' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 12, fill: 'var(--kc-text-3)' }}
              axisLine={false}
              tickLine={false}
              width={56}
              tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
            />
            <Tooltip
              contentStyle={{
                background: 'var(--kc-surface)',
                border: '1px solid var(--kc-border)',
                borderRadius: 'var(--kc-r-2)',
                fontSize: 13,
              }}
              labelStyle={{ color: 'var(--kc-text-1)', fontWeight: 600 }}
              formatter={(value) => [fmtCurrency(Number(value)), 'Total Cost']}
            />
            <Line
              type="monotone"
              dataKey="totalCost"
              stroke="var(--kc-p-600)"
              strokeWidth={2.5}
              dot={{ fill: 'var(--kc-p-600)', r: 4, strokeWidth: 0 }}
              activeDot={{ r: 6, fill: 'var(--kc-p-500)', strokeWidth: 0 }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </ReadCard>
  );
}

// ============================================================ RangeExportDropdown (custom range)

function RangeExportDropdown({
  from,
  to,
  centerId,
  disabled,
}: {
  from: string;
  to: string;
  centerId?: string;
  disabled?: boolean;
}) {
  const token = useAuthStore((s) => s.accessToken);
  const download = (format: 'xlsx' | 'pdf') => {
    window.open(`${getRangeExportUrl(from, to, format, centerId)}&token=${token}`, '_blank');
  };
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button disabled={disabled}>
          <Download className="mr-2 h-4 w-4" /> Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onClick={() => download('xlsx')}>
          <FileSpreadsheet className="mr-2 h-4 w-4" /> Excel (.xlsx)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => download('pdf')}>
          <FileText className="mr-2 h-4 w-4" /> PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ============================================================ RangeExportSection

function RangeExportSection({ centerId }: { centerId?: string }) {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [rangeError, setRangeError] = useState('');

  const validate = (f: string, t: string) => {
    if (f && t && f > t) {
      setRangeError('"From" must be on or before "To"');
      return false;
    }
    setRangeError('');
    return true;
  };

  const handleFrom = (v: string) => {
    setFrom(v);
    validate(v, to);
  };

  const handleTo = (v: string) => {
    setTo(v);
    validate(from, v);
  };

  const canExport = !!from && !!to && !rangeError;

  return (
    <ReadCard icon={Download} title="Custom Range Export">
      <div className="flex flex-wrap items-center gap-3">
        <DateField
          aria-label="From date"
          value={from}
          onChange={(e) => handleFrom(e.target.value)}
          className="w-40"
        />
        <DateField
          aria-label="To date"
          value={to}
          onChange={(e) => handleTo(e.target.value)}
          className="w-40"
        />
        <RangeExportDropdown from={from} to={to} centerId={centerId} disabled={!canExport} />
      </div>
      {rangeError && (
        <p className="mt-2 text-xs" style={{ color: 'var(--kc-error)' }}>{rangeError}</p>
      )}
    </ReadCard>
  );
}

// ============================================================ CurrentPeriodSection (Director Overview)

/** Status of a calendar month derived from its payroll periods. */
type MonthStatus = 'OPEN' | 'APPROVED' | 'NONE';

function monthStatusBadge(status: MonthStatus): { label: string; style: CSSProperties } {
  switch (status) {
    case 'OPEN':
      return { label: 'OPEN', style: { background: 'var(--kc-warning-bg)', color: 'var(--kc-warning)' } };
    case 'APPROVED':
      return {
        label: 'Approved',
        style: { background: 'color-mix(in oklch, var(--kc-success), transparent 80%)', color: 'var(--kc-success)' },
      };
    default:
      return { label: 'No Period', style: { background: 'var(--kc-surface-2)', color: 'var(--kc-text-3)' } };
  }
}

function DirectorCurrentPeriodSection({
  centerId,
  onApprove,
}: {
  centerId?: string;
  onApprove: (period: PayrollPeriod) => void;
}) {
  const { data: periods, isLoading: periodsLoading } = usePayrollPeriods();
  const { data: corrections } = useCenterCorrections();
  const setFrequency = useSetPeriodFrequency(centerId);
  const createPeriod = useCreatePayrollPeriod();

  // Month-nav override (null → fall back to the current calendar month)
  const [monthOverride, setMonthOverride] = useState<string | null>(null);
  // Create-period dialog (shown when the selected month has no period)
  const [showCreate, setShowCreate] = useState(false);
  const [newStart, setNewStart] = useState('');
  const [newEnd, setNewEnd] = useState('');
  // Frequency filter for APPROVED months (in OPEN months the selector mutates instead)
  const [freqFilter, setFreqFilter] = useState<'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | null>(null);

  // 3 navigable months: current + 2 previous (e.g. Apr / May / Jun 2026)
  const currentMonth = toYYYYMM(new Date());
  const prev1 = prevMonth(currentMonth);
  const prev2 = prevMonth(prev1);
  const months = [prev2, prev1, currentMonth];

  // Status of each month, from its periods (grouped by startDate's YYYY-MM)
  const statusOf = (m: string): MonthStatus => {
    const ps = (periods ?? []).filter((p) => p.startDate.slice(0, 7) === m);
    if (ps.some((p) => p.status === 'OPEN')) return 'OPEN';
    return ps.length ? 'APPROVED' : 'NONE';
  };

  // Default to the CURRENT calendar month, regardless of whether it has an OPEN
  // period — the user can click a previous month tab to view it.
  const selectedMonth = monthOverride ?? currentMonth;

  // The month's periods. OPEN month → show the open period (the frequency
  // selector MUTATES it). APPROVED month → the selector is a FILTER: show the
  // most recent period matching the chosen frequency.
  const monthPeriods = (periods ?? []).filter((p) => p.startDate.slice(0, 7) === selectedMonth);
  const openInMonth = monthPeriods.find((p) => p.status === 'OPEN');
  const isOpenMonth = !!openInMonth;
  const hasAnyPeriod = monthPeriods.length > 0;
  const effectiveFreq = freqFilter ?? 'WEEKLY';
  const selectedPeriod = isOpenMonth
    ? openInMonth!
    : ([...monthPeriods]
        .filter((p) => p.frequency === effectiveFreq)
        .sort((a, b) => b.startDate.localeCompare(a.startDate))[0] ?? null);
  const isOpen = selectedPeriod?.status === 'OPEN';

  const pendingCorrections = corrections?.filter((c) => c.status === 'PENDING').length ?? 0;

  const { data: report, isLoading: reportLoading } = usePayrollReport(selectedPeriod?.id ?? '');

  const totalStaff = report?.staff.length ?? 0;
  const totalHours = report ? report.totals.regularHours + report.totals.overtimeHours : 0;
  const totalPay = report?.totals.totalPay ?? 0;
  const otHours = report?.totals.overtimeHours ?? 0;

  // "View Full Report" → the whole month: full month for past months,
  // month-to-date for the current (open) month.
  const isCurrentMonthSel = selectedMonth === currentMonth;
  const now = new Date();
  const todayIso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const rangeFrom = `${selectedMonth}-01`;
  const rangeTo = isCurrentMonthSel ? todayIso : lastDayOfMonth(selectedMonth);
  const rangeTone = isCurrentMonthSel && isOpenMonth ? 'open' : 'approved';
  const mdFmt = (iso: string) =>
    new Date(iso + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const rangeLabel = isCurrentMonthSel
    ? `${mdFmt(rangeFrom)} - ${mdFmt(rangeTo)}, ${selectedMonth.slice(0, 4)} (to date)`
    : `${formatMonthLabel(selectedMonth)} (full month)`;
  const reportHref =
    `/reports/payroll/range?from=${rangeFrom}&to=${rangeTo}` +
    `&label=${encodeURIComponent(rangeLabel)}&tone=${rangeTone}` +
    (centerId ? `&centerId=${centerId}` : '');

  const handleFrequencyChange = async (freq: 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY') => {
    try {
      await setFrequency.mutateAsync(freq);
      toast.success('Period frequency updated');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update frequency');
    }
  };

  const openCreateDialog = () => {
    setNewStart(`${selectedMonth}-01`);
    setNewEnd(lastDayOfMonth(selectedMonth));
    setShowCreate(true);
  };

  const handleCreatePeriod = async () => {
    if (!newStart || !newEnd) {
      toast.error('Select both dates');
      return;
    }
    try {
      await createPeriod.mutateAsync({ startDate: newStart, endDate: newEnd });
      toast.success('Period created');
      setShowCreate(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create period');
    }
  };

  const selectCls = 'h-9 rounded-md border px-3 text-sm';
  const selectStyle = {
    borderColor: 'var(--kc-border)',
    background: 'var(--kc-bg)',
    color: 'var(--kc-text-1)',
  };

  if (periodsLoading) {
    return <Skeleton className="h-48 w-full rounded-lg" />;
  }

  return (
    <>
    <ReadCard icon={CalendarDays} title="Current Period">
      <div className="space-y-4">
      {/* Month navigation: current + 2 previous months */}
      <div className="flex gap-1 border-b" style={{ borderColor: 'var(--kc-border)' }}>
        {months.map((m) => {
          const active = m === selectedMonth;
          const badge = monthStatusBadge(statusOf(m));
          return (
            <button
              key={m}
              type="button"
              onClick={() => {
                setMonthOverride(m);
                setFreqFilter(null);
              }}
              aria-current={active ? 'true' : undefined}
              className="flex flex-col items-center gap-1 px-3 py-2 -mb-px border-b-2 transition-colors"
              style={
                active
                  ? { borderColor: 'var(--kc-p-600)', color: 'var(--kc-text-1)' }
                  : { borderColor: 'transparent', color: 'var(--kc-text-3)' }
              }
            >
              <span className="text-sm font-medium">{formatMonthShort(m)}</span>
              <Badge className="px-1.5 py-0 text-[10px]" style={badge.style}>
                {badge.label}
              </Badge>
            </button>
          );
        })}
      </div>

      {!hasAnyPeriod ? (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <p className="text-sm" style={{ color: 'var(--kc-text-3)' }}>
            No pay period for {formatMonthLabel(selectedMonth)}.
          </p>
          <Button onClick={openCreateDialog}>
            <Plus className="mr-2 h-4 w-4" /> Create Period
          </Button>
        </div>
      ) : (
        <>
          {/* Frequency selector — ALWAYS visible. OPEN month: changes the
              period's frequency. APPROVED month: filters which period shows. */}
          <div className="flex items-center gap-3">
            <label className="shrink-0 text-sm font-medium" style={{ color: 'var(--kc-text-2)' }}>
              Frequency
            </label>
            {isOpenMonth ? (
              <select
                key={selectedPeriod!.id}
                defaultValue={selectedPeriod!.frequency}
                onChange={(e) => handleFrequencyChange(e.target.value as 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY')}
                className={selectCls}
                style={selectStyle}
                disabled={setFrequency.isPending}
              >
                <option value="WEEKLY">Weekly</option>
                <option value="BIWEEKLY">Biweekly</option>
                <option value="MONTHLY">Monthly</option>
              </select>
            ) : (
              <select
                value={effectiveFreq}
                onChange={(e) => setFreqFilter(e.target.value as 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY')}
                className={selectCls}
                style={selectStyle}
              >
                <option value="WEEKLY">Weekly</option>
                <option value="BIWEEKLY">Biweekly</option>
                <option value="MONTHLY">Monthly</option>
              </select>
            )}
            {setFrequency.isPending && <Loader2 className="h-4 w-4 animate-spin" style={{ color: 'var(--kc-text-3)' }} />}
          </div>

          {selectedPeriod ? (
            <>
              <p className="text-sm" style={{ color: 'var(--kc-text-2)' }}>
                {selectedPeriod.startDate.split('T')[0]} — {selectedPeriod.endDate.split('T')[0]}
              </p>
              {reportLoading ? (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-20 w-full rounded-lg" />
                  ))}
                </div>
              ) : (
                // Mobile layout (grid-cols-2): row1 [Total Staff][Total Hours],
                // row2 [Total Pay full-width], row3 [OT Hours][Pending]. Total
                // Pay spans 2 cols on phones, resets to 1 from sm: up.
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                  <StatCard icon={Users} label="Total Staff" value={String(totalStaff)} color="var(--kc-p-600)" />
                  <StatCard icon={Clock} label="Total Hours" value={fmtHours(totalHours)} color="var(--kc-p-600)" />
                  <StatCard icon={DollarSign} label="Total Pay" value={`$${totalPay.toFixed(2)}`} color="var(--kc-p-600)" className="col-span-2 sm:col-span-1" />
                  <StatCard icon={Clock} label="OT Hours" value={fmtHours(otHours)} color="var(--kc-warning)" />
                  <StatCard
                    icon={AlertTriangle}
                    label="Pending Corrections"
                    value={String(pendingCorrections)}
                    color={pendingCorrections > 0 ? 'var(--kc-error)' : 'var(--kc-text-3)'}
                    href="/attendance/corrections"
                  />
                </div>
              )}
            </>
          ) : (
            <p className="py-4 text-center text-sm" style={{ color: 'var(--kc-text-3)' }}>
              No {effectiveFreq.toLowerCase()} period in {formatMonthLabel(selectedMonth)}.
            </p>
          )}

          <div className="flex gap-3">
            <Button asChild>
              <Link href={reportHref}>View Full Report</Link>
            </Button>
            {isOpen && selectedPeriod && (
              <Button variant="outline" onClick={() => onApprove(selectedPeriod)}>
                <CheckCircle className="mr-2 h-4 w-4" /> Approve Period
              </Button>
            )}
          </div>
        </>
      )}
      </div>
    </ReadCard>

      {/* Create Period dialog — opened from the empty-month state */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Pay Period</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div>
              <label className="text-sm font-medium" style={{ color: 'var(--kc-text-1)' }}>Start Date</label>
              <DateField value={newStart} onChange={(e) => setNewStart(e.target.value)} className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium" style={{ color: 'var(--kc-text-1)' }}>End Date</label>
              <DateField value={newEnd} onChange={(e) => setNewEnd(e.target.value)} className="mt-1" />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={handleCreatePeriod} disabled={createPeriod.isPending}>
              {createPeriod.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Period
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ============================================================ PreviousPeriodsSection (Director Overview)

/** Last day of a given month, returned as YYYY-MM-DD */
function lastDayOfMonth(yyyymm: string): string {
  const [y, m] = yyyymm.split('-').map(Number);
  return new Date(y, m, 0).toISOString().slice(0, 10);
}

function PreviousPeriodsSection({ centerId }: { centerId?: string }) {
  const token = useAuthStore((s) => s.accessToken);
  const { data: periods, isLoading } = usePayrollPeriods();
  const [page, setPage] = useState(0);

  // Only previous (non-OPEN) periods, grouped by YYYY-MM of startDate, deduped, desc
  const monthKeys: string[] = [];
  if (periods) {
    const seen = new Set<string>();
    const prev = periods.filter((p) => p.status !== 'OPEN');
    // Sort desc by startDate
    const sorted = [...prev].sort((a, b) => b.startDate.localeCompare(a.startDate));
    for (const p of sorted) {
      const mk = p.startDate.slice(0, 7); // YYYY-MM
      if (!seen.has(mk)) {
        seen.add(mk);
        monthKeys.push(mk);
      }
    }
  }

  // Paginate: 5 months per page (most recent first)
  const PER_PAGE = 5;
  const totalPages = Math.max(1, Math.ceil(monthKeys.length / PER_PAGE));
  const safePage = Math.min(page, totalPages - 1);
  const pagedKeys = monthKeys.slice(safePage * PER_PAGE, safePage * PER_PAGE + PER_PAGE);

  // Fan-out: one getPayrollSummary call per VISIBLE month (current page only)
  const summaryQueries = useQueries({
    queries: pagedKeys.map((mk) => ({
      queryKey: payrollV2Keys.summary(mk, centerId),
      queryFn: () => getPayrollSummary(mk, centerId),
    })),
  });

  const downloadRange = (mk: string, format: 'xlsx' | 'pdf') => {
    const from = `${mk}-01`;
    const to = lastDayOfMonth(mk);
    window.open(`${getRangeExportUrl(from, to, format, centerId)}&token=${token}`, '_blank');
  };

  return (
    <ReadCard icon={History} title="Previous Periods">
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded" />
          ))}
        </div>
      ) : !monthKeys.length ? (
        <p className="text-sm text-center py-4" style={{ color: 'var(--kc-text-3)' }}>
          No previous periods
        </p>
      ) : (
        <div className="space-y-2">
          {pagedKeys.map((mk, idx) => {
            const summary = summaryQueries[idx]?.data;
            const summaryLoading = summaryQueries[idx]?.isLoading;

            // Aggregate status for all periods in this month
            const periodsInMonth = (periods ?? []).filter(
              (p) => p.status !== 'OPEN' && p.startDate.slice(0, 7) === mk,
            );
            const allApproved = periodsInMonth.every((p) => p.status === 'APPROVED' || p.status === 'EXPORTED');
            const hasOpen = periodsInMonth.some((p) => p.status === 'OPEN');
            const statusLabel = allApproved ? 'Approved' : hasOpen ? 'Open' : periodsInMonth[0]?.status ?? '';
            const badgeStyle = allApproved
              ? { background: 'color-mix(in oklch, var(--kc-success), transparent 80%)', color: 'var(--kc-success)' }
              : { background: 'var(--kc-warning-bg)', color: 'var(--kc-warning)' };

            const [y, m] = mk.split('-').map(Number);
            const monthLabel = new Date(y, m - 1, 1).toLocaleDateString('en-US', {
              month: 'long',
              year: 'numeric',
            });

            return (
              <div
                key={mk}
                className="flex items-center justify-between py-2 px-3 rounded-lg gap-3 flex-wrap"
                style={{ background: 'var(--kc-surface-2)' }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-sm font-medium" style={{ color: 'var(--kc-text-1)' }}>
                    {monthLabel}
                  </span>
                  <Badge style={badgeStyle}>{statusLabel}</Badge>
                  {summaryLoading ? (
                    <Skeleton className="h-4 w-20 rounded" />
                  ) : summary ? (
                    <span className="text-xs tabular-nums" style={{ color: 'var(--kc-text-3)' }}>
                      {fmtCurrency(summary.totalCost)} · {summary.activeStaff} staff
                    </span>
                  ) : null}
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Download className="mr-1.5 h-3.5 w-3.5" /> Export
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => downloadRange(mk, 'xlsx')}>
                      <FileSpreadsheet className="mr-2 h-4 w-4" /> Excel (.xlsx)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => downloadRange(mk, 'pdf')}>
                      <FileText className="mr-2 h-4 w-4" /> PDF
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            );
          })}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-3">
              <Button variant="outline" size="sm" disabled={safePage === 0} onClick={() => setPage(safePage - 1)}>
                <ChevronLeft className="mr-1 h-3.5 w-3.5" /> Prev
              </Button>
              <span className="text-xs tabular-nums" style={{ color: 'var(--kc-text-3)' }}>
                Page {safePage + 1} of {totalPages}
              </span>
              <Button variant="outline" size="sm" disabled={safePage >= totalPages - 1} onClick={() => setPage(safePage + 1)}>
                Next <ChevronRight className="ml-1 h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>
      )}
    </ReadCard>
  );
}

// ============================================================ TeamTabContent

type ApprovalState = 'APPROVED' | 'REJECTED' | 'PENDING' | 'n/a';

function approvalBadgeStyle(state: string): CSSProperties {
  switch (state as ApprovalState) {
    case 'APPROVED':
      return {
        background: 'color-mix(in oklch, var(--kc-success), transparent 80%)',
        color: 'var(--kc-success)',
      };
    case 'REJECTED':
      return {
        background: 'color-mix(in oklch, var(--kc-error), transparent 80%)',
        color: 'var(--kc-error)',
      };
    case 'PENDING':
      return { background: 'var(--kc-warning-bg)', color: 'var(--kc-warning)' };
    default:
      return { background: 'var(--kc-surface-2)', color: 'var(--kc-text-3)' };
  }
}

// Compact state icon for the MOBILE Team Payroll "State" column (desktop keeps
// the text badges). Corrections-pending takes priority (most actionable), then
// the approval state. Colors mirror the desktop badge tokens.
function ApprovalStateIcon({
  state,
  correctionsPending,
}: {
  state: string;
  correctionsPending: boolean;
}) {
  let Icon = Clock;
  let color = 'var(--kc-text-3)';
  let label = state || '—';
  if (correctionsPending) {
    Icon = AlertTriangle;
    color = 'var(--kc-warning)';
    label = 'Corrections pending';
  } else if (state === 'APPROVED') {
    Icon = CheckCircle;
    color = 'var(--kc-success)';
    label = 'Approved';
  } else if (state === 'REJECTED') {
    Icon = XCircle;
    color = 'var(--kc-error)';
    label = 'Rejected';
  } else if (state === 'PENDING') {
    Icon = Clock;
    color = 'var(--kc-warning)';
    label = 'Pending';
  }
  return (
    <span role="img" aria-label={label} title={label} className="inline-flex">
      <Icon className="h-4 w-4" style={{ color }} aria-hidden />
    </span>
  );
}

interface TeamTabContentProps {
  month: string;
  centerId?: string;
}

function TeamTabContent({ month, centerId }: TeamTabContentProps) {
  const { data: rows, isLoading } = usePayrollTeam(month, centerId);
  const approveAll = useApproveAllPayroll(centerId);
  const [showApproveAllConfirm, setShowApproveAllConfirm] = useState(false);
  const pendingCount =
    rows?.filter((r) => r.approvalState === 'PENDING').length ?? 0;

  const handleApproveAll = async () => {
    try {
      const result = await approveAll.mutateAsync(month);
      const msg =
        result.skipped > 0
          ? `${result.approved} day(s) approved, ${result.skipped} skipped`
          : `${result.approved} day(s) approved`;
      toast.success(msg);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to approve');
    }
  };

  // Footer totals
  const totals =
    rows && rows.length > 0
      ? rows.reduce(
          (acc, r) => ({
            scheduledHours: acc.scheduledHours + r.scheduledHours,
            workedHours: acc.workedHours + r.regularHours + r.overtimeHours,
            overtimeHours: acc.overtimeHours + r.overtimeHours,
            totalPay: acc.totalPay + r.totalPay,
          }),
          { scheduledHours: 0, workedHours: 0, overtimeHours: 0, totalPay: 0 },
        )
      : null;

  return (
    <div className="space-y-6">
      <ReadCard icon={Users} title="Team Payroll">
        {isLoading ? (
          <div className="space-y-2 pt-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full rounded" />
            ))}
          </div>
        ) : !rows?.length ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-sm" style={{ color: 'var(--kc-text-3)' }}>
              No staff payroll for this month
            </p>
          </div>
        ) : (
          <div
            className="rounded-lg border overflow-x-auto [&_th:first-child]:pl-4 [&_th:last-child]:pr-4 [&_td:first-child]:pl-4 [&_td:last-child]:pr-4"
            style={{ background: 'var(--kc-surface)', borderColor: 'var(--kc-border)' }}
          >
            <Table>
              <TableHeader>
                <TableRow>
                  {/* Sticky first column (Staff) — solid bg so the scrolling
                      columns slide UNDER it, not over the name. */}
                  <TableHead className="sticky left-0 top-0 z-20" style={{ background: 'var(--kc-surface)' }}>
                    Staff
                  </TableHead>
                  {/* Mobile: merged Scheduled/Worked column. */}
                  <TableHead className="text-right sm:hidden">Sch / Work</TableHead>
                  <TableHead className="hidden text-right sm:table-cell">Scheduled</TableHead>
                  <TableHead className="hidden text-right sm:table-cell">Worked</TableHead>
                  <TableHead className="text-right">OT</TableHead>
                  <TableHead className="text-right">Pay</TableHead>
                  {/* Mobile: compact "State" icon column; desktop: "Approval" badges. */}
                  <TableHead className="text-center sm:hidden">State</TableHead>
                  <TableHead className="hidden sm:table-cell">Approval</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(rows as PayrollTeamRow[]).map((r) => (
                  <TableRow key={r.staffId}>
                    <TableCell
                      className="sticky left-0 z-10 font-medium"
                      style={{ color: 'var(--kc-text-1)', background: 'var(--kc-surface)' }}
                    >
                      {r.firstName} {r.lastName}
                    </TableCell>
                    {/* Mobile: merged "scheduled / worked"; separate columns from sm: up. */}
                    <TableCell
                      className="text-right tabular-nums sm:hidden"
                      style={{ color: 'var(--kc-text-2)' }}
                    >
                      {fmtHours(r.scheduledHours)} / {fmtHours(r.regularHours + r.overtimeHours)}
                    </TableCell>
                    <TableCell
                      className="hidden text-right tabular-nums sm:table-cell"
                      style={{ color: 'var(--kc-text-3)' }}
                    >
                      {fmtHours(r.scheduledHours)}
                    </TableCell>
                    <TableCell
                      className="hidden text-right tabular-nums sm:table-cell"
                      style={{ color: 'var(--kc-text-2)' }}
                    >
                      {fmtHours(r.regularHours + r.overtimeHours)}
                    </TableCell>
                    <TableCell
                      className="text-right tabular-nums"
                      style={{
                        color:
                          r.overtimeHours > 0 ? 'var(--kc-warning)' : 'var(--kc-text-3)',
                      }}
                    >
                      {fmtHours(r.overtimeHours)}
                    </TableCell>
                    <TableCell
                      className="text-right tabular-nums font-semibold"
                      style={{ color: 'var(--kc-p-600)' }}
                    >
                      {fmtCurrency(r.totalPay)}
                    </TableCell>
                    {/* Mobile: compact state icon. */}
                    <TableCell className="text-center sm:hidden">
                      <ApprovalStateIcon
                        state={r.approvalState}
                        correctionsPending={r.correctionsPending}
                      />
                    </TableCell>
                    {/* Desktop / tablet: text badges (original). */}
                    <TableCell className="hidden sm:table-cell">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge style={approvalBadgeStyle(r.approvalState)}>
                          {r.approvalState}
                        </Badge>
                        {r.correctionsPending && (
                          <Badge
                            style={{
                              background: 'var(--kc-warning-bg)',
                              color: 'var(--kc-warning)',
                              fontSize: '0.7rem',
                            }}
                          >
                            ⚠ Corrections pending
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              {/* Footer totals */}
              {totals && (
                <tfoot>
                  <TableRow
                    className="font-semibold border-t-2"
                    style={{
                      borderColor: 'var(--kc-border)',
                      background: 'var(--kc-surface-2)',
                    }}
                  >
                    <TableCell
                      className="sticky left-0 z-10"
                      style={{ color: 'var(--kc-text-2)', background: 'var(--kc-surface-2)' }}
                    >
                      Totals
                    </TableCell>
                    {/* Mobile: merged scheduled / worked total. */}
                    <TableCell
                      className="text-right tabular-nums sm:hidden"
                      style={{ color: 'var(--kc-text-2)' }}
                    >
                      {fmtHours(totals.scheduledHours)} / {fmtHours(totals.workedHours)}
                    </TableCell>
                    <TableCell
                      className="hidden text-right tabular-nums sm:table-cell"
                      style={{ color: 'var(--kc-text-2)' }}
                    >
                      {fmtHours(totals.scheduledHours)}
                    </TableCell>
                    <TableCell
                      className="hidden text-right tabular-nums sm:table-cell"
                      style={{ color: 'var(--kc-text-2)' }}
                    >
                      {fmtHours(totals.workedHours)}
                    </TableCell>
                    <TableCell
                      className="text-right tabular-nums"
                      style={{ color: 'var(--kc-warning)' }}
                    >
                      {fmtHours(totals.overtimeHours)}
                    </TableCell>
                    <TableCell
                      className="text-right tabular-nums"
                      style={{ color: 'var(--kc-p-600)' }}
                    >
                      {fmtCurrency(totals.totalPay)}
                    </TableCell>
                    {/* Approval column (no total). */}
                    <TableCell />
                  </TableRow>
                </tfoot>
              )}
            </Table>
          </div>
        )}
      </ReadCard>

      {/* Approve All Pending — right-aligned row below the table */}
      {rows && rows.length > 0 && (
        <div className="flex justify-end">
          <Button
            variant="outline"
            onClick={() => setShowApproveAllConfirm(true)}
            disabled={approveAll.isPending}
            style={{ borderColor: 'var(--kc-border)', color: 'var(--kc-text-2)' }}
          >
            {approveAll.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <CheckCheck className="mr-2 h-4 w-4" />
            )}
            Approve All Pending
          </Button>
        </div>
      )}

      {/* Confirmation before the bulk approve — all views (same AlertDialog
          pattern as Change Director / Approve Period). */}
      <AlertDialog open={showApproveAllConfirm} onOpenChange={setShowApproveAllConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve All Pending</AlertDialogTitle>
            <AlertDialogDescription>
              You are about to approve all pending hours for the team
              {pendingCount > 0 ? ` (${pendingCount} pending staff)` : ''}. This
              will mark all pending staff as approved for this period.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleApproveAll}>
              Approve All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <WeeklyApprovalSection centerId={centerId} />
    </div>
  );
}

// ============================================================ AdjustHoursDialog

function timeToISO(date: string, timeValue: string): string {
  return `${date}T${timeValue}:00`;
}

function isoToTimeValue(iso: string | null): string {
  if (!iso) return '';
  const match = iso.match(/T(\d{2}:\d{2})/);
  return match ? match[1] : '';
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

interface AdjustHoursDialogProps {
  open: boolean;
  onClose: () => void;
  day: DayCalc;
  staffId: string;
  centerId?: string;
}

function AdjustHoursDialog({ open, onClose, day, staffId, centerId }: AdjustHoursDialogProps) {
  const adjust = useAdjustPayrollHours(centerId);

  const [clockIn, setClockIn] = useState(isoToTimeValue(day.clockIn));
  const [clockOut, setClockOut] = useState(isoToTimeValue(day.clockOut));
  const [breakIn, setBreakIn] = useState(isoToTimeValue(day.breakIn));
  const [breakOut, setBreakOut] = useState(isoToTimeValue(day.breakOut));
  const [reason, setReason] = useState('');

  const prevDayRef = useRef<string | null>(null);
  if (open && prevDayRef.current !== day.date) {
    prevDayRef.current = day.date;
    setClockIn(isoToTimeValue(day.clockIn));
    setClockOut(isoToTimeValue(day.clockOut));
    setBreakIn(isoToTimeValue(day.breakIn));
    setBreakOut(isoToTimeValue(day.breakOut));
    setReason('');
  }

  const isReasonValid = reason.trim().length >= 5;
  const canConfirm = isReasonValid && !adjust.isPending;

  const handleConfirm = async () => {
    if (!canConfirm) return;
    try {
      await adjust.mutateAsync({
        staffId,
        date: day.date,
        ...(clockIn ? { adjustedClockIn: timeToISO(day.date, clockIn) } : {}),
        ...(clockOut ? { adjustedClockOut: timeToISO(day.date, clockOut) } : {}),
        ...(breakIn ? { adjustedBreakIn: timeToISO(day.date, breakIn) } : {}),
        ...(breakOut ? { adjustedBreakOut: timeToISO(day.date, breakOut) } : {}),
        reason: reason.trim(),
      });
      toast.success('Hours updated');
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update hours');
    }
  };

  const inputCls = 'mt-1 w-full h-9 rounded-md border px-3 text-sm';
  const inputStyle = {
    borderColor: 'var(--kc-border)',
    background: 'var(--kc-bg)',
    color: 'var(--kc-text-1)',
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" style={{ color: 'var(--kc-p-600)' }} />
            Edit Hours —{' '}
            {new Date(day.date + 'T12:00:00').toLocaleDateString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
            })}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium" style={{ color: 'var(--kc-text-1)' }}>
                Clock In
              </label>
              <input
                type="time"
                value={clockIn}
                onChange={(e) => setClockIn(e.target.value)}
                className={inputCls}
                style={inputStyle}
              />
            </div>
            <div>
              <label className="text-sm font-medium" style={{ color: 'var(--kc-text-1)' }}>
                Clock Out
              </label>
              <input
                type="time"
                value={clockOut}
                onChange={(e) => setClockOut(e.target.value)}
                className={inputCls}
                style={inputStyle}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium" style={{ color: 'var(--kc-text-1)' }}>
                Break In
              </label>
              <input
                type="time"
                value={breakIn}
                onChange={(e) => setBreakIn(e.target.value)}
                className={inputCls}
                style={inputStyle}
              />
            </div>
            <div>
              <label className="text-sm font-medium" style={{ color: 'var(--kc-text-1)' }}>
                Break Out
              </label>
              <input
                type="time"
                value={breakOut}
                onChange={(e) => setBreakOut(e.target.value)}
                className={inputCls}
                style={inputStyle}
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium" style={{ color: 'var(--kc-text-1)' }}>
              Reason <span style={{ color: 'var(--kc-error)' }}>*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="Explain why hours are being adjusted (min. 5 characters)"
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm resize-none"
              style={{
                borderColor: 'var(--kc-border)',
                background: 'var(--kc-bg)',
                color: 'var(--kc-text-1)',
              }}
            />
            {reason.length > 0 && !isReasonValid && (
              <p className="mt-1 text-xs" style={{ color: 'var(--kc-error)' }}>
                Reason must be at least 5 characters
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" disabled={adjust.isPending}>
              Cancel
            </Button>
          </DialogClose>
          <Button onClick={handleConfirm} disabled={!canConfirm}>
            {adjust.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================ StaffWeeklyChart

function StaffWeeklyChart({ staffId, centerId }: { staffId: string; centerId?: string }) {
  const nav = useMonthNav();
  const { data: staffData, isLoading } = usePayrollStaff(staffId, nav.month, centerId);
  const { data: settings } = usePayrollSettings(centerId);
  return (
    <WeeklyBreakdownCard
      month={nav.month}
      canPrev={nav.canPrev}
      canNext={nav.canNext}
      onPrev={nav.goPrev}
      onNext={nav.goNext}
      isLoading={isLoading}
      days={staffData?.days ?? []}
      rate={staffData?.staff.hourlyRate ?? null}
      otRate={settings?.overtimeRate ?? 1.5}
      totalRegular={staffData?.totalRegular ?? 0}
      totalOvertime={staffData?.totalOvertime ?? 0}
      totalPay={staffData?.totalPay ?? 0}
    />
  );
}

// ============================================================ AuditLog

function fmtAdjTime(iso: string | null): string {
  if (!iso) return 'none';
  return fmtTime(iso);
}

function AuditLogCard({
  staffId,
  month,
  centerId,
}: {
  staffId: string;
  month: string;
  centerId?: string;
}) {
  const { data: adjustments, isLoading } = useStaffAdjustments(staffId, month, centerId);

  const fields: Array<{ key: keyof PayrollAdjustment['original']; label: string }> = [
    { key: 'ClockIn', label: 'Clock In' },
    { key: 'ClockOut', label: 'Clock Out' },
    { key: 'BreakIn', label: 'Break In' },
    { key: 'BreakOut', label: 'Break Out' },
  ];

  return (
    <ReadCard icon={ListChecks} title="Manual Adjustments">
      {isLoading ? (
        <div className="space-y-2 pt-1">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded" />
          ))}
        </div>
      ) : !adjustments?.length ? (
        <div className="flex items-center justify-center py-10">
          <p className="text-sm" style={{ color: 'var(--kc-text-3)' }}>
            No manual adjustments for this month
          </p>
        </div>
      ) : (
        <div className="divide-y" style={{ borderColor: 'var(--kc-border)' }}>
          {adjustments.map((adj) => {
            const changedFields = fields.filter(
              (f) => adj.original[f.key] !== adj.adjusted[f.key],
            );
            return (
              <div key={adj.id} className="py-3 space-y-1">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-sm font-semibold" style={{ color: 'var(--kc-text-1)' }}>
                    {new Date(adj.date + 'T12:00:00').toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                  <span className="text-xs" style={{ color: 'var(--kc-text-3)' }}>
                    {new Date(adj.adjustedAt).toLocaleString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                    {' — '}
                    {adj.adjuster.firstName} {adj.adjuster.lastName}
                  </span>
                </div>
                {changedFields.length > 0 && (
                  <div className="flex flex-wrap gap-x-4 gap-y-1">
                    {changedFields.map((f) => (
                      <span key={f.key} className="text-xs" style={{ color: 'var(--kc-text-2)' }}>
                        <span className="font-medium">{f.label}:</span>{' '}
                        <span style={{ color: 'var(--kc-error)' }}>
                          {fmtAdjTime(adj.original[f.key])}
                        </span>{' '}
                        →{' '}
                        <span style={{ color: 'var(--kc-success)' }}>
                          {fmtAdjTime(adj.adjusted[f.key])}
                        </span>
                      </span>
                    ))}
                  </div>
                )}
                <p className="text-xs italic" style={{ color: 'var(--kc-text-3)' }}>
                  "{adj.reason}"
                </p>
              </div>
            );
          })}
        </div>
      )}
    </ReadCard>
  );
}

// ============================================================ IndividualTabContent

interface IndividualTabContentProps {
  month: string;
  centerId?: string;
  selectedStaffId: string;
  onSelectStaff: (id: string) => void;
}

function IndividualTabContent({
  month,
  centerId,
  selectedStaffId,
  onSelectStaff,
}: IndividualTabContentProps) {
  const { data: teamRows, isLoading: teamLoading } = usePayrollTeam(month, centerId);
  const [editingDay, setEditingDay] = useState<DayCalc | null>(null);

  const { data: staffData, isLoading: staffLoading } = usePayrollStaff(
    selectedStaffId,
    month,
    centerId,
  );

  const selectCls = 'h-9 w-full rounded-md border px-3 text-sm cursor-pointer';
  const selectStyle = {
    borderColor: 'var(--kc-border)',
    background: 'var(--kc-bg)',
    color: 'var(--kc-text-1)',
  };

  return (
    <div className="space-y-6">
      {/* Staff selector */}
      <div className="flex items-center gap-4">
        <label className="shrink-0 text-sm font-medium" style={{ color: 'var(--kc-text-2)' }}>
          Staff Member
        </label>
        {teamLoading ? (
          <Skeleton className="h-9 w-64 rounded-md" />
        ) : !teamRows?.length ? (
          <p className="text-sm" style={{ color: 'var(--kc-text-3)' }}>
            No staff data for this month
          </p>
        ) : (
          <select
            value={selectedStaffId}
            onChange={(e) => onSelectStaff(e.target.value)}
            className={selectCls}
            style={selectStyle}
          >
            <option value="">— Select a staff member —</option>
            {teamRows.map((r) => (
              <option key={r.staffId} value={r.staffId}>
                {r.firstName} {r.lastName}
              </option>
            ))}
          </select>
        )}
      </div>

      {selectedStaffId && (
        <>
          {/* 4 stat cards */}
          {staffLoading ? (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full rounded-lg" />
              ))}
            </div>
          ) : staffData ? (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <StatCard
                icon={CalendarDays}
                label="Scheduled"
                value={fmtHours(staffData.scheduledHours)}
                color="var(--kc-text-2)"
              />
              <StatCard
                icon={Clock}
                label="Regular Hours"
                value={fmtHours(staffData.totalRegular)}
                color="var(--kc-p-600)"
              />
              <StatCard
                icon={AlertTriangle}
                label="Overtime Hours"
                value={fmtHours(staffData.totalOvertime)}
                color="var(--kc-warning)"
              />
              <StatCard
                icon={DollarSign}
                label="Total Pay"
                value={fmtCurrency(staffData.totalPay)}
                color="var(--kc-success)"
              />
            </div>
          ) : null}

          {/* Weekly bar chart — has its own month navigation, independent of
              the tab's month picker (defaults to the current month). */}
          <StaffWeeklyChart staffId={selectedStaffId} centerId={centerId} />

          <ReadCard icon={CalendarDays} title="Daily Breakdown">
            {staffLoading ? (
              <div className="space-y-2 pt-1">
                {Array.from({ length: 7 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full rounded" />
                ))}
              </div>
            ) : !staffData?.days.length ? (
              <div className="flex items-center justify-center py-12">
                <p className="text-sm" style={{ color: 'var(--kc-text-3)' }}>
                  No data for this month
                </p>
              </div>
            ) : (
              <div
                className="rounded-lg border overflow-x-auto [&_th:first-child]:pl-4 [&_th:last-child]:pr-4 [&_td:first-child]:pl-4 [&_td:last-child]:pr-4"
                style={{ background: 'var(--kc-surface)', borderColor: 'var(--kc-border)' }}
              >
                <Table>
                  <TableHeader>
                    <TableRow>
                      {/* Sticky first column (Date) — solid bg so scrolling
                          columns slide under it, not over the date. */}
                      <TableHead className="sticky left-0 top-0 z-20" style={{ background: 'var(--kc-surface)' }}>
                        Date
                      </TableHead>
                      <TableHead>Clock In</TableHead>
                      <TableHead>Clock Out</TableHead>
                      <TableHead>Break In</TableHead>
                      <TableHead>Break Out</TableHead>
                      <TableHead className="text-right">Regular h</TableHead>
                      <TableHead className="text-right">Overtime h</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {staffData.days.map((day) => (
                      <TableRow key={day.date}>
                        <TableCell
                          className="sticky left-0 z-10 font-medium tabular-nums"
                          style={{ color: 'var(--kc-text-1)', background: 'var(--kc-surface)' }}
                        >
                          {new Date(day.date + 'T12:00:00').toLocaleDateString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </TableCell>
                        <TableCell
                          className="tabular-nums"
                          style={{ color: 'var(--kc-text-2)' }}
                        >
                          {fmtTime(day.clockIn)}
                        </TableCell>
                        <TableCell
                          className="tabular-nums"
                          style={{ color: 'var(--kc-text-2)' }}
                        >
                          {fmtTime(day.clockOut)}
                        </TableCell>
                        <TableCell
                          className="tabular-nums"
                          style={{ color: 'var(--kc-text-3)' }}
                        >
                          {fmtTime(day.breakIn)}
                        </TableCell>
                        <TableCell
                          className="tabular-nums"
                          style={{ color: 'var(--kc-text-3)' }}
                        >
                          {fmtTime(day.breakOut)}
                        </TableCell>
                        <TableCell
                          className="text-right tabular-nums"
                          style={{ color: 'var(--kc-text-2)' }}
                        >
                          {fmtHours(day.regularHours)}
                        </TableCell>
                        <TableCell
                          className="text-right tabular-nums"
                          style={{
                            color:
                              day.overtimeHours > 0
                                ? 'var(--kc-warning)'
                                : 'var(--kc-text-3)',
                          }}
                        >
                          {fmtHours(day.overtimeHours)}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {day.approvalStatus === 'APPROVED' && (
                              <Badge style={{ background: 'color-mix(in oklch, var(--kc-success), transparent 80%)', color: 'var(--kc-success)' }}>
                                ✅ Approved
                              </Badge>
                            )}
                            {day.approvalStatus === 'PENDING' && (
                              <Badge style={{ background: 'var(--kc-warning-bg)', color: 'var(--kc-warning)' }}>
                                ⏳ Pending
                              </Badge>
                            )}
                            {day.approvalStatus === 'REJECTED' && (
                              <Badge style={{ background: 'color-mix(in oklch, var(--kc-error), transparent 80%)', color: 'var(--kc-error)' }}>
                                ❌ Rejected
                              </Badge>
                            )}
                            {day.adjusted && (
                              <Badge
                                style={{
                                  background:
                                    'color-mix(in oklch, var(--kc-warning), transparent 75%)',
                                  color: 'var(--kc-warning)',
                                }}
                              >
                                Edited
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingDay(day)}
                            style={{ color: 'var(--kc-p-600)' }}
                          >
                            Edit
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </ReadCard>

          {/* Audit log — adjustments for this staff/month */}
          <AuditLogCard staffId={selectedStaffId} month={month} centerId={centerId} />
        </>
      )}

      {editingDay && (
        <AdjustHoursDialog
          open={!!editingDay}
          onClose={() => setEditingDay(null)}
          day={editingDay}
          staffId={selectedStaffId}
          centerId={centerId}
        />
      )}
    </div>
  );
}

// ============================================================ sub-tab types

type ReportTab = 'overview' | 'team' | 'individual';

const REPORT_TABS = [
  { value: 'overview' as const, label: 'Overview' },
  { value: 'team' as const, label: 'Team' },
  { value: 'individual' as const, label: 'Individual' },
] as const;

// ============================================================ PayrollReports (public export)

export interface PayrollReportsProps {
  /** Scope to a specific center. Omit for the director's own center. */
  centerId?: string;
}

/**
 * Self-contained payroll reporting surface:
 *   Overview tab — MonthPicker + 4 stat cards + Weekly BarChart + Monthly LineChart
 *   Team tab     — team payroll table (with Approve All + footer totals) + weekly approvals
 *   Individual   — per-staff daily breakdown + weekly chart + audit log + hour adjustment
 *
 * selectedStaffId and activeTab are lifted here so the Team tab's View/Edit-Hours
 * actions can switch to the Individual tab with the correct staff pre-selected.
 *
 * The legacy period-list / Settings modal / export stays on the Director's
 * /reports/payroll page and is NOT included here.
 */
export function PayrollReports({ centerId }: PayrollReportsProps) {
  const [activeTab, setActiveTab] = useState<ReportTab>('overview');
  const [month, setMonth] = useState<string>(() => toYYYYMM(new Date()));
  // Lifted so TeamTabContent actions can pre-select a staff and switch to Individual.
  const [selectedStaffId, setSelectedStaffId] = useState<string>('');

  // Director Overview — period management state
  const [showApproveConfirm, setShowApproveConfirm] = useState(false);
  const [pendingApprovePeriod, setPendingApprovePeriod] = useState<PayrollPeriod | null>(null);
  const approvePeriod = useApprovePayrollPeriod();
  const { data: corrections } = useCenterCorrections();
  const pendingCorrections = corrections?.filter((c: { status: string }) => c.status === 'PENDING').length ?? 0;

  const prevMonthRef = useRef<string>(month);
  if (month !== prevMonthRef.current) {
    prevMonthRef.current = month;
    setSelectedStaffId('');
  }

  const handleApprove = async () => {
    if (!pendingApprovePeriod) return;
    try {
      await approvePeriod.mutateAsync(pendingApprovePeriod.id);
      toast.success('Period approved and locked');
      setShowApproveConfirm(false);
      setPendingApprovePeriod(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed');
    }
  };

  return (
    <div className="space-y-4">
      <FilterTabs
        tabs={REPORT_TABS}
        value={activeTab}
        onChange={setActiveTab}
        ariaLabel="Payroll report sections"
      />

      {/* Overview: MonthPicker + stat cards + charts + Director period sections */}
      {activeTab === 'overview' && (
        // space-y-6 = the SAAS-standard card-stack spacing (profile / payroll
        // page), so Weekly Hours no longer sits flush against the cards below
        // and every Overview card has the same vertical gap. Charts grid bumped
        // to gap-6 to match.
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium" style={{ color: 'var(--kc-text-2)' }}>
              Month
            </span>
            <MonthPicker value={month} onChange={setMonth} />
          </div>
          <SummaryCards month={month} centerId={centerId} />
          <div className="grid gap-6 lg:grid-cols-2">
            <WeeklyHoursChart month={month} centerId={centerId} />
            <MonthlyCostChart centerId={centerId} />
          </div>

          {/* (1) Custom Range Export */}
          <RangeExportSection centerId={centerId} />

          {/* (2) Current Period */}
          <DirectorCurrentPeriodSection
            centerId={centerId}
            onApprove={(period) => {
              setPendingApprovePeriod(period);
              setShowApproveConfirm(true);
            }}
          />

          {/* (3) Previous Periods */}
          <PreviousPeriodsSection centerId={centerId} />
        </div>
      )}

      {/* Team */}
      {activeTab === 'team' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium" style={{ color: 'var(--kc-text-2)' }}>
              Month
            </span>
            <MonthPicker value={month} onChange={setMonth} />
          </div>
          <TeamTabContent month={month} centerId={centerId} />
        </div>
      )}

      {/* Individual */}
      {activeTab === 'individual' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium" style={{ color: 'var(--kc-text-2)' }}>
              Month
            </span>
            <MonthPicker value={month} onChange={setMonth} />
          </div>
          <IndividualTabContent
            month={month}
            centerId={centerId}
            selectedStaffId={selectedStaffId}
            onSelectStaff={setSelectedStaffId}
          />
        </div>
      )}

      {/* Approve Period confirmation */}
      <AlertDialog open={showApproveConfirm} onOpenChange={setShowApproveConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve Pay Period?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingCorrections > 0
                ? `There are ${pendingCorrections} pending correction(s). Approving will lock this period. Continue?`
                : 'This will lock the period. No further changes will be possible.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleApprove} disabled={approvePeriod.isPending}>
              {approvePeriod.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Approve Period
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
