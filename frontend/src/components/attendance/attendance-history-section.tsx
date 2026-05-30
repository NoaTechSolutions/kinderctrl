'use client';

import { useMemo, useState } from 'react';
import { CheckCircle, ChevronLeft, ChevronRight, Coffee, History, LogIn, LogOut, Pencil, XCircle } from 'lucide-react';
import { CardWithHeader } from '@/components/ui/card-with-header';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useMyApprovals, useMyCorrections, useMyHistory } from '@/lib/hooks/use-attendance';
import { useTimeFormat } from '@/lib/preferences/time-format';
import { formatTime } from '@/lib/format-time';
import type { AttendanceApproval, HistoryDay, StaffTimeEntry } from '@/lib/api/attendance';
import { CorrectionModal } from '@/components/attendance/correction-modal';

type ViewMode = 'day' | 'week' | 'month';

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getRange(mode: ViewMode, offset: number): { from: string; to: string; label: string } {
  const now = new Date();
  if (mode === 'day') {
    const d = new Date(now);
    d.setDate(d.getDate() + offset);
    return {
      from: dateKey(d),
      to: dateKey(d),
      label: d.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }),
    };
  }
  if (mode === 'week') {
    const monday = new Date(now);
    const dow = monday.getDay();
    monday.setDate(monday.getDate() - (dow === 0 ? 6 : dow - 1) + offset * 7);
    const sunday = new Date(monday);
    sunday.setDate(sunday.getDate() + 6);
    return {
      from: dateKey(monday),
      to: dateKey(sunday),
      label: `${monday.toLocaleDateString([], { month: 'short', day: 'numeric' })} – ${sunday.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}`,
    };
  }
  const first = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const last = new Date(now.getFullYear(), now.getMonth() + offset + 1, 0);
  return {
    from: dateKey(first),
    to: dateKey(last),
    label: first.toLocaleDateString([], { month: 'long', year: 'numeric' }),
  };
}

// Window during which the staff can request a correction for a given day.
// "Within 48h" = the day started less than 48 hours ago, which in practice
// means today + most of yesterday.
function isWithin48h(dateStr: string): boolean {
  const day = new Date(dateStr + 'T00:00:00');
  const hoursSince = (Date.now() - day.getTime()) / 3_600_000;
  return hoursSince >= 0 && hoursSince < 48;
}

function workedDisplay(entries: StaffTimeEntry[]): string {
  const ci = entries.find((e) => e.type === 'CLOCK_IN');
  const co = entries.find((e) => e.type === 'CLOCK_OUT');
  if (!ci || !co) return '—';
  const bi = entries.find((e) => e.type === 'BREAK_IN');
  const bo = entries.find((e) => e.type === 'BREAK_OUT');
  const brk = bi && bo
    ? new Date(bo.deviceTimestamp).getTime() - new Date(bi.deviceTimestamp).getTime()
    : 0;
  const ms = new Date(co.deviceTimestamp).getTime() - new Date(ci.deviceTimestamp).getTime() - brk;
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return `${h}h ${m}m`;
}

