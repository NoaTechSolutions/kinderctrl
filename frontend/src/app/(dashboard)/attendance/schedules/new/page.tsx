'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Calendar,
  CalendarDays,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  Copy,
  Loader2,
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScheduleForm } from '@/components/attendance/schedule-form';
import { useStaff } from '@/lib/hooks/use-staff';
import { useCreateSchedule } from '@/lib/hooks/use-attendance';

type CreationType = 'specific' | 'single' | 'range' | 'month';

interface SpecificDayConfig {
  date: string;
  startTime: string;
  endTime: string;
  isOff: boolean;
}

function getNextMonday() {
  const d = new Date();
  const day = d.getDay();
  const diff = day === 0 ? 1 : day === 1 ? 0 : 8 - day;
  d.setDate(d.getDate() + diff);
  return d.toLocaleDateString('en-CA');
}

function getMondaysForMonth(dateStr: string): string[] {
  const d = new Date(dateStr + 'T12:00:00');
  const year = d.getFullYear();
  const month = d.getMonth();
  const mondays: string[] = [];
  const cursor = new Date(year, month, 1);
  while (cursor.getMonth() === month) {
    if (cursor.getDay() === 1) mondays.push(cursor.toLocaleDateString('en-CA'));
    cursor.setDate(cursor.getDate() + 1);
  }
  return mondays;
}

function addWeeks(dateStr: string, weeks: number): string {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() + 7 * weeks);
  return d.toLocaleDateString('en-CA');
}

function getMondaysBetween(from: string, to: string): string[] {
  const mondays: string[] = [];
  let cursor = from;
  while (cursor <= to) {
    mondays.push(cursor);
    cursor = addWeeks(cursor, 1);
  }
  return mondays;
}

function getMonday(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  const jsDay = d.getDay();
  d.setDate(d.getDate() - (jsDay === 0 ? 6 : jsDay - 1));
  return d.toLocaleDateString('en-CA');
}

const inputCls = 'h-9 rounded-md border px-3 text-sm w-full';
const inputStyle = { borderColor: 'var(--kc-border)', background: 'var(--kc-bg)', color: 'var(--kc-text-1)' } as const;
const timeInputCls = 'h-8 rounded-md border px-2 text-sm tabular-nums';

