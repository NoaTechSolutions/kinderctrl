'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Clock, Coffee, FileEdit, LogIn, LogOut, Loader2 } from 'lucide-react';
import { useTimeFormat } from '@/lib/preferences/time-format';
import { formatTime } from '@/lib/format-time';
import { toast } from 'sonner';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useMyToday, usePunch } from '@/lib/hooks/use-attendance';
import type { ShiftStatus, StaffTimeEntry } from '@/lib/api/attendance';

const ACTION_CONFIG = {
  CLOCK_IN: { label: 'Clock In', icon: LogIn, variant: 'default' as const },
  BREAK_IN: { label: 'Break', icon: Coffee, variant: 'outline' as const },
  BREAK_OUT: { label: 'End Break', icon: Coffee, variant: 'outline' as const },
  CLOCK_OUT: { label: 'Clock Out', icon: LogOut, variant: 'destructive' as const },
} as const;

function ElapsedTimer({ since }: { since: string }) {
  const [elapsed, setElapsed] = useState('');

  useEffect(() => {
    const calc = () => {
      const diff = Date.now() - new Date(since).getTime();
      const h = Math.floor(diff / 3_600_000);
      const m = Math.floor((diff % 3_600_000) / 60_000);
      setElapsed(h > 0 ? `${h}h ${m}m` : `${m}m`);
    };
    calc();
    const id = setInterval(calc, 60_000);
    return () => clearInterval(id);
  }, [since]);

  return <span>{elapsed}</span>;
}

function ShiftSummary({ entries, tf }: { entries: StaffTimeEntry[]; tf: '12h' | '24h' }) {
  const clockIn = entries.find((e) => e.type === 'CLOCK_IN');
  const clockOut = entries.find((e) => e.type === 'CLOCK_OUT');
  const breakIn = entries.find((e) => e.type === 'BREAK_IN');
  const breakOut = entries.find((e) => e.type === 'BREAK_OUT');

  if (!clockIn || !clockOut) return null;

  const totalMs =
    new Date(clockOut.deviceTimestamp).getTime() -
    new Date(clockIn.deviceTimestamp).getTime();
  const breakMs =
    breakIn && breakOut
      ? new Date(breakOut.deviceTimestamp).getTime() -
        new Date(breakIn.deviceTimestamp).getTime()
      : 0;
  const workedMs = totalMs - breakMs;
  const hours = Math.floor(workedMs / 3_600_000);
  const mins = Math.floor((workedMs % 3_600_000) / 60_000);

  return (
    <div
      className="mt-3 rounded-md p-3 text-sm space-y-1"
      style={{ background: 'var(--kc-surface-2)' }}
    >
      <p className="font-medium" style={{ color: 'var(--kc-text-1)' }}>
        Shift Complete
      </p>
      <p style={{ color: 'var(--kc-text-2)' }}>
        {formatTime(clockIn.deviceTimestamp, tf)} — {formatTime(clockOut.deviceTimestamp, tf)}
      </p>
      {breakMs > 0 && (
        <p style={{ color: 'var(--kc-text-3)' }}>
          Break: {Math.round(breakMs / 60_000)}m
        </p>
      )}
      <p className="font-semibold" style={{ color: 'var(--kc-p-600)' }}>
        Total: {hours}h {mins}m
      </p>
      <Button asChild variant="outline" size="sm" className="mt-2 w-full">
        <Link href="/attendance/corrections/new">
          <FileEdit className="mr-1.5 h-3.5 w-3.5" />
          Request Correction
        </Link>
      </Button>
    </div>
  );
}

export function TimeClockWidget() {
  const { data, isLoading } = useMyToday();
  const punch = usePunch();
  const { timeFormat: tf } = useTimeFormat();

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

  const status: ShiftStatus = data?.shiftStatus ?? {
    clockedIn: false,
    onBreak: false,
    clockedOut: false,
    nextActions: ['CLOCK_IN'],
  };

  const clockInEntry = data?.entries.find((e) => e.type === 'CLOCK_IN');

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Clock className="h-4 w-4" style={{ color: 'var(--kc-p-600)' }} />
          Time Clock
        </CardTitle>
        <span className="text-xs" style={{ color: 'var(--kc-text-3)' }}>
          {new Date().toLocaleDateString([], {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
          })}
        </span>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-4 w-32 rounded" />
            <div className="flex flex-wrap gap-2">
              <Skeleton className="h-9 w-24 rounded-md" />
              <Skeleton className="h-9 w-24 rounded-md" />
            </div>
          </div>
        ) : (
          <>
            {status.clockedIn && !status.clockedOut && clockInEntry && (
              <div className="mb-3">
                <p className="text-sm" style={{ color: 'var(--kc-text-2)' }}>
                  {status.onBreak ? (
                    <span style={{ color: 'var(--kc-warning)' }}>On break</span>
                  ) : (
                    <>
                      Clocked in at{' '}
                      <span className="font-medium" style={{ color: 'var(--kc-text-1)' }}>
                        {formatTime(clockInEntry.deviceTimestamp, tf)}
                      </span>
                    </>
                  )}
                </p>
                {!status.onBreak && (
                  <p
                    className="text-xs mt-0.5"
                    style={{ color: 'var(--kc-text-3)' }}
                  >
                    Working: <ElapsedTimer since={clockInEntry.deviceTimestamp} />
                  </p>
                )}
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              {status.nextActions.map((action) => {
                const cfg = ACTION_CONFIG[action];
                const Icon = cfg.icon;
                return (
                  <Button
                    key={action}
                    variant={cfg.variant}
                    size="sm"
                    disabled={punch.isPending}
                    onClick={() => handlePunch(action)}
                  >
                    {punch.isPending ? (
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Icon className="mr-1.5 h-3.5 w-3.5" />
                    )}
                    {cfg.label}
                  </Button>
                );
              })}
            </div>

            {status.clockedOut && data?.entries && (
              <ShiftSummary entries={data.entries} tf={tf} />
            )}

            {status.clockedIn &&
              !status.clockedOut &&
              clockInEntry?.withinGeoFence === false && (
                <p
                  className="mt-2 text-xs"
                  style={{ color: 'var(--kc-warning)' }}
                >
                  You appear to be outside the center area
                </p>
              )}
          </>
        )}
      </CardContent>
    </Card>
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
