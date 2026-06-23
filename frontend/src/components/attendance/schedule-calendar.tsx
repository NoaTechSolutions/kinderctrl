'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  CalendarDays,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  User,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { ScheduleWithStaff } from '@/lib/api/attendance';

const STAFF_COLORS = [
  '#3b82f6', '#22c55e', '#f97316', '#a855f7',
  '#ec4899', '#06b6d4', '#ef4444', '#eab308',
];

// Per-shift color WITHIN a single day for the staff "My Schedule" view. Shifts
// are colored by chronological order (earliest = index 0) so a day's dot in the
// Month grid matches the same shift's accent in the Day detail. Reuses the
// staff palette tokens; wraps if a day somehow has more shifts than colors.
function shiftDotColor(index: number): string {
  return STAFF_COLORS[index % STAFF_COLORS.length];
}

const HOUR_HEIGHT = 64;

type ViewMode = 'month' | 'week' | 'day';

interface Shift {
  staffId: string;
  staffName: string;
  color: string;
  date: string;
  startTime: string;
  endTime: string;
  scheduleId: string;
}

function buildShifts(schedules: ScheduleWithStaff[]): Shift[] {
  const colorMap = new Map<string, string>();
  const seen = new Map<string, ScheduleWithStaff['staff']>();
  for (const s of schedules) seen.set(s.staff.id, s.staff);
  [...seen.keys()].forEach((id, i) => colorMap.set(id, STAFF_COLORS[i % STAFF_COLORS.length]));

  const shifts: Shift[] = [];
  for (const sched of schedules) {
    const start = new Date(sched.startDate);
    for (const day of sched.days) {
      if (day.isOff || !day.startTime || !day.endTime) continue;
      const d = new Date(start);
      d.setUTCDate(d.getUTCDate() + day.dayOfWeek - 1);
      shifts.push({
        staffId: sched.staff.id,
        staffName: `${sched.staff.firstName} ${sched.staff.lastName}`,
        color: colorMap.get(sched.staff.id) ?? STAFF_COLORS[0],
        date: d.toISOString().split('T')[0],
        startTime: day.startTime,
        endTime: day.endTime,
        scheduleId: sched.id,
      });
    }
  }
  return shifts;
}

function timeToHours(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h + m / 60;
}

function formatHourLabel(h: number) {
  if (h === 0) return '12am';
  if (h < 12) return `${h}am`;
  if (h === 12) return '12pm';
  return `${h - 12}pm`;
}

// ============================================ WEEK VIEW — horizontal timeline (days Y, hours X)