function DateMultiPicker({ selected, onToggle }: { selected: string[]; onToggle: (date: string) => void }) {
  const [viewDate, setViewDate] = useState(() => new Date());
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const todayStr = new Date().toLocaleDateString('en-CA');

  const cells = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startOffset = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
    const result: (Date | null)[] = [];
    for (let i = 0; i < startOffset; i++) result.push(null);
    for (let d = 1; d <= lastDay.getDate(); d++) result.push(new Date(year, month, d));
    return result;
  }, [year, month]);

  const selectedSet = new Set(selected);

  return (
    <div className="max-w-[280px]">
      <div className="flex items-center justify-between mb-2">
        <Button type="button" variant="ghost" size="icon-xs" onClick={() => setViewDate(new Date(year, month - 1, 1))}>
          <ChevronLeft className="h-3.5 w-3.5" />
        </Button>
        <span className="text-sm font-medium" style={{ color: 'var(--kc-text-1)' }}>
          {viewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </span>
        <Button type="button" variant="ghost" size="icon-xs" onClick={() => setViewDate(new Date(year, month + 1, 1))}>
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center">
        {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map((d) => (
          <div key={d} className="text-[10px] font-medium py-0.5" style={{ color: 'var(--kc-text-3)' }}>{d}</div>
        ))}
        {cells.map((day, i) => {
          if (!day) return <div key={`e-${i}`} />;
          const key = day.toLocaleDateString('en-CA');
          const isPast = key < todayStr;
          const isSelected = selectedSet.has(key);
          const isToday = key === todayStr;
          return (
            <button
              key={key}
              type="button"
              disabled={isPast}
              className="text-xs rounded-md p-1.5 transition-colors"
              style={{
                background: isSelected ? 'var(--kc-p-600)' : 'transparent',
                color: isSelected ? 'white' : isPast ? 'var(--kc-text-3)' : 'var(--kc-text-1)',
                opacity: isPast ? 0.4 : 1,
                fontWeight: isToday ? 700 : 400,
              }}
              onClick={() => onToggle(key)}
            >
              {day.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function NewSchedulePage() {
  const router = useRouter();
  const { data: staffData } = useStaff({ limit: 100 });
  const create = useCreateSchedule();

  const [staffId, setStaffId] = useState('');
  const [creationType, setCreationType] = useState<CreationType>('single');
  const [submitting, setSubmitting] = useState(false);

  const [weekStart, setWeekStart] = useState(getNextMonday);
  const [rangeStart, setRangeStart] = useState(getNextMonday);
  const [rangeEnd, setRangeEnd] = useState(() => addWeeks(getNextMonday(), 2));
  const [specificDays, setSpecificDays] = useState<SpecificDayConfig[]>([]);

  const selectedStaff = staffData?.data.find((s) => s.id === staffId);

  const toggleDate = (dateStr: string) => {
    setSpecificDays((prev) => {
      if (prev.find((d) => d.date === dateStr)) return prev.filter((d) => d.date !== dateStr);
      return [...prev, { date: dateStr, startTime: '08:00', endTime: '16:00', isOff: false }].sort((a, b) => a.date.localeCompare(b.date));
    });
  };

  const updateSpecificDay = (date: string, patch: Partial<SpecificDayConfig>) => {
    setSpecificDays((prev) => prev.map((d) => (d.date === date ? { ...d, ...patch } : d)));
  };

  const applyToAll = () => {
    if (specificDays.length === 0) return;
    const first = specificDays[0];
    setSpecificDays((prev) => prev.map((d) => ({ ...d, startTime: first.startTime, endTime: first.endTime })));
  };

  const weeksToCreate = (): string[] => {
    switch (creationType) {
      case 'single': return [weekStart];
      case 'range': return getMondaysBetween(rangeStart, rangeEnd);
      case 'month': return getMondaysForMonth(weekStart);
      case 'specific': return [];
    }
  };

  const handleFormSubmit = async (days: Parameters<typeof create.mutateAsync>[0]['days']) => {
    if (!staffId) { toast.error('Select a staff member'); return; }
    const mondays = weeksToCreate();
    if (mondays.length === 0) { toast.error('No weeks to create'); return; }

    setSubmitting(true);
    let created = 0;
    let skipped = 0;

    for (const monday of mondays) {
      try {
        await create.mutateAsync({ staffId, weekStart: monday, days });
        created++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : '';
        if (msg.includes('already exists')) skipped++;
        else { toast.error(`Week ${monday}: ${msg}`); setSubmitting(false); return; }
      }
    }

    setSubmitting(false);
    toast.success(skipped > 0 ? `Created ${created} schedule(s), skipped ${skipped} (already exist)` : `Created ${created} schedule(s)`);
    router.push('/attendance/schedules');
  };

  const handleSpecificSubmit = async () => {
    if (!staffId) { toast.error('Select a staff member'); return; }
    const activeDays = specificDays.filter((d) => !d.isOff);
    if (activeDays.length === 0) { toast.error('Select at least one day'); return; }

    const weekMap = new Map<string, SpecificDayConfig[]>();
    for (const sd of activeDays) {
      const monday = getMonday(sd.date);
      if (!weekMap.has(monday)) weekMap.set(monday, []);
      weekMap.get(monday)!.push(sd);
    }

    setSubmitting(true);
    let created = 0;
    let skipped = 0;

    for (const [monday, daysInWeek] of weekMap) {
      const days = [1, 2, 3, 4, 5, 6, 7].map((dow) => {
        const dayDate = new Date(monday + 'T12:00:00');
        dayDate.setDate(dayDate.getDate() + dow - 1);
        const dateStr = dayDate.toLocaleDateString('en-CA');
        const config = daysInWeek.find((d) => d.date === dateStr);
        return {
          dayOfWeek: dow,
          startTime: config?.startTime,
          endTime: config?.endTime,
          isOff: !config,
        };
      });

      try {
        await create.mutateAsync({ staffId, weekStart: monday, days });
        created++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : '';
        if (msg.includes('already exists')) skipped++;
        else { toast.error(`Week ${monday}: ${msg}`); setSubmitting(false); return; }
      }
    }

    setSubmitting(false);
    toast.success(skipped > 0 ? `Created ${created} schedule(s), skipped ${skipped} (already exist)` : `Created ${created} schedule(s)`);
    router.push('/attendance/schedules');
  };

  const typeOptions: { value: CreationType; label: string; desc: string; icon: typeof Calendar }[] = [
    { value: 'specific', label: 'Specific Days', desc: 'Pick individual dates with custom hours', icon: CalendarDays },
    { value: 'single', label: 'Single Week', desc: 'Create schedule for one week', icon: Calendar },
    { value: 'range', label: 'Week Range', desc: 'Same schedule for a range of weeks', icon: CalendarRange },
    { value: 'month', label: 'Full Month', desc: 'Apply to all weeks in the month', icon: CalendarRange },
  ];

  const weekCount = weeksToCreate().length;

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link href="/attendance/schedules"><ArrowLeft className="mr-1 h-4 w-4" /> Back</Link>
        </Button>
      </div>

      <div>
        <h1 className="font-display text-2xl font-semibold">Create Schedule</h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--kc-text-3)' }}>
          Assign weekly work hours to a staff member
        </p>
      </div>

      {/* Step 1: Type — FIX 3 active style + FIX 4 new types */}
      <Card>
        <CardContent className="pt-4">
          <p className="text-sm font-medium mb-3" style={{ color: 'var(--kc-text-1)' }}>Schedule type</p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {typeOptions.map((opt) => {
              const Icon = opt.icon;
              const selected = creationType === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  className="flex flex-col items-start gap-1 rounded-lg text-left transition-colors"
                  style={{
                    border: selected ? '2px solid var(--kc-p-600)' : '1px solid var(--kc-border)',
                    background: selected ? 'color-mix(in srgb, var(--kc-p-600) 10%, transparent)' : 'var(--kc-bg)',
                    padding: selected ? '11px' : '12px',
                  }}
                  onClick={() => setCreationType(opt.value)}
                >
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4" style={{ color: selected ? 'var(--kc-p-600)' : 'var(--kc-text-3)' }} />
                    <span className="text-sm font-medium" style={{ color: 'var(--kc-text-1)' }}>{opt.label}</span>
                  </div>
                  <span className="text-xs" style={{ color: 'var(--kc-text-3)' }}>{opt.desc}</span>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Step 2: Staff + Date config */}
      {creationType === 'specific' ? (
        <div>
          <label className="text-sm font-medium" style={{ color: 'var(--kc-text-1)' }}>Staff Member</label>
          <select value={staffId} onChange={(e) => setStaffId(e.target.value)} className={inputCls} style={inputStyle}>
            <option value="">Select staff...</option>
            {staffData?.data.filter((s) => s.status === 'ACTIVE').map((s) => (
              <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>
            ))}
          </select>
        </div>
      ) : creationType === 'range' ? (
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="text-sm font-medium" style={{ color: 'var(--kc-text-1)' }}>Staff Member</label>
            <select value={staffId} onChange={(e) => setStaffId(e.target.value)} className={inputCls} style={inputStyle}>
              <option value="">Select staff...</option>
              {staffData?.data.filter((s) => s.status === 'ACTIVE').map((s) => (
                <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium" style={{ color: 'var(--kc-text-1)' }}>From Week (Monday)</label>
            <input type="date" value={rangeStart} onChange={(e) => setRangeStart(e.target.value)} className={inputCls} style={inputStyle} />
          </div>
          <div>
            <label className="text-sm font-medium" style={{ color: 'var(--kc-text-1)' }}>To Week (Monday)</label>
            <input type="date" value={rangeEnd} onChange={(e) => setRangeEnd(e.target.value)} className={inputCls} style={inputStyle} />
          </div>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-sm font-medium" style={{ color: 'var(--kc-text-1)' }}>Staff Member</label>
            <select value={staffId} onChange={(e) => setStaffId(e.target.value)} className={inputCls} style={inputStyle}>
              <option value="">Select staff...</option>
              {staffData?.data.filter((s) => s.status === 'ACTIVE').map((s) => (
                <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium" style={{ color: 'var(--kc-text-1)' }}>
              {creationType === 'month' ? 'Month (pick any date)' : 'Week Starting (Monday)'}
            </label>
            <input type="date" value={weekStart} onChange={(e) => setWeekStart(e.target.value)} className={inputCls} style={inputStyle} />
          </div>
        </div>
      )}

      {/* Preview for multi-week types */}
      {creationType === 'range' && weekCount > 0 && (
        <p className="text-xs" style={{ color: 'var(--kc-text-3)' }}>
          {weekCount} week{weekCount > 1 ? 's' : ''} selected: {weeksToCreate().join(', ')} — existing weeks will be skipped.
        </p>
      )}
      {creationType === 'month' && weekCount > 0 && (
        <p className="text-xs" style={{ color: 'var(--kc-text-3)' }}>
          Will create {weekCount} schedule(s): {weeksToCreate().join(', ')} — existing weeks will be skipped.
        </p>
      )}

      {/* Step 3: Days config */}
      {creationType === 'specific' ? (
        <Card>
          <CardContent className="pt-4 space-y-4">
            <p className="text-sm font-medium" style={{ color: 'var(--kc-text-1)' }}>Select dates</p>
            <DateMultiPicker selected={specificDays.map((d) => d.date)} onToggle={toggleDate} />

            {specificDays.length > 0 && (
              <>
                <div className="flex items-center justify-between pt-3 border-t" style={{ borderColor: 'var(--kc-border)' }}>
                  <p className="text-sm font-medium" style={{ color: 'var(--kc-text-1)' }}>
                    {specificDays.length} day{specificDays.length > 1 ? 's' : ''} selected
                  </p>
                  {specificDays.length > 1 && (
                    <Button type="button" variant="outline" size="sm" onClick={applyToAll}>
                      <Copy className="mr-1.5 h-3 w-3" /> Apply first to all
                    </Button>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="grid grid-cols-[1fr_100px_100px_40px] gap-2 text-xs font-medium" style={{ color: 'var(--kc-text-3)' }}>
                    <span>Day</span><span>Start</span><span>End</span><span className="text-center">OFF</span>
                  </div>
                  {specificDays.map((sd) => {
                    const d = new Date(sd.date + 'T12:00:00');
                    return (
                      <div key={sd.date} className="grid grid-cols-[1fr_100px_100px_40px] gap-2 items-center">
                        <span className="text-sm" style={{ color: sd.isOff ? 'var(--kc-text-3)' : 'var(--kc-text-1)' }}>
                          {d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                        </span>
                        {sd.isOff ? (
                          <>
                            <span className="text-xs text-center" style={{ color: 'var(--kc-text-3)' }}>—</span>
                            <span className="text-xs text-center" style={{ color: 'var(--kc-text-3)' }}>—</span>
                          </>
                        ) : (
                          <>
                            <input type="time" value={sd.startTime} onChange={(e) => updateSpecificDay(sd.date, { startTime: e.target.value })} className={timeInputCls} style={inputStyle} />
                            <input type="time" value={sd.endTime} onChange={(e) => updateSpecificDay(sd.date, { endTime: e.target.value })} className={timeInputCls} style={inputStyle} />
                          </>
                        )}
                        <div className="flex justify-center">
                          <input type="checkbox" checked={sd.isOff} onChange={(e) => updateSpecificDay(sd.date, { isOff: e.target.checked })} className="h-4 w-4 rounded border-gray-300" />
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex justify-end pt-3 border-t" style={{ borderColor: 'var(--kc-border)' }}>
                  <Button onClick={handleSpecificSubmit} disabled={submitting}>
                    {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {submitting ? 'Creating...' : `Save ${specificDays.filter((d) => !d.isOff).length} Day(s)`}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      ) : (
        <ScheduleForm
          staffName={selectedStaff ? `${selectedStaff.firstName} ${selectedStaff.lastName}` : undefined}
          weekLabel={
            creationType === 'single'
              ? `Week of ${weekStart}`
              : `${weekCount} weeks starting ${creationType === 'range' ? rangeStart : weekStart}`
          }
          submitLabel={
            submitting
              ? 'Creating...'
              : creationType === 'single'
                ? 'Save Schedule'
                : `Create ${weekCount} Schedules`
          }
          onSubmit={handleFormSubmit}
          isPending={submitting}
        />
      )}
    </div>
  );
}
