'use client';

import Link from 'next/link';
import { ArrowLeft, FileSpreadsheet, FileText } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import type { PayrollReport } from '@/lib/api/attendance';

function weekdayLabel(dateStr: string) {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString([], { weekday: 'short' });
}

function monthDayLabel(dateStr: string) {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function hoursCell(h: number) {
  if (h === 0) return '—';
  return `${h.toFixed(1)}h`;
}

/** Sorted unique dates that appear in any staff member's days. */
function reportDates(report: PayrollReport) {
  return Array.from(
    new Set(report.staff.flatMap((s) => s.days.map((d) => d.date))),
  ).sort();
}

const STICKY_BG = { background: 'var(--kc-bg)' };

/** Loading skeleton for both the per-period and range report pages. */
export function ReportSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-24 rounded" />
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48 rounded" />
          <Skeleton className="h-4 w-64 rounded" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-8 w-20 rounded-md" />
          <Skeleton className="h-8 w-20 rounded-md" />
        </div>
      </div>
      <Skeleton className="h-64 w-full rounded-lg" />
    </div>
  );
}

/** Classic orientation: rows = staff, columns = days (horizontal scroll). */
function ByStaffTable({ report }: { report: PayrollReport }) {
  const allDates = reportDates(report);
  return (
    <Card>
      <CardContent className="pt-4">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ color: 'var(--kc-text-3)' }}>
                <th className="text-left py-2 px-2 font-medium sticky left-0" style={STICKY_BG}>Staff</th>
                <th className="text-right py-2 px-2 font-medium">Rate</th>
                {allDates.map((d) => (
                  <th key={d} className="text-center py-2 px-2 font-medium min-w-[50px]">
                    {weekdayLabel(d)}
                  </th>
                ))}
                <th className="text-right py-2 px-2 font-medium">Regular</th>
                <th className="text-right py-2 px-2 font-medium">OT</th>
                <th className="text-right py-2 px-2 font-medium">Pay</th>
              </tr>
            </thead>
            <tbody>
              {report.staff.map((s) => {
                const dayMap = Object.fromEntries(s.days.map((d) => [d.date, d]));
                return (
                  <tr key={s.staff.id} className="border-t" style={{ borderColor: 'var(--kc-border)' }}>
                    <td className="py-2 px-2 font-medium sticky left-0" style={{ color: 'var(--kc-text-1)', ...STICKY_BG }}>
                      {s.staff.firstName} {s.staff.lastName}
                    </td>
                    <td className="py-2 px-2 text-right tabular-nums" style={{ color: 'var(--kc-text-2)' }}>
                      ${s.staff.hourlyRate?.toFixed(2) ?? '—'}
                    </td>
                    {allDates.map((d) => {
                      const day = dayMap[d];
                      const worked = day ? day.regularHours + day.overtimeHours : 0;
                      return (
                        <td key={d} className="py-2 px-2 text-center tabular-nums" style={{ color: worked > 0 ? 'var(--kc-text-1)' : 'var(--kc-text-3)' }}>
                          {worked > 0 ? `${worked.toFixed(1)}` : 'OFF'}
                        </td>
                      );
                    })}
                    <td className="py-2 px-2 text-right tabular-nums" style={{ color: 'var(--kc-text-1)' }}>
                      {hoursCell(s.totalRegular)}
                    </td>
                    <td className="py-2 px-2 text-right tabular-nums" style={{ color: s.totalOvertime > 0 ? 'var(--kc-warning)' : 'var(--kc-text-2)' }}>
                      {hoursCell(s.totalOvertime)}
                    </td>
                    <td className="py-2 px-2 text-right tabular-nums font-semibold" style={{ color: 'var(--kc-p-600)' }}>
                      ${s.totalPay.toFixed(2)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 font-semibold" style={{ borderColor: 'var(--kc-border)' }}>
                <td className="py-2 px-2 sticky left-0" style={{ color: 'var(--kc-text-1)', ...STICKY_BG }} colSpan={2}>TOTAL</td>
                {allDates.map((d) => {
                  const dayTotal = report.staff.reduce((sum, s) => {
                    const day = s.days.find((dd) => dd.date === d);
                    return sum + (day ? day.regularHours + day.overtimeHours : 0);
                  }, 0);
                  return (
                    <td key={d} className="py-2 px-2 text-center tabular-nums" style={{ color: 'var(--kc-text-1)' }}>
                      {dayTotal > 0 ? dayTotal.toFixed(1) : ''}
                    </td>
                  );
                })}
                <td className="py-2 px-2 text-right tabular-nums" style={{ color: 'var(--kc-text-1)' }}>{report.totals.regularHours.toFixed(1)}h</td>
                <td className="py-2 px-2 text-right tabular-nums" style={{ color: 'var(--kc-warning)' }}>{report.totals.overtimeHours.toFixed(1)}h</td>
                <td className="py-2 px-2 text-right tabular-nums" style={{ color: 'var(--kc-p-600)' }}>${report.totals.totalPay.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Transposed orientation: rows = days, columns = staff (vertical scroll).
 * First column (date) and the header row (staff names) are sticky. Used by the
 * range / full-month report so a whole month reads top-to-bottom.
 */
function ByDayTable({ report }: { report: PayrollReport }) {
  const allDates = reportDates(report);
  const staff = report.staff;

  return (
    <Card>
      <CardContent className="pt-4">
        <div className="max-h-[70vh] overflow-y-auto overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ color: 'var(--kc-text-3)' }}>
                <th className="text-left py-2 px-2 font-medium sticky top-0 left-0 z-20" style={STICKY_BG}>Date</th>
                {staff.map((s) => (
                  <th key={s.staff.id} className="text-center py-2 px-2 font-medium min-w-[64px] sticky top-0 z-10" style={STICKY_BG}>
                    {s.staff.firstName}
                  </th>
                ))}
                <th className="text-right py-2 px-2 font-medium sticky top-0 z-10" style={STICKY_BG}>Total</th>
              </tr>
            </thead>
            <tbody>
              {allDates.map((date) => {
                const dayTotal = staff.reduce((sum, s) => {
                  const day = s.days.find((d) => d.date === date);
                  return sum + (day ? day.regularHours + day.overtimeHours : 0);
                }, 0);
                return (
                  <tr key={date} className="border-t" style={{ borderColor: 'var(--kc-border)' }}>
                    <td className="py-2 px-2 font-medium whitespace-nowrap sticky left-0" style={{ color: 'var(--kc-text-1)', ...STICKY_BG }}>
                      {monthDayLabel(date)}{' '}
                      <span style={{ color: 'var(--kc-text-3)' }}>{weekdayLabel(date)}</span>
                    </td>
                    {staff.map((s) => {
                      const day = s.days.find((d) => d.date === date);
                      const worked = day ? day.regularHours + day.overtimeHours : 0;
                      const isOT = !!day && day.overtimeHours > 0;
                      return (
                        <td
                          key={s.staff.id}
                          className="py-2 px-2 text-center tabular-nums"
                          style={{ color: worked === 0 ? 'var(--kc-text-3)' : isOT ? 'var(--kc-warning)' : 'var(--kc-text-1)' }}
                        >
                          {worked === 0 ? '-' : `${worked.toFixed(1)}h${isOT ? ' ⚡' : ''}`}
                        </td>
                      );
                    })}
                    <td className="py-2 px-2 text-right tabular-nums font-medium" style={{ color: 'var(--kc-text-1)' }}>
                      {dayTotal > 0 ? `${dayTotal.toFixed(1)}h` : '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 font-semibold" style={{ borderColor: 'var(--kc-border)' }}>
                <td className="py-2 px-2 sticky left-0" style={{ color: 'var(--kc-text-1)', ...STICKY_BG }}>TOTAL</td>
                {staff.map((s) => {
                  const t = s.totalRegular + s.totalOvertime;
                  return (
                    <td key={s.staff.id} className="py-2 px-2 text-center tabular-nums" style={{ color: s.totalOvertime > 0 ? 'var(--kc-warning)' : 'var(--kc-text-1)' }}>
                      {t.toFixed(1)}h
                    </td>
                  );
                })}
                <td className="py-2 px-2 text-right tabular-nums" style={{ color: 'var(--kc-p-600)' }}>
                  {(report.totals.regularHours + report.totals.overtimeHours).toFixed(1)}h
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Shared payroll report renderer (header + table). The data shape
 * (PayrollReport) is identical for the per-period and range reports — only the
 * title/status/download source differ, so they're props.
 *
 * `byDay`: transposed table (rows = days, columns = staff). Used by the range
 * full-month report; the per-period page keeps the classic staff-rows layout.
 */
export function PayrollReportView({
  report,
  subtitle,
  statusLabel,
  statusTone,
  onDownload,
  byDay = false,
}: {
  report: PayrollReport;
  subtitle: string;
  statusLabel: string;
  statusTone: 'approved' | 'open';
  onDownload: (format: 'xlsx' | 'pdf') => void;
  byDay?: boolean;
}) {
  const statusStyle =
    statusTone === 'approved'
      ? { bg: 'color-mix(in oklch, var(--kc-p-100), transparent 30%)', color: 'var(--kc-p-700)' }
      : { bg: 'var(--kc-warning-bg)', color: 'var(--kc-warning)' };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link href="/reports/payroll">
            <ArrowLeft className="mr-1 h-4 w-4" /> Back
          </Link>
        </Button>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold">Payroll Report</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm" style={{ color: 'var(--kc-text-2)' }}>{subtitle}</span>
            <Badge style={{ background: statusStyle.bg, color: statusStyle.color }}>{statusLabel}</Badge>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => onDownload('xlsx')}>
            <FileSpreadsheet className="mr-1.5 h-3.5 w-3.5" /> Excel
          </Button>
          <Button variant="outline" size="sm" onClick={() => onDownload('pdf')}>
            <FileText className="mr-1.5 h-3.5 w-3.5" /> PDF
          </Button>
        </div>
      </div>

      {byDay ? <ByDayTable report={report} /> : <ByStaffTable report={report} />}
    </div>
  );
}
