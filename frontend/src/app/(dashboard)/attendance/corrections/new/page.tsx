'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, FileEdit, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
import { useMyToday, useCreateCorrection } from '@/lib/hooks/use-attendance';
import { ApiError } from '@/lib/api/client';
import { useTimeFormat } from '@/lib/preferences/time-format';
import { formatTime } from '@/lib/format-time';

function toTimeInput(iso: string | null) {
  if (!iso) return '';
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function fromTimeInput(dateStr: string, time: string): string | undefined {
  if (!time) return undefined;
  const [h, m] = time.split(':');
  const d = new Date(`${dateStr}T00:00:00`);
  d.setHours(Number(h), Number(m), 0, 0);
  return d.toISOString();
}

export default function NewCorrectionPage() {
  const router = useRouter();
  const { data } = useMyToday();
  const mutation = useCreateCorrection();
  const { timeFormat: tf } = useTimeFormat();
  const [showReplace, setShowReplace] = useState(false);

  const entries = data?.entries ?? [];
  const clockIn = entries.find((e) => e.type === 'CLOCK_IN');
  const breakIn = entries.find((e) => e.type === 'BREAK_IN');
  const breakOut = entries.find((e) => e.type === 'BREAK_OUT');
  const clockOut = entries.find((e) => e.type === 'CLOCK_OUT');

  const dateStr = clockIn
    ? new Date(clockIn.deviceTimestamp).toLocaleDateString('en-CA')
    : new Date().toLocaleDateString('en-CA');

  const [corrClockIn, setCorrClockIn] = useState(() => toTimeInput(clockIn?.deviceTimestamp ?? null));
  const [corrBreakIn, setCorrBreakIn] = useState(() => toTimeInput(breakIn?.deviceTimestamp ?? null));
  const [corrBreakOut, setCorrBreakOut] = useState(() => toTimeInput(breakOut?.deviceTimestamp ?? null));
  const [corrClockOut, setCorrClockOut] = useState(() => toTimeInput(clockOut?.deviceTimestamp ?? null));
  const [comment, setComment] = useState('');

  const buildPayload = (replace?: boolean) => ({
    date: dateStr,
    requestedClockIn: fromTimeInput(dateStr, corrClockIn),
    requestedBreakIn: fromTimeInput(dateStr, corrBreakIn),
    requestedBreakOut: fromTimeInput(dateStr, corrBreakOut),
    requestedClockOut: fromTimeInput(dateStr, corrClockOut),
    staffComment: comment,
    ...(replace && { replaceExisting: true }),
  });

  const submit = async (replace?: boolean) => {
    try {
      await mutation.mutateAsync(buildPayload(replace));
      toast.success('Correction request submitted');
      router.push('/attendance/my-corrections');
    } catch (err) {
      if (
        err instanceof ApiError &&
        err.status === 409 &&
        (err.body as { errorCode?: string })?.errorCode === 'CORRECTION_EXISTS'
      ) {
        setShowReplace(true);
        return;
      }
      toast.error(err instanceof Error ? err.message : 'Failed to submit');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) {
      toast.error('Comment is required');
      return;
    }
    await submit();
  };

  const handleReplace = async () => {
    setShowReplace(false);
    await submit(true);
  };

  const rows = [
    { label: 'Clock In', original: clockIn?.deviceTimestamp, value: corrClockIn, set: setCorrClockIn },
    { label: 'Break In', original: breakIn?.deviceTimestamp, value: corrBreakIn, set: setCorrBreakIn },
    { label: 'Break Out', original: breakOut?.deviceTimestamp, value: corrBreakOut, set: setCorrBreakOut },
    { label: 'Clock Out', original: clockOut?.deviceTimestamp, value: corrClockOut, set: setCorrClockOut },
  ];

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="font-display text-2xl font-semibold">Request Correction</h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--kc-text-3)' }}>
          {new Date(dateStr + 'T12:00:00').toLocaleDateString([], {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileEdit className="h-5 w-5" style={{ color: 'var(--kc-p-600)' }} />
              Adjust Timestamps
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-2 text-xs font-medium pb-1" style={{ color: 'var(--kc-text-3)' }}>
              <span />
              <span>Original</span>
              <span>Corrected</span>
            </div>

            {rows.map((row) => (
              <div key={row.label} className="grid grid-cols-3 items-center gap-2">
                <span className="text-sm font-medium" style={{ color: 'var(--kc-text-1)' }}>
                  {row.label}
                </span>
                <span className="text-sm tabular-nums" style={{ color: 'var(--kc-text-3)' }}>
                  {formatTime(row.original ?? null, tf)}
                </span>
                <input
                  type="time"
                  value={row.value}
                  onChange={(e) => row.set(e.target.value)}
                  className="h-9 rounded-md border px-3 text-sm tabular-nums"
                  style={{
                    borderColor: 'var(--kc-border)',
                    background: 'var(--kc-bg)',
                    color: 'var(--kc-text-1)',
                  }}
                />
              </div>
            ))}

            <div className="pt-2">
              <label className="text-sm font-medium" style={{ color: 'var(--kc-text-1)' }}>
                Reason / Comment <span style={{ color: 'var(--kc-error)' }}>*</span>
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                required
                rows={3}
                className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                style={{
                  borderColor: 'var(--kc-border)',
                  background: 'var(--kc-bg)',
                  color: 'var(--kc-text-1)',
                }}
                placeholder="Explain why a correction is needed..."
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Send Request
              </Button>
              <Button type="button" variant="outline" onClick={() => router.back()}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>

      <AlertDialog open={showReplace} onOpenChange={setShowReplace}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" style={{ color: 'var(--kc-warning)' }} />
              Replace existing request?
            </AlertDialogTitle>
            <AlertDialogDescription>
              You already have a pending correction for this day. The previous
              request will be replaced. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep existing</AlertDialogCancel>
            <AlertDialogAction onClick={handleReplace}>Replace</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