function WeekView({
  schedules,
  weekStart,
  startHour,
  endHour,
  centerOpenTime,
  centerCloseTime,
  readonly = false,
  singleStaffMode = false,
}: {
  schedules: ScheduleWithStaff[];
  weekStart: Date;
  startHour: number;
  endHour: number;
  centerOpenTime?: string;
  centerCloseTime?: string;
  readonly?: boolean;
  singleStaffMode?: boolean;
}) {
  const BLOCK_H = 28;
  const BLOCK_GAP = 4;
  const LABEL_W = 70;

  const shifts = useMemo(() => buildShifts(schedules), [schedules]);
  const hours = Array.from({ length: endHour - startHour }, (_, i) => startHour + i);
  const numHours = hours.length;

  const weekDates = useMemo(() =>
    Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart); d.setDate(d.getDate() + i); return d;
    }), [weekStart]);

  const todayStr = new Date().toLocaleDateString('en-CA');

  const shiftsByDate = useMemo(() => {
    const map = new Map<string, Shift[]>();
    const weekKeys = new Set(weekDates.map(d => d.toLocaleDateString('en-CA')));
    for (const s of shifts) {
      if (!weekKeys.has(s.date)) continue;
      if (!map.has(s.date)) map.set(s.date, []);
      map.get(s.date)!.push(s);
    }
    return map;
  }, [shifts, weekDates]);

  // Center operating-hours markers: a green line at opening, a red line at
  // closing (replacing the old current-time indicator). Uniform across the
  // week — same open/close for every day row. Positions use the same fraction
  // formula as the shift blocks: (hour - startHour) / numHours.
  const openFrac = centerOpenTime != null
    ? (timeToHours(centerOpenTime) - startHour) / numHours
    : null;
  const closeFrac = centerCloseTime != null
    ? (timeToHours(centerCloseTime) - startHour) / numHours
    : null;
  // Horizontal offset that keeps a fraction aligned with the timeline area
  // (which starts after the sticky LABEL_W day-label column).
  const fracLeft = (f: number) => `calc(${LABEL_W * (1 - f)}px + ${f * 100}%)`;
  const showBand = openFrac != null && closeFrac != null
    && closeFrac > openFrac && openFrac >= 0 && closeFrac <= 1;

  return (
    <Card>
      <CardContent className="pt-4 overflow-auto">
        <div>
          {/* Sticky hour header */}
          <div className="flex sticky top-0 z-10" style={{ background: 'var(--kc-bg)' }}>
            <div
              className="flex-none sticky left-0 z-[15] border-b"
              style={{ width: `${LABEL_W}px`, background: 'var(--kc-bg)', borderColor: 'var(--kc-border)' }}
            />
            <div className="flex flex-1">
              {hours.map((h) => (
                <div
                  key={h}
                  className="flex-1 text-center text-[10px] py-2 border-l border-b"
                  style={{ borderColor: 'var(--kc-border)', color: 'var(--kc-text-3)' }}
                >
                  {formatHourLabel(h)}
                </div>
              ))}
            </div>
          </div>

          {/* Day rows */}
          <div className="relative">
            {/* Operating-hours band — soft shading between open and close. */}
            {showBand && (
              <div
                className="absolute top-0 bottom-0 z-0 pointer-events-none"
                style={{
                  left: fracLeft(openFrac!),
                  width: `calc(${(closeFrac! - openFrac!) * 100}% - ${LABEL_W * (closeFrac! - openFrac!)}px)`,
                  background: 'color-mix(in oklch, var(--kc-p-600), transparent 94%)',
                }}
              />
            )}

            {/* Opening line (green) */}
            {openFrac != null && openFrac >= 0 && openFrac <= 1 && (
              <div
                className="absolute top-0 bottom-0 z-20 pointer-events-none"
                style={{ left: fracLeft(openFrac) }}
              >
                <div className="flex flex-col items-center h-full">
                  <div className="w-2 h-2 rounded-full bg-green-500 flex-none" />
                  <div className="w-[2px] flex-1 bg-green-500" />
                </div>
              </div>
            )}

            {/* Closing line (red) */}
            {closeFrac != null && closeFrac >= 0 && closeFrac <= 1 && (
              <div
                className="absolute top-0 bottom-0 z-20 pointer-events-none"
                style={{ left: fracLeft(closeFrac) }}
              >
                <div className="flex flex-col items-center h-full">
                  <div className="w-2 h-2 rounded-full bg-red-500 flex-none" />
                  <div className="w-[2px] flex-1 bg-red-500" />
                </div>
              </div>
            )}

            {weekDates.map((d) => {
              const dateStr = d.toLocaleDateString('en-CA');
              const isToday = dateStr === todayStr;
              const dayShifts = shiftsByDate.get(dateStr) ?? [];
              const subrowCount = Math.max(1, dayShifts.length);
              const rowHeight = subrowCount * (BLOCK_H + BLOCK_GAP) + BLOCK_GAP;

              return (
                <div
                  key={dateStr}
                  className="flex border-t"
                  style={{ borderColor: 'var(--kc-border)', minHeight: `${rowHeight}px` }}
                >
                  {/* Day label — sticky left */}
                  <div
                    className="flex-none sticky left-0 z-[5] flex flex-col items-center justify-center"
                    style={{ width: `${LABEL_W}px`, background: 'var(--kc-bg)', borderRight: '1px solid var(--kc-border)' }}
                  >
                    <div className="text-[10px] uppercase font-medium" style={{ color: 'var(--kc-text-3)' }}>
                      {d.toLocaleDateString([], { weekday: 'short' })}
                    </div>
                    <div
                      className="text-sm font-semibold inline-flex items-center justify-center"
                      style={isToday
                        ? { color: 'white', background: 'var(--kc-p-600)', borderRadius: '50%', width: '24px', height: '24px' }
                        : { color: 'var(--kc-text-1)' }}
                    >
                      {d.getDate()}
                    </div>
                  </div>

                  {/* Timeline area — fills remaining width */}
                  <div className="flex-1 relative" style={{ minHeight: `${rowHeight}px` }}>
                    {/* Vertical hour grid lines */}
                    {hours.map((_, i) => (
                      <div
                        key={i}
                        className="absolute top-0 bottom-0 border-l"
                        style={{ left: `${(i / numHours) * 100}%`, borderColor: 'var(--kc-border)' }}
                      />
                    ))}

                    {/* Shift blocks */}
                    {dayShifts.map((shift, si) => {
                      const startPct = ((timeToHours(shift.startTime) - startHour) / numHours) * 100;
                      const widthPct = ((timeToHours(shift.endTime) - timeToHours(shift.startTime)) / numHours) * 100;
                      const top = si * (BLOCK_H + BLOCK_GAP) + BLOCK_GAP;
                      const duration = timeToHours(shift.endTime) - timeToHours(shift.startTime);
                      const blockClass = `absolute flex items-center overflow-hidden transition-shadow${readonly ? '' : ' hover:shadow-lg cursor-pointer'}`;
                      const blockStyle = {
                        left: `${startPct}%`,
                        width: `${widthPct}%`,
                        top: `${top}px`,
                        height: `${BLOCK_H}px`,
                        background: shift.color + 'CC',
                        borderLeft: `3px solid ${shift.color}`,
                        borderRadius: '4px',
                        padding: '0 6px',
                      };
                      const blockTitle = `${shift.staffName}: ${shift.startTime} – ${shift.endTime} (${duration.toFixed(1)}h)`;
                      const blockInner = (
                        <>
                          <span className="text-white text-xs font-medium truncate">
                            {shift.staffName} ({shift.startTime}–{shift.endTime})
                          </span>
                          {singleStaffMode && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="absolute top-0.5 right-0.5 inline-flex items-center justify-center pointer-events-auto">
                                  <CheckCircle className="h-3.5 w-3.5" style={{ color: '#22c55e' }} />
                                </span>
                              </TooltipTrigger>
                              <TooltipContent
                                className="text-xs p-2 shadow-md"
                                style={{
                                  background: 'var(--kc-bg)',
                                  color: 'var(--kc-text-1)',
                                  border: '1px solid var(--kc-border)',
                                }}
                              >
                                Schedule approved
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </>
                      );

                      return readonly ? (
                        <div key={shift.staffId} className={blockClass} style={blockStyle} title={blockTitle}>
                          {blockInner}
                        </div>
                      ) : (
                        <Link
                          key={shift.staffId}
                          href={`/attendance/schedules/${shift.scheduleId}/edit`}
                          className={blockClass}
                          style={blockStyle}
                          title={blockTitle}
                        >
                          {blockInner}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Legend — what the open/close markers mean. */}
        {(openFrac != null || closeFrac != null) && (
          <div
            className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t pt-3 text-xs"
            style={{ borderColor: 'var(--kc-border)', color: 'var(--kc-text-2)' }}
          >
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 flex-none rounded-full bg-green-500" />
              Opening{centerOpenTime ? ` (${formatHM12(centerOpenTime)})` : ''}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 flex-none rounded-full bg-red-500" />
              Closing{centerCloseTime ? ` (${formatHM12(centerCloseTime)})` : ''}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================ DAY VIEW — vertical bars per staff

function DayView({
  schedules,
  date,
  startHour,
  endHour,
  readonly = false,
}: {
  schedules: ScheduleWithStaff[];
  date: Date;
  startHour: number;
  endHour: number;
  readonly?: boolean;
}) {
  const shifts = useMemo(() => buildShifts(schedules), [schedules]);
  const hours = Array.from({ length: endHour - startHour }, (_, i) => startHour + i);
  const dateStr = date.toLocaleDateString('en-CA');

  const uniqueStaff = useMemo(() => {
    const map = new Map<string, { id: string; name: string; color: string }>();
    for (const s of shifts) if (!map.has(s.staffId)) map.set(s.staffId, { id: s.staffId, name: s.staffName, color: s.color });
    return [...map.values()];
  }, [shifts]);

  const dayShifts = shifts.filter((s) => s.date === dateStr);

  return (
    <Card>
      {/* Multi-staff DayView keeps its full column width (legible names/times)
          and, below lg, becomes a horizontal scroll-snap track so the Director
          slides smoothly between staff columns on tablet/mobile. scroll-pl-60
          lands each snapped column just past the sticky hour gutter. Desktop
          (lg+) keeps its original free scroll — snap disabled. */}
      <CardContent className="pt-4 overflow-x-auto snap-x snap-mandatory scroll-pl-[60px] lg:snap-none">
        <div style={{ minWidth: `${60 + uniqueStaff.length * 140}px` }}>
          {/* Sticky header */}
          <div className="flex sticky top-0 z-10" style={{ background: 'var(--kc-bg)' }}>
            <div className="w-[60px] flex-none" />
            {uniqueStaff.map((staff) => (
              <div
                key={staff.id}
                className="text-center py-2 border-b border-l"
                style={{ borderColor: 'var(--kc-border)', flex: '1 1 0', minWidth: '140px' }}
              >
                <div className="text-xs font-medium truncate px-1" style={{ color: staff.color }}>
                  {staff.name}
                </div>
              </div>
            ))}
          </div>

          {/* Body */}
          <div className="flex">
            {/* Sticky hour labels */}
            <div className="w-[60px] flex-none sticky left-0 z-[5]" style={{ background: 'var(--kc-bg)' }}>
              {hours.map((h) => (
                <div
                  key={h}
                  className="text-[10px] text-right pr-2 pt-0.5"
                  style={{ height: `${HOUR_HEIGHT}px`, color: 'var(--kc-text-3)' }}
                >
                  {formatHourLabel(h)}
                </div>
              ))}
            </div>

            {/* Staff columns */}
            {uniqueStaff.map((staff) => {
              const shift = dayShifts.find((s) => s.staffId === staff.id);

              return (
                <div
                  key={staff.id}
                  className="relative border-l snap-start"
                  style={{ borderColor: 'var(--kc-border)', flex: '1 1 0', minWidth: '140px' }}
                >
                  {/* Hour grid lines */}
                  {hours.map((h) => (
                    <div
                      key={h}
                      className="border-t"
                      style={{ height: `${HOUR_HEIGHT}px`, borderColor: 'var(--kc-border)' }}
                    />
                  ))}

                  {/* Shift bar */}
                  {shift && (() => {
                    const top = (timeToHours(shift.startTime) - startHour) * HOUR_HEIGHT;
                    const height = (timeToHours(shift.endTime) - timeToHours(shift.startTime)) * HOUR_HEIGHT;
                    const duration = timeToHours(shift.endTime) - timeToHours(shift.startTime);
                    const barClass = `absolute left-1 right-1 overflow-hidden transition-shadow flex flex-col items-center justify-center text-center${readonly ? '' : ' hover:shadow-lg cursor-pointer'}`;
                    const barStyle = {
                      top: `${top}px`,
                      height: `${height}px`,
                      background: shift.color + 'D9',
                      borderLeft: `3px solid ${shift.color}`,
                      borderRadius: '4px',
                      padding: '4px 6px',
                    };
                    const barTitle = `${shift.staffName}: ${shift.startTime} – ${shift.endTime} (${duration.toFixed(1)}h)`;
                    const barInner = height >= 60 ? (
                      <div className="text-white text-xs leading-tight">
                        <div className="font-medium truncate">{shift.staffName}</div>
                        <div className="opacity-80">{shift.startTime} – {shift.endTime}</div>
                        <div className="opacity-60 mt-0.5">{duration.toFixed(1)}h</div>
                      </div>
                    ) : height >= 30 ? (
                      <div className="text-white text-xs font-medium truncate max-w-full">{shift.staffName}</div>
                    ) : null;

                    return readonly ? (
                      <div className={barClass} style={barStyle} title={barTitle}>
                        {barInner}
                      </div>
                    ) : (
                      <Link
                        href={`/attendance/schedules/${shift.scheduleId}/edit`}
                        className={barClass}
                        style={barStyle}
                        title={barTitle}
                      >
                        {barInner}
                      </Link>
                    );
                  })()}
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================ MONTH VIEW

function formatHM12(time: string): string {
  const [hStr, mStr] = time.split(':');
  const h = Number(hStr);
  const m = Number(mStr);
  const ampm = h < 12 ? 'am' : 'pm';
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${String(m).padStart(2, '0')}${ampm}`;
}

// "John Doe" → "JD". Single-word names → first two letters.
function staffInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function MonthView({
  schedules,
  year,
  month,
  onDayClick,
  singleStaffMode = false,
  compact = false,
}: {
  schedules: ScheduleWithStaff[];
  year: number;
  month: number;
  onDayClick: (date: Date) => void;
  singleStaffMode?: boolean;
  // Mobile-only (<640px): show compact initials-circles per day + a legend.
  // Desktop keeps the original first-name pills.
  compact?: boolean;
}) {
  const shifts = useMemo(() => buildShifts(schedules), [schedules]);

  // For single-staff mode we also need to know which days are explicitly OFF
  // (not just absent), so we build a per-date map covering BOTH work and off
  // days from the raw schedule.days. Director mode never uses this.
  // A single calendar day can have MULTIPLE work shifts (e.g. morning +
  // afternoon split scheduled via separate Schedule rows with different
  // startDate / dayOfWeek pairs that land on the same day). The map stores
  // an array per date so we can show all of them stacked in the cell.
  const dayInfoMap = useMemo(() => {
    if (!singleStaffMode) return null;
    type DayInfo = { works: Array<{ startTime: string; endTime: string }>; off: boolean };
    const map = new Map<string, DayInfo>();
    for (const sched of schedules) {
      const start = new Date(sched.startDate);
      for (const day of sched.days) {
        const d = new Date(start);
        d.setUTCDate(d.getUTCDate() + day.dayOfWeek - 1);
        const key = d.toISOString().split('T')[0];
        const existing = map.get(key) ?? { works: [], off: false };
        if (day.isOff) {
          existing.off = true;
        } else if (day.startTime && day.endTime) {
          existing.works.push({ startTime: day.startTime, endTime: day.endTime });
        }
        map.set(key, existing);
      }
    }
    return map;
  }, [schedules, singleStaffMode]);

  const weeks = useMemo(() => monthWeeks(year, month), [year, month]);

  const dayLookup = useMemo(() => {
    const map = new Map<string, Shift[]>();
    for (const s of shifts) { if (!map.has(s.date)) map.set(s.date, []); map.get(s.date)!.push(s); }
    return map;
  }, [shifts]);

  // Unique staff across this month's shifts → bottom legend (color + name).
  const legend = useMemo(() => {
    const m = new Map<string, { name: string; color: string }>();
    for (const s of shifts) if (!m.has(s.staffId)) m.set(s.staffId, { name: s.staffName, color: s.color });
    return [...m.values()];
  }, [shifts]);

  const todayStr = new Date().toLocaleDateString('en-CA');

  return (
    <Card>
      <CardContent className="pt-4">
        <div className="grid grid-cols-7 text-center mb-1">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
            <div key={d} className="text-xs font-medium py-1" style={{ color: 'var(--kc-text-3)' }}>{d}</div>
          ))}
        </div>

        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 border-t" style={{ borderColor: 'var(--kc-border)' }}>
            {week.map((date) => {
              const key = date.toLocaleDateString('en-CA');
              const isCurrentMonth = date.getMonth() === month;
              const isToday = key === todayStr;
              const isPast = !isToday && key < todayStr;
              const entries = dayLookup.get(key) ?? [];
              // Unique staff that day (a staff may have >1 shift) → one circle each.
              const uniqueStaff: Shift[] = [];
              const seenStaff = new Set<string>();
              for (const e of entries) if (!seenStaff.has(e.staffId)) { seenStaff.add(e.staffId); uniqueStaff.push(e); }
              const cellBg = isPast ? 'var(--kc-surface-2)' : 'transparent';

              const singleInfo = singleStaffMode ? dayInfoMap?.get(key) : null;
              const shiftCount = singleInfo?.works.length ?? 0;
              const cellMinHeight = shiftCount > 1 ? '120px' : '100px';
              return (
                <div
                  key={key}
                  // Staff mobile (My Schedule): stack the date number over the
                  // shift dots, centered. Director / desktop keep the original
                  // top-left block layout.
                  className={`p-1.5 border-r last:border-r-0 cursor-pointer transition-colors${singleStaffMode && compact ? ' flex flex-col items-center' : ''}`}
                  style={{ minHeight: cellMinHeight, borderColor: 'var(--kc-border)', background: cellBg, ...(isToday && { boxShadow: 'inset 0 0 0 2px var(--kc-p-600)' }) }}
                  onClick={() => onDayClick(date)}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--kc-surface-2)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = cellBg; }}
                >
                  {isToday ? (
                    <div className="text-xs font-bold mb-1.5 inline-flex items-center justify-center rounded-full" style={{ color: 'white', background: 'var(--kc-p-600)', width: '22px', height: '22px' }}>
                      {date.getDate()}
                    </div>
                  ) : (
                    <div className="text-xs font-medium mb-1.5" style={{ color: (isPast || !isCurrentMonth) ? 'var(--kc-text-3)' : 'var(--kc-text-1)' }}>
                      {date.getDate()}
                    </div>
                  )}
                  {singleStaffMode ? (
                    compact ? (
                      /* Mobile (My Schedule): the per-day time pills overflowed
                         the narrow phone cell, so scheduled days show colored
                         dots (one per shift) instead. The cell's onClick
                         (goToDay) opens the Day view for the full detail. Off /
                         empty days show just the date number. */
                      shiftCount > 0 ? (
                        // One colored dot per shift (chronological order), up to
                        // 3 then "+N" so the narrow phone cell never overflows.
                        // Colors match the Day detail via shiftDotColor(index).
                        <div className="flex items-center justify-center gap-1" style={isPast ? { opacity: 0.6 } : undefined}>
                          {[...(singleInfo?.works ?? [])]
                            .sort((a, b) => timeToHours(a.startTime) - timeToHours(b.startTime))
                            .slice(0, 3)
                            .map((w, i) => (
                              <span
                                key={i}
                                className="inline-block h-2 w-2 flex-none rounded-full"
                                style={{ background: shiftDotColor(i) }}
                                title={`${formatHM12(w.startTime)} – ${formatHM12(w.endTime)}`}
                              />
                            ))}
                          {shiftCount > 3 && (
                            <span className="text-[9px] font-semibold leading-none" style={{ color: 'var(--kc-text-3)' }}>
                              +{shiftCount - 3}
                            </span>
                          )}
                        </div>
                      ) : null
                    ) : !singleInfo ? null : shiftCount === 0 && singleInfo.off ? (
                      <div className="text-[11px]" style={{ color: 'var(--kc-text-3)', ...(isPast && { opacity: 0.6 }) }}>
                        Day Off
                      </div>
                    ) : shiftCount > 0 ? (
                      <div className="space-y-1" style={isPast ? { opacity: 0.6 } : undefined}>
                        {singleInfo.works.map((w, i) => {
                          const dur = timeToHours(w.endTime) - timeToHours(w.startTime);
                          const durLabel = dur % 1 === 0 ? `${dur}h` : `${dur.toFixed(1)}h`;
                          return (
                            <div
                              key={i}
                              className="rounded-md px-2 py-0.5"
                              style={{
                                background: 'color-mix(in oklch, var(--kc-p-600), transparent 85%)',
                                border: '1px solid color-mix(in oklch, var(--kc-p-600), transparent 70%)',
                                color: 'var(--kc-p-600)',
                              }}
                            >
                              <div className="text-[11px] font-medium leading-tight">
                                {formatHM12(w.startTime)} - {formatHM12(w.endTime)}
                              </div>
                              <div className="text-[11px] opacity-70">
                                {durLabel}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : null
                  ) : compact ? (
                    /* Mobile: compact initials-circles. */
                    <div className="flex flex-wrap gap-1" style={isPast ? { opacity: 0.6 } : undefined}>
                      {uniqueStaff.slice(0, 4).map((entry) => (
                        <span
                          key={entry.staffId}
                          className="inline-flex h-[18px] w-[18px] items-center justify-center rounded-full text-[8px] font-bold text-white"
                          style={{ background: entry.color }}
                          title={`${entry.staffName}: ${entry.startTime}–${entry.endTime}`}
                        >
                          {staffInitials(entry.staffName)}
                        </span>
                      ))}
                      {uniqueStaff.length > 4 && (
                        <span
                          className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[8px] font-bold"
                          style={{ background: 'var(--kc-surface-2)', color: 'var(--kc-text-2)' }}
                        >
                          +{uniqueStaff.length - 4}
                        </span>
                      )}
                    </div>
                  ) : (
                    /* Desktop: original first-name pills (unchanged). */
                    <div className="space-y-1">
                      {entries.map((entry, i) => (
                        <div
                          key={i}
                          className="text-[10px] leading-tight px-1.5 py-1 rounded truncate text-white font-medium border-l-[3px]"
                          style={{ background: entry.color + 'CC', borderLeftColor: entry.color, ...(isPast && { opacity: 0.5 }) }}
                          title={`${entry.staffName}: ${entry.startTime}–${entry.endTime}`}
                        >
                          {entry.staffName.split(' ')[0]}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}

        {/* Legend — who's who (color + initials → full name). Mobile director only. */}
        {compact && !singleStaffMode && legend.length > 0 && (
          <div
            className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 border-t pt-3"
            style={{ borderColor: 'var(--kc-border)' }}
          >
            {legend.map((s) => (
              <span key={s.name} className="inline-flex items-center gap-1.5 text-xs" style={{ color: 'var(--kc-text-2)' }}>
                <span
                  className="inline-flex h-[16px] w-[16px] items-center justify-center rounded-full text-[8px] font-bold text-white"
                  style={{ background: s.color }}
                >
                  {staffInitials(s.name)}
                </span>
                {s.name}
              </span>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================ SINGLE-STAFF DAY VIEW
// Horizontal week-style timeline restricted to one day — staff "My Schedule"
// uses this so the day view matches the week view's layout rather than the
// Director's per-staff vertical columns.

function SingleStaffDayView({
  schedules,
  date,
  startHour,
  endHour,
}: {
  schedules: ScheduleWithStaff[];
  date: Date;
  startHour: number;
  endHour: number;
}) {
  const BLOCK_H = 28;
  const LABEL_W = 70;

  const shifts = useMemo(() => buildShifts(schedules), [schedules]);
  const hours = Array.from({ length: endHour - startHour }, (_, i) => startHour + i);
  const numHours = hours.length;
  const dateStr = date.toLocaleDateString('en-CA');
  const todayStr = new Date().toLocaleDateString('en-CA');
  const isToday = dateStr === todayStr;

  const dayShifts = shifts.filter((s) => s.date === dateStr);

  // Is this day explicitly OFF in the staff's schedule? Look at days[] of any
  // schedule covering this date and check the matching dayOfWeek.
  const isOffDay = useMemo(() => {
    if (dayShifts.length > 0) return false;
    const jsDow = date.getDay();
    const isoDow = jsDow === 0 ? 7 : jsDow;
    for (const sched of schedules) {
      const start = new Date(sched.startDate);
      const end = new Date(sched.endDate);
      if (date < start || date > end) continue;
      const day = sched.days.find((d) => d.dayOfWeek === isoDow);
      if (day?.isOff) return true;
    }
    return false;
  }, [schedules, date, dayShifts]);

  const now = new Date();
  const nowFrac = (now.getHours() + now.getMinutes() / 60 - startHour) / numHours;
  const rowHeight = BLOCK_H + 24;

  return (
    <Card>
      <CardContent className="pt-4 overflow-auto">
        <div>
          {/* Sticky hour header */}
          <div className="flex sticky top-0 z-10" style={{ background: 'var(--kc-bg)' }}>
            <div
              className="flex-none sticky left-0 z-[15] border-b"
              style={{ width: `${LABEL_W}px`, background: 'var(--kc-bg)', borderColor: 'var(--kc-border)' }}
            />
            <div className="flex flex-1">
              {hours.map((h) => (
                <div
                  key={h}
                  className="flex-1 text-center text-[10px] py-2 border-l border-b"
                  style={{ borderColor: 'var(--kc-border)', color: 'var(--kc-text-3)' }}
                >
                  {formatHourLabel(h)}
                </div>
              ))}
            </div>
          </div>

          {/* Single day row */}
          <div className="relative">
            {isToday && nowFrac >= 0 && nowFrac <= 1 && (
              <div
                className="absolute top-0 bottom-0 z-20 pointer-events-none"
                style={{ left: `calc(${LABEL_W * (1 - nowFrac)}px + ${nowFrac * 100}%)` }}
              >
                <div className="flex flex-col items-center h-full">
                  <div className="w-2 h-2 rounded-full bg-red-500 flex-none" />
                  <div className="w-[2px] flex-1 bg-red-500" />
                </div>
              </div>
            )}

            <div
              className="flex border-t"
              style={{ borderColor: 'var(--kc-border)', minHeight: `${rowHeight}px` }}
            >
              <div
                className="flex-none sticky left-0 z-[5] flex flex-col items-center justify-center"
                style={{ width: `${LABEL_W}px`, background: 'var(--kc-bg)', borderRight: '1px solid var(--kc-border)' }}
              >
                <div className="text-[10px] uppercase font-medium" style={{ color: 'var(--kc-text-3)' }}>
                  {date.toLocaleDateString([], { weekday: 'short' })}
                </div>
                <div
                  className="text-sm font-semibold inline-flex items-center justify-center"
                  style={isToday
                    ? { color: 'white', background: 'var(--kc-p-600)', borderRadius: '50%', width: '24px', height: '24px' }
                    : { color: 'var(--kc-text-1)' }}
                >
                  {date.getDate()}
                </div>
              </div>

              <div className="flex-1 relative" style={{ minHeight: `${rowHeight}px` }}>
                {hours.map((_, i) => (
                  <div
                    key={i}
                    className="absolute top-0 bottom-0 border-l"
                    style={{ left: `${(i / numHours) * 100}%`, borderColor: 'var(--kc-border)' }}
                  />
                ))}

                {dayShifts.map((shift) => {
                  const startPct = ((timeToHours(shift.startTime) - startHour) / numHours) * 100;
                  const widthPct = ((timeToHours(shift.endTime) - timeToHours(shift.startTime)) / numHours) * 100;
                  const duration = timeToHours(shift.endTime) - timeToHours(shift.startTime);
                  return (
                    <div
                      key={shift.staffId}
                      className="absolute flex items-center overflow-hidden"
                      style={{
                        left: `${startPct}%`,
                        width: `${widthPct}%`,
                        top: '12px',
                        height: `${BLOCK_H}px`,
                        background: shift.color + 'CC',
                        borderLeft: `3px solid ${shift.color}`,
                        borderRadius: '4px',
                        padding: '0 6px',
                      }}
                      title={`${shift.startTime} – ${shift.endTime} (${duration.toFixed(1)}h)`}
                    >
                      <span className="text-white text-xs font-medium truncate">
                        {shift.startTime}–{shift.endTime} ({duration.toFixed(1)}h)
                      </span>
                    </div>
                  );
                })}

                {dayShifts.length === 0 && isOffDay && (
                  <div className="absolute inset-0 flex items-center justify-center text-xs" style={{ color: 'var(--kc-text-3)' }}>
                    Day Off
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================ MOBILE VIEWS (<640px)
// Compact, list-based renders so the calendar never scrolls horizontally on a
// phone. Desktop/tablet (>=640px) keep the timeline/grid views above. All three
// reuse buildShifts() so the data shape is identical.

function monthWeeks(year: number, month: number): Date[][] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const jsDay = firstDay.getDay();
  const startOffset = jsDay === 0 ? 6 : jsDay - 1;
  const start = new Date(firstDay);
  start.setDate(start.getDate() - startOffset);
  const result: Date[][] = [];
  const cursor = new Date(start);
  while (cursor <= lastDay || result.length === 0 || cursor.getDay() !== 1) {
    if (cursor.getDay() === 1 || result.length === 0) result.push([]);
    result[result.length - 1].push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
    if (result[result.length - 1].length === 7 && cursor > lastDay && cursor.getDay() === 1) break;
  }
  return result;
}

function ShiftRow({ shift, color }: { shift: Shift; color?: string }) {
  // `color` overrides the staff color — My Schedule passes a per-shift accent
  // so each row matches its Month dot. Director rows fall back to shift.color.
  const accent = color ?? shift.color;
  return (
    <div
      className="flex items-center justify-between gap-3 rounded-md border p-3"
      style={{ borderColor: 'var(--kc-border)', borderLeft: `3px solid ${accent}` }}
    >
      <span className="flex min-w-0 items-center gap-2">
        <span className="h-2 w-2 flex-none rounded-full" style={{ background: accent }} />
        <span className="truncate text-sm font-medium" style={{ color: 'var(--kc-text-1)' }}>
          {shift.staffName}
        </span>
      </span>
      <span className="flex-none text-sm tabular-nums" style={{ color: 'var(--kc-text-2)' }}>
        {shift.startTime}–{shift.endTime}
      </span>
    </div>
  );
}

function MobileDayView({
  schedules,
  date,
  singleStaffMode = false,
}: {
  schedules: ScheduleWithStaff[];
  date: Date;
  singleStaffMode?: boolean;
}) {
  const shifts = useMemo(() => buildShifts(schedules), [schedules]);
  const dateStr = date.toLocaleDateString('en-CA');
  const dayShifts = shifts
    .filter((s) => s.date === dateStr)
    .sort((a, b) => timeToHours(a.startTime) - timeToHours(b.startTime));
  return (
    <Card>
      <CardContent className="space-y-2 pt-4">
        {dayShifts.length === 0 ? (
          <p className="py-8 text-center text-sm" style={{ color: 'var(--kc-text-3)' }}>
            No staff scheduled
          </p>
        ) : (
          // My Schedule (singleStaffMode): every row is the same staff, so color
          // each shift by its chronological index to mirror the Month dot. The
          // Director view keeps the per-staff color. Key includes startTime so
          // multiple same-staff shifts in one day don't collide.
          dayShifts.map((s, i) => (
            <ShiftRow
              key={`${s.staffId}-${s.startTime}`}
              shift={s}
              color={singleStaffMode ? shiftDotColor(i) : undefined}
            />
          ))
        )}
      </CardContent>
    </Card>
  );
}

// ============================================ MAIN EXPORT

export function ScheduleCalendar({
  schedules,
  centerOpenTime,
  centerCloseTime,
  readonly = false,
  singleStaffMode = false,
}: {
  schedules: ScheduleWithStaff[];
  centerOpenTime?: string;
  centerCloseTime?: string;
  // When true, shift blocks render as plain divs instead of edit links —
  // used by the staff "My Schedule" view, which is read-only.
  readonly?: boolean;
  // When true, month cells show the day's hours/totals (or "Day Off") instead
  // of staff name pills, and the day view becomes a horizontal week-style
  // timeline for the single staff member. Director-facing views never set this.
  singleStaffMode?: boolean;
}) {
  const [view, setView] = useState<ViewMode>('week');
  const [offset, setOffset] = useState(0);

  const openH = centerOpenTime ? Math.floor(timeToHours(centerOpenTime)) : 7;
  const closeH = centerCloseTime ? Math.ceil(timeToHours(centerCloseTime)) + 1 : 21;
  const startHour = Math.max(0, openH - 1);
  const endHour = Math.min(24, closeH);

  const { weekStart, dateForDay, year, month, navLabel } = useMemo(() => {
    const now = new Date();
    if (view === 'month') {
      const d = new Date(now.getFullYear(), now.getMonth() + offset, 1);
      return { weekStart: now, dateForDay: now, year: d.getFullYear(), month: d.getMonth(), navLabel: d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }).toUpperCase() };
    }
    if (view === 'week') {
      const d = new Date(now); d.setDate(d.getDate() + offset * 7);
      const jsDay = d.getDay(); d.setDate(d.getDate() + (jsDay === 0 ? -6 : 1 - jsDay));
      const end = new Date(d); end.setDate(end.getDate() + 6);
      return { weekStart: d, dateForDay: now, year: 0, month: 0, navLabel: `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase()} – ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase()}` };
    }
    const d = new Date(now); d.setDate(d.getDate() + offset);
    return { weekStart: now, dateForDay: d, year: 0, month: 0, navLabel: d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).toUpperCase() };
  }, [view, offset]);

  const goToDay = (date: Date) => {
    // Normalize BOTH sides to local midnight before diffing. The previous
    // version subtracted "now (with current hour)" from "clicked date (at
    // local midnight)", so a click on tomorrow at e.g. 2pm produced a diff
    // of ~10 hours → Math.round → 0 → offset stayed on today.
    const now = new Date();
    const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const clickedMidnight = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const diffDays = Math.round((clickedMidnight.getTime() - todayMidnight.getTime()) / 86_400_000);
    setView('day'); setOffset(diffDays);
  };

  return (
    <div className="space-y-3">
      {/* FIX 1: Title with arrows immediately on sides */}
      <div className="flex items-center justify-center gap-3">
        <Button variant="outline" size="icon-xs" onClick={() => setOffset((o) => o - 1)}>
          <ChevronLeft className="h-3.5 w-3.5" />
        </Button>
        <p className="text-lg font-semibold tracking-wide uppercase" style={{ color: 'var(--kc-text-1)' }}>
          {navLabel}
        </p>
        <Button variant="outline" size="icon-xs" onClick={() => setOffset((o) => o + 1)}>
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* View toggle */}
      <div className="flex justify-end">
        <div className="flex gap-1">
          {(['month', 'week', 'day'] as ViewMode[]).map((v) => (
            <Button key={v} variant={view === v ? 'default' : 'outline'} size="sm" onClick={() => { setView(v); setOffset(0); }}>
              {v === 'month' && <CalendarDays className="mr-1.5 h-3.5 w-3.5" />}
              {v === 'week' && <Clock className="mr-1.5 h-3.5 w-3.5" />}
              {v === 'day' && <User className="mr-1.5 h-3.5 w-3.5" />}
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </Button>
          ))}
        </div>
      </div>

      {/* Month + Week: same view on all sizes (the Month cells use compact
          initials-circles so they fit on phones too). Day: timeline on
          desktop/tablet, vertical list on phones (<640px). */}
      {view === 'month' && (
        <>
          {/* Desktop/tablet: original month (first-name pills, no legend). */}
          <div className="hidden sm:block">
            <MonthView schedules={schedules} year={year} month={month} onDayClick={goToDay} singleStaffMode={singleStaffMode} />
          </div>
          {/* Mobile: compact initials-circles + legend. */}
          <div className="sm:hidden">
            <MonthView schedules={schedules} year={year} month={month} onDayClick={goToDay} singleStaffMode={singleStaffMode} compact />
          </div>
        </>
      )}
      {view === 'week' && <WeekView schedules={schedules} weekStart={weekStart} startHour={startHour} endHour={endHour} centerOpenTime={centerOpenTime} centerCloseTime={centerCloseTime} readonly={readonly} singleStaffMode={singleStaffMode} />}
      {view === 'day' && (
        <>
          <div className="hidden sm:block">
            {singleStaffMode
              ? <SingleStaffDayView schedules={schedules} date={dateForDay} startHour={startHour} endHour={endHour} />
              : <DayView schedules={schedules} date={dateForDay} startHour={startHour} endHour={endHour} readonly={readonly} />}
          </div>
          <div className="sm:hidden">
            <MobileDayView schedules={schedules} date={dateForDay} singleStaffMode={singleStaffMode} />
          </div>
        </>
      )}
    </div>
  );
}
