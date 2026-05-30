'use client';

import { useState, useMemo } from 'react';
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { ScheduleDay } from '@/lib/api/attendance';

const DAYS = [
  { iso: 1, name: 'Monday' },
  { iso: 2, name: 'Tuesday' },
  { iso: 3, name: 'Wednesday' },
  { iso: 4, name: 'Thursday' },
  { iso: 5, name: 'Friday' },
  { iso: 6, name: 'Saturday' },
  { iso: 7, name: 'Sunday' },
];

interface DayInput {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isOff: boolean;
}

function dayHours(d: DayInput) {
  if (d.isOff || !d.startTime || !d.endTime) return 0;
  const [sh, sm] = d.startTime.split(':').map(Number);
  const [eh, em] = d.endTime.split(':').map(Number);
  return Math.max(0, (eh + em / 60) - (sh + sm / 60));
}

const inputCls = 'h-9 rounded-md border px-2 text-sm tabular-nums w-full';
const inputStyle = { borderColor: 'var(--kc-border)', background: 'var(--kc-bg)', color: 'var(--kc-text-1)' };

export function ScheduleForm({
  initialDays,
  staffName,
  weekLabel,
  submitLabel,
  onSubmit,
  isPending,
  readonly,
}: {
  initialDays?: ScheduleDay[];
  staffName?: string;
  weekLabel?: string;
  submitLabel: string;
  onSubmit: (days: DayInput[]) => void;
  isPending: boolean;
  readonly?: boolean;
}) {
  const [days, setDays] = useState<DayInput[]>(() => {
    if (initialDays?.length) {
      return DAYS.map((d) => {
        const existing = initialDays.find((e) => e.dayOfWeek === d.iso);
        return existing
          ? { dayOfWeek: d.iso, startTime: existing.startTime ?? '', endTime: existing.endTime ?? '', isOff: existing.isOff }
          : { dayOfWeek: d.iso, startTime: '08:00', endTime: '16:00', isOff: d.iso >= 6 };
      });
    }
    return DAYS.map((d) => ({
      dayOfWeek: d.iso,
      startTime: '08:00',
      endTime: '16:00',
      isOff: d.iso >= 6,
    }));
  });

  const updateDay = (iso: number, patch: Partial<DayInput>) => {
    setDays((prev) => prev.map((d) => (d.dayOfWeek === iso ? { ...d, ...patch } : d)));
  };

  const totalHours = useMemo(() => days.reduce((s, d) => s + dayHours(d), 0), [days]);

  return (
    <Card>
      {(staffName || weekLabel) && (
        <CardHeader>
          <CardTitle className="text-base">
            {staffName && <>{staffName} — </>}
            {weekLabel}
          </CardTitle>
        </CardHeader>
      )}
      <CardContent className="space-y-3">
        {/* Header row */}
        <div className="grid grid-cols-[120px_1fr_1fr_60px_50px] gap-2 text-xs font-medium" style={{ color: 'var(--kc-text-3)' }}>
          <span>Day</span>
          <span>Start</span>
          <span>End</span>
          <span className="text-center">Hours</span>
          <span className="text-center">OFF</span>
        </div>

        {days.map((d) => {
          const dayInfo = DAYS.find((dd) => dd.iso === d.dayOfWeek)!;
          const hours = dayHours(d);
          return (
            <div
              key={d.dayOfWeek}
              className="grid grid-cols-[120px_1fr_1fr_60px_50px] gap-2 items-center"
            >
              <span
                className="text-sm font-medium"
                style={{ color: d.isOff ? 'var(--kc-text-3)' : 'var(--kc-text-1)' }}
              >
                {dayInfo.name}
              </span>
              {d.isOff ? (
                <>
                  <span className="text-xs text-center" style={{ color: 'var(--kc-text-3)' }}>—</span>
                  <span className="text-xs text-center" style={{ color: 'var(--kc-text-3)' }}>—</span>
                </>
              ) : (
                <>
                  <input
                    type="time"
                    value={d.startTime}
                    onChange={(e) => updateDay(d.dayOfWeek, { startTime: e.target.value })}
                    disabled={readonly}
                    className={inputCls}
                    style={inputStyle}
                  />
                  <input
                    type="time"
                    value={d.endTime}
                    onChange={(e) => updateDay(d.dayOfWeek, { endTime: e.target.value })}
                    disabled={readonly}
                    className={inputCls}
                    style={inputStyle}
                  />
                </>
              )}
              <span
                className="text-sm text-center tabular-nums"
                style={{ color: hours > 0 ? 'var(--kc-text-1)' : 'var(--kc-text-3)' }}
              >
                {hours > 0 ? `${hours.toFixed(1)}` : '—'}
              </span>
              <div className="flex justify-center">
                <input
                  type="checkbox"
                  checked={d.isOff}
                  onChange={(e) => updateDay(d.dayOfWeek, { isOff: e.target.checked })}
                  disabled={readonly}
                  className="h-4 w-4 rounded border-gray-300"
                />
              </div>
            </div>
          );
        })}

        {/* Total */}
        <div
          className="flex justify-between items-center pt-3 border-t"
          style={{ borderColor: 'var(--kc-border)' }}
        >
          <span className="text-sm font-semibold" style={{ color: 'var(--kc-text-1)' }}>
            Total: {totalHours.toFixed(1)}h / week
          </span>
          {!readonly && (
            <Button
              onClick={() => onSubmit(days.filter((d) => !d.isOff || d.isOff))}
              disabled={isPending}
            >
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {submitLabel}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
