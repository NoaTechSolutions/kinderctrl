'use client';

import Link from 'next/link';
import { Calendar, CalendarDays, Clock, FileEdit, Loader2 } from 'lucide-react';
import { useTimeFormat } from '@/lib/preferences/time-format';
import { formatTime as fmtTimeUtil } from '@/lib/format-time';
import { toast } from 'sonner';
import { CardWithHeader } from '@/components/ui/card-with-header';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/auth';
import {
  useMyToday,
  usePunch,
  useMyHistory,
  useMyCorrections,
  useMySchedule,
} from '@/lib/hooks/use-attendance';
import { AttendanceSkeleton } from '@/components/skeletons/attendance-skeleton';
import { AttendanceHistorySection } from '@/components/attendance/attendance-history-section';
import type { StaffTimeEntry, HistoryDay, Schedule } from '@/lib/api/attendance';

const ACTION_CONFIG = {
  CLOCK_IN: { label: 'Clock In', variant: 'default' as const },
  BREAK_IN: { label: 'Start Break', variant: 'outline' as const },
  BREAK_OUT: { label: 'End Break', variant: 'outline' as const },
  CLOCK_OUT: { label: 'Clock Out', variant: 'destructive' as const },
} as const;

function EntryRow({ entry, tf }: { entry: StaffTimeEntry; tf: '12h' | '24h' }) {
  const labels: Record<string, string> = {
    CLOCK_IN: 'Clock In',
    BREAK_IN: 'Break Start',
    BREAK_OUT: 'Break End',
    CLOCK_OUT: 'Clock Out',
  };
  return (
    <div
      className="flex items-center justify-between py-2 px-3 rounded-md"
      style={{ background: 'var(--kc-surface-2)' }}
    >
      <span className="text-sm font-medium" style={{ color: 'var(--kc-text-1)' }}>
        {labels[entry.type]}
      </span>
      <span className="text-sm tabular-nums" style={{ color: 'var(--kc-text-2)' }}>
        {fmtTimeUtil(entry.deviceTimestamp, tf)}
      </span>
    </div>
  );
}

function getPosition(): Promise<{ latitude: number; longitude: number } | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        }),
      () => resolve(null),
      { timeout: 5000, maximumAge: 60000 },
    );
  });
}

// Worked hours for a set of history days: (clockOut - clockIn - break) summed.
// Mirrors the calculation on the My History page.
function sumWorkedHours(days: HistoryDay[] | undefined): number {
  return (days ?? []).reduce((sum, day) => {
    const ci = day.entries.find((e) => e.type === 'CLOCK_IN');
    const co = day.entries.find((e) => e.type === 'CLOCK_OUT');
    if (!ci || !co) return sum;
    const bi = day.entries.find((e) => e.type === 'BREAK_IN');
    const bo = day.entries.find((e) => e.type === 'BREAK_OUT');
    const brk = bi && bo
      ? new Date(bo.deviceTimestamp).getTime() - new Date(bi.deviceTimestamp).getTime()
      : 0;
    return sum + (new Date(co.deviceTimestamp).getTime() - new Date(ci.deviceTimestamp).getTime() - brk) / 3_600_000;
  }, 0);
}

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function thisWeekRange(): { from: string; to: string } {
  const monday = new Date();
  const dow = monday.getDay();
  monday.setDate(monday.getDate() - (dow === 0 ? 6 : dow - 1));
  const sunday = new Date(monday);
  sunday.setDate(sunday.getDate() + 6);
  return { from: dateKey(monday), to: dateKey(sunday) };
}

function thisMonthRange(): { from: string; to: string } {
  const now = new Date();
  return {
    from: dateKey(new Date(now.getFullYear(), now.getMonth(), 1)),
    to: dateKey(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
  };
}

// Earliest non-OFF scheduled day on or after today, across all schedules.
function getNextShift(schedules: Schedule[] | undefined): { label: string; time: string } | null {
  if (!schedules?.length) return null;
  const todayKey = new Date().toISOString().split('T')[0];
  const upcoming: { key: string; time: string }[] = [];
  for (const sched of schedules) {
    const start = new Date(sched.startDate);
    for (const day of sched.days) {
      if (day.isOff || !day.startTime) continue;
      const d = new Date(start);
      d.setUTCDate(d.getUTCDate() + day.dayOfWeek - 1);
      const key = d.toISOString().split('T')[0];
      if (key >= todayKey) upcoming.push({ key, time: day.startTime });
    }
  }
  if (!upcoming.length) return null;
  upcoming.sort((a, b) => a.key.localeCompare(b.key) || a.time.localeCompare(b.time));
  const next = upcoming[0];
  const label = next.key === todayKey
    ? 'Today'
    : new Date(`${next.key}T00:00:00`).toLocaleDateString([], {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });
  return { label, time: next.time };
}

function StatTile({
  icon: Icon,
  label,
  value,
  color,
  href,
}: {
  icon: typeof Clock;
  label: string;
  value: string;
  color: string;
  href?: string;
}) {
  const content = (
    <CardWithHeader
      icon={Icon}
      title={label}
      className={href ? 'transition-colors cursor-pointer' : ''}
    >
      <p className="text-2xl font-bold text-center tabular-nums" style={{ color }}>
        {value}
      </p>
    </CardWithHeader>
  );
  return href ? <Link href={href}>{content}</Link> : content;
}

function StaffTimeClockStats() {
  const week = thisWeekRange();
  const month = thisMonthRange();
  const { data: weekHistory } = useMyHistory(week.from, week.to);
  const { data: monthHistory } = useMyHistory(month.from, month.to);
  const { data: corrections } = useMyCorrections();
  const { data: schedules } = useMySchedule();

  const pending = (corrections ?? []).filter((c) => c.status === 'PENDING').length;
  const nextShift = getNextShift(schedules);

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <StatTile
        icon={Clock}
        label="Hours This Week"
        value={`${sumWorkedHours(weekHistory).toFixed(1)}h`}
        color="var(--kc-p-600)"
      />
      <StatTile
        icon={CalendarDays}
        label="Hours This Month"
        value={`${sumWorkedHours(monthHistory).toFixed(1)}h`}
        color="var(--kc-text-2)"
      />
      <StatTile
        icon={FileEdit}
        label="Pending Corrections"
        value={String(pending)}
        color={pending > 0 ? 'var(--kc-warning)' : 'var(--kc-text-2)'}
        href="/attendance/my-corrections"
      />
      <StatTile
        icon={Calendar}
        label="Next Shift"
        value={nextShift ? `${nextShift.label} · ${nextShift.time}` : '—'}
        color="var(--kc-text-2)"
      />
    </div>
  );
}