function DayRow({
  day,
  tf,
  pending,
  approval,
  onCorrect,
}: {
  day: HistoryDay;
  tf: '12h' | '24h';
  pending: boolean;
  approval?: AttendanceApproval | null;
  onCorrect: (date: string, entries: StaffTimeEntry[]) => void;
}) {
  const ci = day.entries.find((e) => e.type === 'CLOCK_IN');
  const bi = day.entries.find((e) => e.type === 'BREAK_IN');
  const bo = day.entries.find((e) => e.type === 'BREAK_OUT');
  const co = day.entries.find((e) => e.type === 'CLOCK_OUT');
  const hasPunches = day.entries.length > 0;
  const dateOnly = day.date.split('T')[0];
  const withinWindow = isWithin48h(dateOnly);
  const showButton = hasPunches && withinWindow;

  const dateObj = new Date(dateOnly + 'T00:00:00');

  return (
    <div
      className="flex items-start gap-3 py-3 px-3 rounded-lg"
      style={{ background: 'var(--kc-surface-2)' }}
    >
      <div className="w-20 flex-none">
        <p className="text-sm font-medium" style={{ color: 'var(--kc-text-1)' }}>
          {dateObj.toLocaleDateString([], { weekday: 'short' })}
        </p>
        <p className="text-xs" style={{ color: 'var(--kc-text-3)' }}>
          {dateObj.toLocaleDateString([], { month: 'short', day: 'numeric' })}
        </p>
      </div>

      {!hasPunches ? (
        <p className="flex-1 text-sm pt-1" style={{ color: 'var(--kc-text-3)' }}>
          No attendance recorded
        </p>
      ) : (
        <div className="flex-1 min-w-0 space-y-1">
          {ci && (
            <div className="flex items-center gap-2 text-sm">
              <LogIn className="h-4 w-4 flex-none" style={{ color: '#22c55e' }} aria-hidden />
              <span className="font-bold" style={{ color: '#22c55e' }}>In:</span>
              <span className="tabular-nums" style={{ color: 'var(--kc-text-1)' }}>
                {formatTime(ci.deviceTimestamp, tf)}
              </span>
            </div>
          )}
          {bi && (
            <div className="flex items-center gap-2 text-sm">
              <Coffee className="h-4 w-4 flex-none" style={{ color: 'var(--kc-warning)' }} aria-hidden />
              <span className="font-bold" style={{ color: 'var(--kc-warning)' }}>Break:</span>
              <span className="tabular-nums" style={{ color: 'var(--kc-text-1)' }}>
                {formatTime(bi.deviceTimestamp, tf)}
                {bo && <> – {formatTime(bo.deviceTimestamp, tf)}</>}
              </span>
            </div>
          )}
          {ci && (
            <div className="flex items-center gap-2 text-sm">
              <LogOut className="h-4 w-4 flex-none" style={{ color: 'var(--kc-p-600)' }} aria-hidden />
              <span className="font-bold" style={{ color: 'var(--kc-p-600)' }}>Out:</span>
              <span className="tabular-nums" style={{ color: 'var(--kc-text-1)' }}>
                {co ? formatTime(co.deviceTimestamp, tf) : 'In progress'}
              </span>
            </div>
          )}
          <div className="flex items-center gap-2 text-sm pt-0.5">
            <span className="text-xs font-medium" style={{ color: 'var(--kc-text-3)' }}>Total:</span>
            <span className="font-semibold tabular-nums" style={{ color: 'var(--kc-text-3)' }}>
              {workedDisplay(day.entries)}
            </span>
          </div>
        </div>
      )}

      {approval && approval.status === 'APPROVED' && (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="flex-none inline-flex items-center justify-center mt-1">
              <CheckCircle className="h-4 w-4" style={{ color: '#22c55e' }} aria-label="Approved by Director" />
            </span>
          </TooltipTrigger>
          <TooltipContent
            className="text-xs p-2 shadow-md"
            style={{ background: 'var(--kc-bg)', color: 'var(--kc-text-1)', border: '1px solid var(--kc-border)' }}
          >
            Approved by Director
          </TooltipContent>
        </Tooltip>
      )}
      {approval && approval.status === 'REJECTED' && (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="flex-none inline-flex items-center justify-center mt-1">
              <XCircle className="h-4 w-4" style={{ color: 'var(--kc-error)' }} aria-label="Rejected by Director" />
            </span>
          </TooltipTrigger>
          <TooltipContent
            className="text-xs p-2 shadow-md max-w-xs"
            style={{ background: 'var(--kc-bg)', color: 'var(--kc-text-1)', border: '1px solid var(--kc-border)' }}
          >
            Rejected: {approval.directorComment ?? '(no comment)'}
          </TooltipContent>
        </Tooltip>
      )}

      {showButton && (
        <Button
          variant="outline"
          size="icon"
          className="h-7 w-7 flex-none mt-0.5"
          aria-label={pending ? 'Correction pending' : 'Request correction'}
          title={pending ? 'Correction pending' : 'Request correction'}
          onClick={() => onCorrect(dateOnly, day.entries)}
          style={pending ? { color: 'var(--kc-warning)' } : undefined}
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
}

// Month-mode rendering: a 7-col calendar grid (Mon–Sun) showing one tile per
// day with worked hours + status (✓ complete green, ! incomplete amber, blank
// muted). Hovering / tapping a tile reveals the timestamps via Tooltip. Visual
// rules mirror ScheduleCalendar's MonthView (today highlight, past muted,
// padding cells dimmed) but data is HistoryDay — not the planned schedule.

function MonthCalendarView({
  year,
  month,
  dayByDate,
  tf,
  pendingByDate,
  onCorrect,
}: {
  year: number;
  month: number;
  dayByDate: Map<string, HistoryDay>;
  tf: '12h' | '24h';
  pendingByDate: Map<string, boolean>;
  onCorrect: (date: string, entries: StaffTimeEntry[]) => void;
}) {
  const weeks = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const jsDay = firstDay.getDay();
    const startOffset = jsDay === 0 ? 6 : jsDay - 1;
    const start = new Date(firstDay);
    start.setDate(start.getDate() - startOffset);
    const result: Date[][] = [];
    const cur = new Date(start);
    while (cur <= lastDay || result.length === 0 || cur.getDay() !== 1) {
      if (cur.getDay() === 1 || result.length === 0) result.push([]);
      result[result.length - 1].push(new Date(cur));
      cur.setDate(cur.getDate() + 1);
      if (result[result.length - 1].length === 7 && cur > lastDay && cur.getDay() === 1) break;
    }
    return result;
  }, [year, month]);

  const todayStr = dateKey(new Date());

  return (
    <div>
      <div className="grid grid-cols-7 text-center mb-1">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
          <div key={d} className="text-xs font-medium py-1" style={{ color: 'var(--kc-text-3)' }}>{d}</div>
        ))}
      </div>
      {weeks.map((week, wi) => (
        <div key={wi} className="grid grid-cols-7 border-t" style={{ borderColor: 'var(--kc-border)' }}>
          {week.map((date) => {
            const key = dateKey(date);
            const isCurrentMonth = date.getMonth() === month;
            const isToday = key === todayStr;
            const isPast = !isToday && key < todayStr;
            const isFuture = key > todayStr;
            const day = dayByDate.get(key);
            const ci = day?.entries.find((e) => e.type === 'CLOCK_IN');
            const co = day?.entries.find((e) => e.type === 'CLOCK_OUT');
            const bi = day?.entries.find((e) => e.type === 'BREAK_IN');
            const bo = day?.entries.find((e) => e.type === 'BREAK_OUT');
            const hasPunches = !!day?.entries.length;
            const complete = !!(ci && co);
            const incomplete = !!ci && !co;
            const pending = pendingByDate.get(key) ?? false;
            const withinWindow = isWithin48h(key);
            const showCorrect = hasPunches && withinWindow;

            const hoursLabel = complete ? workedDisplay(day!.entries) : incomplete ? 'In progress' : '';
            const statusColor = complete ? '#22c55e' : incomplete ? 'var(--kc-warning)' : 'var(--kc-text-3)';
            const statusMark = complete ? '✓' : incomplete ? '!' : '';

            // Past days in the current month with no punches get a subtly
            // darker background so they read as "missed/empty" at a glance.
            const cellBg = isPast && !hasPunches && isCurrentMonth ? 'var(--kc-surface-2)' : 'transparent';

            const cellStyle = {
              minHeight: '100px',
              borderColor: 'var(--kc-border)',
              background: cellBg,
              ...(isToday && { boxShadow: 'inset 0 0 0 2px var(--kc-p-600)' }),
            } as const;

            const cellInner = (
              <>
                {isToday ? (
                  <div className="text-xs font-bold mb-1 inline-flex items-center justify-center rounded-full" style={{ color: 'white', background: 'var(--kc-p-600)', width: '22px', height: '22px' }}>
                    {date.getDate()}
                  </div>
                ) : (
                  <div className="text-xs font-medium mb-1" style={{ color: (isFuture || isPast || !isCurrentMonth) ? 'var(--kc-text-3)' : 'var(--kc-text-1)' }}>
                    {date.getDate()}
                  </div>
                )}
                {hasPunches && (
                  <div className="flex items-center gap-1">
                    <p className="text-sm font-semibold tabular-nums" style={{ color: statusColor }}>
                      {hoursLabel}
                    </p>
                    <span className="text-xs font-bold" style={{ color: statusColor }}>{statusMark}</span>
                  </div>
                )}
                {showCorrect && (
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7 mt-1"
                    onClick={(e) => { e.stopPropagation(); onCorrect(key, day!.entries); }}
                    aria-label={pending ? 'Correction pending' : 'Request correction'}
                    title={pending ? 'Correction pending' : 'Request correction'}
                    style={pending ? { color: 'var(--kc-warning)' } : undefined}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                )}
              </>
            );

            if (hasPunches) {
              return (
                <Tooltip key={key}>
                  <TooltipTrigger asChild>
                    <div
                      className="p-1.5 border-r last:border-r-0 text-left"
                      style={cellStyle}
                    >
                      {cellInner}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent
                    className="text-xs p-2 shadow-md"
                    style={{
                      background: 'var(--kc-bg)',
                      color: 'var(--kc-text-1)',
                      border: '1px solid var(--kc-border)',
                    }}
                  >
                    <div className="space-y-0.5">
                      {ci && <p>In: {formatTime(ci.deviceTimestamp, tf)}</p>}
                      {bi && (
                        <p>
                          Break: {formatTime(bi.deviceTimestamp, tf)}
                          {bo && <> – {formatTime(bo.deviceTimestamp, tf)}</>}
                        </p>
                      )}
                      {co && <p>Out: {formatTime(co.deviceTimestamp, tf)}</p>}
                      {complete && <p className="pt-0.5 font-semibold">Total: {workedDisplay(day!.entries)}</p>}
                    </div>
                  </TooltipContent>
                </Tooltip>
              );
            }
            return (
              <div
                key={key}
                className="p-1.5 border-r last:border-r-0"
                style={cellStyle}
              >
                {cellInner}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

export function AttendanceHistorySection() {
  const [mode, setMode] = useState<ViewMode>('week');
  const [offset, setOffset] = useState(0);
  const [modal, setModal] = useState<{ open: boolean; date: string; entries: StaffTimeEntry[] }>({
    open: false,
    date: '',
    entries: [],
  });

  const range = useMemo(() => getRange(mode, offset), [mode, offset]);
  const { data, isLoading } = useMyHistory(range.from, range.to);
  const { data: corrections } = useMyCorrections();
  // Director approval indicators only show in Week mode per the spec, so we
  // scope the query to the current week range and skip it in Day / Month.
  const { data: approvals } = useMyApprovals(mode === 'week' ? range.from : undefined);
  const { timeFormat: tf } = useTimeFormat();

  // Map date -> true when there's a PENDING correction for that day, so we
  // can mark the row's pencil button amber and show the right tooltip.
  const pendingByDate = useMemo(() => {
    const map = new Map<string, boolean>();
    (corrections ?? []).forEach((c) => {
      if (c.status === 'PENDING') map.set(c.date.split('T')[0], true);
    });
    return map;
  }, [corrections]);

  // Map date -> approval record for the week (Week mode only). Used by the
  // row to show a green check / red X next to the pencil.
  const approvalByDate = useMemo(() => {
    const map = new Map<string, AttendanceApproval>();
    (approvals ?? []).forEach((a) => map.set(a.date.split('T')[0], a));
    return map;
  }, [approvals]);

  // Backend only returns days that have punches. We render the full date
  // range so empty days show "No attendance recorded", in descending order
  // (most recent first — most useful for the staff member).
  const allDays: HistoryDay[] = useMemo(() => {
    const byDate = new Map<string, HistoryDay>();
    (data ?? []).forEach((d) => byDate.set(d.date.split('T')[0], d));
    const out: HistoryDay[] = [];
    const start = new Date(range.from + 'T00:00:00');
    const end = new Date(range.to + 'T00:00:00');
    const cur = new Date(start);
    while (cur <= end) {
      const k = dateKey(cur);
      const existing = byDate.get(k);
      out.push(existing ?? {
        date: k,
        entries: [],
        shiftStatus: { clockedIn: false, onBreak: false, clockedOut: false, nextActions: ['CLOCK_IN'] },
      });
      cur.setDate(cur.getDate() + 1);
    }
    return out.reverse();
  }, [data, range]);

  // Lookup used by the month calendar to find the HistoryDay for a given
  // YYYY-MM-DD without walking allDays each render.
  const dayByDate = useMemo(() => {
    const m = new Map<string, HistoryDay>();
    (data ?? []).forEach((d) => m.set(d.date.split('T')[0], d));
    return m;
  }, [data]);

  // Year/month used by the month calendar. Only meaningful when mode === 'month'
  // but computed always (cheap) so we don't need a conditional hook call.
  const monthYear = useMemo(() => {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() + offset);
    return { year: d.getFullYear(), month: d.getMonth() };
  }, [offset]);

  const openCorrection = (date: string, entries: StaffTimeEntry[]) => {
    setModal({ open: true, date, entries });
  };

  return (
    <>
      <CardWithHeader icon={History} title="Attendance History">
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-1">
              {(['day', 'week', 'month'] as ViewMode[]).map((m) => (
                <Button
                  key={m}
                  variant={mode === m ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => { setMode(m); setOffset(0); }}
                >
                  {m.charAt(0).toUpperCase() + m.slice(1)}
                </Button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon-xs"
                aria-label="Previous period"
                onClick={() => setOffset((o) => o - 1)}
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <span className="text-sm font-medium px-2 min-w-[10rem] text-center" style={{ color: 'var(--kc-text-1)' }}>
                {range.label}
              </span>
              <Button
                variant="outline"
                size="icon-xs"
                aria-label="Next period"
                disabled={offset >= 0}
                onClick={() => setOffset((o) => o + 1)}
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full rounded-lg" />
              ))}
            </div>
          ) : mode === 'month' ? (
            <MonthCalendarView
              year={monthYear.year}
              month={monthYear.month}
              dayByDate={dayByDate}
              tf={tf}
              pendingByDate={pendingByDate}
              onCorrect={openCorrection}
            />
          ) : (
            <div className="space-y-2">
              {allDays.map((day) => (
                <DayRow
                  key={day.date}
                  day={day}
                  tf={tf}
                  pending={pendingByDate.get(day.date.split('T')[0]) ?? false}
                  approval={approvalByDate.get(day.date.split('T')[0])}
                  onCorrect={openCorrection}
                />
              ))}
            </div>
          )}
        </div>
      </CardWithHeader>

      <CorrectionModal
        open={modal.open}
        onClose={() => setModal((m) => ({ ...m, open: false }))}
        date={modal.date}
        entries={modal.entries}
      />
    </>
  );
}
