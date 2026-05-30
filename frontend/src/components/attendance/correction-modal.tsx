'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, FileEdit, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { useCreateCorrection } from '@/lib/hooks/use-attendance';
import { ApiError } from '@/lib/api/client';
import { useTimeFormat } from '@/lib/preferences/time-format';
import { formatTime } from '@/lib/format-time';
import type { StaffTimeEntry } from '@/lib/api/attendance';

function toTimeInput(iso: string | null): string {
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

interface CorrectionModalProps {
  open: boolean;
  onClose: () => void;
  // YYYY-MM-DD of the day being corrected.
  date: string;
  // Existing punches for that day (used to pre-fill the form).
  entries: StaffTimeEntry[];
}

export function CorrectionModal({ open, onClose, date, entries }: CorrectionModalProps) {
  const mutation = useCreateCorrection();
  const { timeFormat: tf } = useTimeFormat();
  const [showReplace, setShowReplace] = useState(false);

  const clockIn = entries.find((e) => e.type === 'CLOCK_IN');
  const breakIn = entries.find((e) => e.type === 'BREAK_IN');
  const breakOut = entries.find((e) => e.type === 'BREAK_OUT');
  const clockOut = entries.find((e) => e.type === 'CLOCK_OUT');

  const [corrClockIn, setCorrClockIn] = useState('');
  const [corrBreakIn, setCorrBreakIn] = useState('');
  const [corrBreakOut, setCorrBreakOut] = useState('');
  const [corrClockOut, setCorrClockOut] = useState('');
  const [comment, setComment] = useState('');

  // Re-sync the form whenever the modal opens for a (possibly different) day.
  useEffect(() => {
    if (!open) return;
    setCorrClockIn(toTimeInput(clockIn?.deviceTimestamp ?? null));
    setCorrBreakIn(toTimeInput(breakIn?.deviceTimestamp ?? null));
    setCorrBreakOut(toTimeInput(breakOut?.deviceTimestamp ?? null));
    setCorrClockOut(toTimeInput(clockOut?.deviceTimestamp ?? null));
    setComment('');
    setShowReplace(false);
  }, [open, date, clockIn, breakIn, breakOut, clockOut]);

  const buildPayload = (replace?: boolean) => ({
    date,
    requestedClockIn: fromTimeInput(date, corrClockIn),
    requestedBreakIn: fromTimeInput(date, corrBreakIn),
    requestedBreakOut: fromTimeInput(date, corrBreakOut),
    requestedClockOut: fromTimeInput(date, corrClockOut),
    staffComment: comment,
    ...(replace && { replaceExisting: true }),
  });

  const submit = async (replace?: boolean) => {
    try {
      await mutation.mutateAsync(buildPayload(replace));
      toast.success('Correction request submitted');
      onClose();
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

  const rows: Array<{ label: string; original: string | null; value: string; set: (s: string) => void }> = [
    { label: 'Clock In', original: clockIn?.deviceTimestamp ?? null, value: corrClockIn, set: setCorrClockIn },
    { label: 'Break In', original: breakIn?.deviceTimestamp ?? null, value: corrBreakIn, set: setCorrBreakIn },
    { label: 'Break Out', original: breakOut?.deviceTimestamp ?? null, value: corrBreakOut, set: setCorrBreakOut },
    { label: 'Clock Out', original: clockOut?.deviceTimestamp ?? null, value: corrClockOut, set: setCorrClockOut },
  ];

  const dateLabel = new Date(date + 'T12:00:00').toLocaleDateString([], {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileEdit className="h-5 w-5" style={{ color: 'var(--kc-p-600)' }} />
              Request Correction
            </DialogTitle>
            <DialogDescription>{dateLabel}</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
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
                  {formatTime(row.original, tf)}
                </span>
                <input
                  type="time"
                  value={row.value}
                  onChange={(e) => row.set(e.target.value)}
                  className="h-9 rounded-md border px-3 text-sm tabular-nums"
                  style={{ borderColor: 'var(--kc-border)', background: 'var(--kc-bg)', color: 'var(--kc-text-1)' }}
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
                style={{ borderColor: 'var(--kc-border)', background: 'var(--kc-bg)', color: 'var(--kc-text-1)' }}
                placeholder="Explain why a correction is needed..."
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Send Request
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

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
    </>
  );
}