export default function AttendancePage() {
  const user = useAuthStore((s) => s.user);
  const { data, isLoading } = useMyToday();
  const punch = usePunch();
  const { timeFormat: tf } = useTimeFormat();

  if (!user) return null;

  if (user.role !== 'STAFF') {
    return (
      <div className="space-y-6">
        <h1 className="font-display text-2xl font-semibold">Attendance</h1>
        <p style={{ color: 'var(--kc-text-2)' }}>
          Use the Team Clock to view your staff&apos;s attendance.
        </p>
      </div>
    );
  }

  const handlePunch = async (
    type: 'CLOCK_IN' | 'BREAK_IN' | 'BREAK_OUT' | 'CLOCK_OUT',
  ) => {
    try {
      const geo = await getPosition();
      await punch.mutateAsync({
        type,
        deviceTimestamp: new Date().toISOString(),
        ...(geo && { latitude: geo.latitude, longitude: geo.longitude }),
      });
      toast.success(ACTION_CONFIG[type].label + ' recorded');
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to record punch',
      );
    }
  };

  const status = data?.shiftStatus;
  const entries = data?.entries ?? [];
  const clockIn = entries.find((e) => e.type === 'CLOCK_IN');
  const clockOut = entries.find((e) => e.type === 'CLOCK_OUT');

  let workedDisplay = '';
  if (clockIn) {
    const end = clockOut
      ? new Date(clockOut.deviceTimestamp).getTime()
      : Date.now();
    const breakIn = entries.find((e) => e.type === 'BREAK_IN');
    const breakOut = entries.find((e) => e.type === 'BREAK_OUT');
    const breakMs =
      breakIn && breakOut
        ? new Date(breakOut.deviceTimestamp).getTime() -
          new Date(breakIn.deviceTimestamp).getTime()
        : 0;
    const workedMs = end - new Date(clockIn.deviceTimestamp).getTime() - breakMs;
    const h = Math.floor(workedMs / 3_600_000);
    const m = Math.floor((workedMs % 3_600_000) / 60_000);
    workedDisplay = h > 0 ? `${h}h ${m}m` : `${m}m`;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Time Clock</h1>
      </div>

      <StaffTimeClockStats />

      {isLoading ? (
        <AttendanceSkeleton />
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <CardWithHeader icon={Clock} title="Time Clock" contentClassName="space-y-4">
              <p className="text-sm font-medium" style={{ color: 'var(--kc-text-2)' }}>
                {status?.clockedOut
                  ? 'Shift Complete'
                  : status?.onBreak
                    ? 'On Break'
                    : status?.clockedIn
                      ? 'Working'
                      : 'Not Clocked In'}
              </p>
              {workedDisplay && (
                <div>
                  <p className="text-3xl font-display font-semibold" style={{ color: 'var(--kc-p-600)' }}>
                    {workedDisplay}
                  </p>
                  <p className="text-xs mt-1" style={{ color: 'var(--kc-text-3)' }}>
                    {status?.clockedOut ? 'Total worked' : 'Time working'}
                  </p>
                </div>
              )}

              <div className="flex flex-wrap gap-3">
                {status?.nextActions.map((action) => {
                  const cfg = ACTION_CONFIG[action];
                  return (
                    <Button
                      key={action}
                      variant={cfg.variant}
                      size="lg"
                      disabled={punch.isPending}
                      onClick={() => handlePunch(action)}
                      className="min-w-[140px]"
                    >
                      {punch.isPending && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      {cfg.label}
                    </Button>
                  );
                })}
              </div>

              {clockIn?.withinGeoFence === false && (
                <p className="text-xs" style={{ color: 'var(--kc-warning)' }}>
                  You appear to be outside the center area
                </p>
              )}

              {status?.clockedOut && (
                <Button asChild variant="outline" className="w-full mt-2">
                  <Link href="/attendance/corrections/new">
                    <FileEdit className="mr-2 h-4 w-4" />
                    Request Correction
                  </Link>
                </Button>
              )}
          </CardWithHeader>

          <CardWithHeader title="Today's Entries">
            {entries.length === 0 ? (
              <p className="text-sm py-4 text-center" style={{ color: 'var(--kc-text-3)' }}>
                No entries yet
              </p>
            ) : (
              <div className="space-y-2">
                {entries.map((entry) => (
                  <EntryRow key={entry.id} entry={entry} tf={tf} />
                ))}
              </div>
            )}
          </CardWithHeader>
        </div>
      )}

      <AttendanceHistorySection />
    </div>
  );
}
