'use client';

import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Eye,
  Loader2,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { CardWithHeader } from '@/components/ui/card-with-header';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  useApproveOrRejectDay,
  useApproveOrRejectWeek,
  useTeamWeek,
} from '@/lib/hooks/use-attendance';
import { useTimeFormat } from '@/lib/preferences/time-format';
import { formatTime } from '@/lib/format-time';
import type {
  StaffTimeEntry,
  TeamWeekDay,
  TeamWeekStaff,
} from '@/lib/api/attendance';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

// Opaque background for sticky cells in the mobile transposed table so the
// pinned first column / header mask the scrolling content behind them.
const STICKY_BG = { background: 'var(--kc-surface)' } as const;

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getWeek(offset: number): { from: string; label: string } {
  const now = new Date();
  const monday = new Date(now);
  const dow = monday.getDay();
  monday.setDate(monday.getDate() - (dow === 0 ? 6 : dow - 1) + offset * 7);
  const sunday = new Date(monday);
  sunday.setDate(sunday.getDate() + 6);
  return {
    from: dateKey(monday),
    label: `${monday.toLocaleDateString([], { month: 'short', day: 'numeric' })} – ${sunday.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}`,
  };
}

function workedFull(entries: StaffTimeEntry[]): string {
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

function workedMsForDay(entries: StaffTimeEntry[]): number {
  const ci = entries.find((e) => e.type === 'CLOCK_IN');
  const co = entries.find((e) => e.type === 'CLOCK_OUT');
  if (!ci || !co) return 0;
  const bi = entries.find((e) => e.type === 'BREAK_IN');
  const bo = entries.find((e) => e.type === 'BREAK_OUT');
  const brk = bi && bo
    ? new Date(bo.deviceTimestamp).getTime() - new Date(bi.deviceTimestamp).getTime()
    : 0;
  return new Date(co.deviceTimestamp).getTime() - new Date(ci.deviceTimestamp).getTime() - brk;
}

function fmtDuration(ms: number): string {
  if (ms <= 0) return '0h';
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return m > 0 ? `${h}h ${String(m).padStart(2, '0')}m` : `${h}h`;
}

function shortHours(entries: StaffTimeEntry[]): string {
  const ci = entries.find((e) => e.type === 'CLOCK_IN');
  const co = entries.find((e) => e.type === 'CLOCK_OUT');
  if (!ci || !co) return entries.length > 0 ? '…' : '—';
  const bi = entries.find((e) => e.type === 'BREAK_IN');
  const bo = entries.find((e) => e.type === 'BREAK_OUT');
  const brk = bi && bo
    ? new Date(bo.deviceTimestamp).getTime() - new Date(bi.deviceTimestamp).getTime()
    : 0;
  const hours = (new Date(co.deviceTimestamp).getTime() - new Date(ci.deviceTimestamp).getTime() - brk) / 3_600_000;
  return hours % 1 === 0 ? `${hours}h` : `${hours.toFixed(1)}h`;
}

type RejectTarget =
  | { kind: 'day'; staffId: string; staffName: string; date: string }
  | { kind: 'week'; staffId: string; staffName: string; weekStart: string };

export function WeeklyApprovalSection({ centerId }: { centerId?: string } = {}) {
  const [offset, setOffset] = useState(0);
  const week = useMemo(() => getWeek(offset), [offset]);
  // centerId is passed when embedded in the center detail (SUPER_ADMIN);
  // undefined on the director's own /attendance/team page (their center).
  const { data, isLoading } = useTeamWeek(week.from, centerId);
  const { timeFormat: tf } = useTimeFormat();

  const [dayDetail, setDayDetail] = useState<{ staff: TeamWeekStaff; day: TeamWeekDay } | null>(null);
  const [weekDetailStaffId, setWeekDetailStaffId] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<RejectTarget | null>(null);
  const [rejectComment, setRejectComment] = useState('');
  // Look up the full week detail from the latest query data — so the modal
  // updates after approve/reject without needing local state on each day.
  const weekDetailStaff = useMemo(
    () => (weekDetailStaffId ? data?.staff.find((s) => s.id === weekDetailStaffId) ?? null : null),
    [weekDetailStaffId, data],
  );

  const approveDay = useApproveOrRejectDay();
  const approveWeek = useApproveOrRejectWeek();

  const handleApproveDay = async (staffId: string, date: string) => {
    try {
      await approveDay.mutateAsync({ staffId, date, action: 'APPROVE' });
      toast.success('Day approved');
      setDayDetail(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to approve');
    }
  };

  const handleApproveWeek = async (staffId: string) => {
    try {
      await approveWeek.mutateAsync({ staffId, weekStart: week.from, action: 'APPROVE' });
      toast.success('Week approved');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to approve');
    }
  };

  const handleApproveAllRemaining = async (s: TeamWeekStaff) => {
    // Only days that have punches, no pending correction, and no existing
    // approval. These are the ones the director can still act on.
    const toApprove = s.days.filter(
      (d) => d.entries.length > 0 && !d.pendingCorrection && !d.approval,
    );
    if (!toApprove.length) {
      toast.error('Nothing to approve — every day is already reviewed or blocked.');
      return;
    }
    try {
      // Fire sequentially so the backend reflects each upsert; the underlying
      // queries get invalidated once via React Query's cache key after each call.
      for (const d of toApprove) {
        await approveDay.mutateAsync({ staffId: s.id, date: d.date, action: 'APPROVE' });
      }
      toast.success(`${toApprove.length} day${toApprove.length > 1 ? 's' : ''} approved`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to approve remaining days');
    }
  };

  const openRejectDay = (s: TeamWeekStaff, d: TeamWeekDay) => {
    setRejectComment('');
    setRejectTarget({ kind: 'day', staffId: s.id, staffName: `${s.firstName} ${s.lastName}`, date: d.date });
  };

  const openRejectWeek = (s: TeamWeekStaff) => {
    setRejectComment('');
    setRejectTarget({ kind: 'week', staffId: s.id, staffName: `${s.firstName} ${s.lastName}`, weekStart: week.from });
  };

  const handleRejectSubmit = async () => {
    if (!rejectComment.trim()) {
      toast.error('Comment is required');
      return;
    }
    if (!rejectTarget) return;
    try {
      if (rejectTarget.kind === 'day') {
        await approveDay.mutateAsync({
          staffId: rejectTarget.staffId,
          date: rejectTarget.date,
          action: 'REJECT',
          directorComment: rejectComment,
        });
        toast.success('Day rejected');
      } else {
        await approveWeek.mutateAsync({
          staffId: rejectTarget.staffId,
          weekStart: rejectTarget.weekStart,
          action: 'REJECT',
          directorComment: rejectComment,
        });
        toast.success('Week rejected');
      }
      setRejectTarget(null);
      setDayDetail(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to reject');
    }
  };

  return (
    <>
      <CardWithHeader icon={ClipboardCheck} title="Attendance Approval">
        <div className="space-y-4">
          {/* Week selector */}
          <div className="flex items-center justify-center gap-3">
            <Button variant="outline" size="icon-xs" aria-label="Previous week" onClick={() => setOffset((o) => o - 1)}>
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <span className="text-sm font-medium min-w-[14rem] text-center" style={{ color: 'var(--kc-text-1)' }}>
              {week.label}
            </span>
            <Button
              variant="outline"
              size="icon-xs"
              aria-label="Next week"
              disabled={offset >= 0}
              onClick={() => setOffset((o) => o + 1)}
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>

          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-lg" />
              ))}
            </div>
          ) : !data?.staff.length ? (
            <p className="text-sm text-center py-8" style={{ color: 'var(--kc-text-3)' }}>
              No active staff in this center.
            </p>
          ) : (
            <>
              {/* Desktop / tablet (>=640px) — staff in rows (original). */}
              <div className="hidden overflow-x-auto sm:block">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--kc-border)' }}>
                    <th className="text-left py-2 pr-2 font-medium text-xs" style={{ color: 'var(--kc-text-3)' }}>Staff</th>
                    {DAYS.map((d) => (
                      <th key={d} className="text-center py-2 px-1 font-medium text-xs" style={{ color: 'var(--kc-text-3)' }}>{d}</th>
                    ))}
                    <th className="text-right py-2 pl-2 font-medium text-xs" style={{ color: 'var(--kc-text-3)' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.staff.map((s) => (
                    <tr key={s.id} style={{ borderBottom: '1px solid var(--kc-border)' }}>
                      <td className="py-3 pr-2 font-medium whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setWeekDetailStaffId(s.id)}
                          className="inline-flex items-center gap-1.5 rounded hover:underline focus:outline-none focus-visible:underline"
                          style={{ color: 'var(--kc-text-1)' }}
                        >
                          <Eye className="h-3.5 w-3.5 flex-none" style={{ color: 'var(--kc-text-3)' }} />
                          {s.firstName} {s.lastName}
                        </button>
                      </td>
                      {s.days.map((d) => (
                        <td key={d.date} className="text-center py-2 px-1">
                          <DayCell day={d} onClick={() => setDayDetail({ staff: s, day: d })} />
                        </td>
                      ))}
                      <td className="text-right py-2 pl-2 whitespace-nowrap">
                        <div className="inline-flex justify-end gap-1.5">
                          <ApproveWeekButton
                            pendingCount={s.pendingCorrectionsCount}
                            isPending={approveWeek.isPending}
                            onClick={() => handleApproveWeek(s.id)}
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={approveWeek.isPending}
                            onClick={() => openRejectWeek(s)}
                            style={{ color: 'var(--kc-error)', borderColor: 'var(--kc-error)' }}
                          >
                            <XCircle className="mr-1 h-3.5 w-3.5" />
                            Reject
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>

              {/* Mobile (<640px) — transposed: days in rows, staff in columns.
                  First column (day) + header (staff) sticky; cells reuse
                  DayCell. Tap a staff name → week detail, tap a cell → day
                  detail (same modals as desktop). */}
              <div
                className="overflow-x-auto rounded-lg border sm:hidden"
                style={{ background: 'var(--kc-surface)', borderColor: 'var(--kc-border)' }}
              >
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--kc-border)' }}>
                      <th
                        className="sticky left-0 top-0 z-20 text-left py-2 px-2 font-medium text-xs"
                        style={{ ...STICKY_BG, color: 'var(--kc-text-3)' }}
                      >
                        Day
                      </th>
                      {data.staff.map((s) => (
                        <th
                          key={s.id}
                          className="sticky top-0 z-10 py-2 px-1 font-medium text-xs min-w-[60px]"
                          style={{ ...STICKY_BG, color: 'var(--kc-text-3)' }}
                        >
                          <button
                            type="button"
                            onClick={() => setWeekDetailStaffId(s.id)}
                            className="hover:underline focus:outline-none focus-visible:underline"
                          >
                            {s.firstName}
                          </button>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {DAYS.map((label, i) => (
                      <tr key={label} style={{ borderBottom: '1px solid var(--kc-border)' }}>
                        <td
                          className="sticky left-0 z-10 py-2 px-2 font-medium whitespace-nowrap"
                          style={{ ...STICKY_BG, color: 'var(--kc-text-1)' }}
                        >
                          {label}
                        </td>
                        {data.staff.map((s) => {
                          const day = s.days[i];
                          return (
                            <td key={s.id} className="text-center py-2 px-1">
                              {day ? (
                                <DayCell day={day} onClick={() => setDayDetail({ staff: s, day })} />
                              ) : (
                                <span className="text-xs" style={{ color: 'var(--kc-text-3)' }}>—</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </CardWithHeader>

      {/* Day detail modal */}
      <Dialog open={!!dayDetail} onOpenChange={(o) => !o && setDayDetail(null)}>
        <DialogContent className="sm:max-w-md">
          {dayDetail && (
            <>
              <DialogHeader>
                <DialogTitle>
                  {dayDetail.staff.firstName} {dayDetail.staff.lastName}
                </DialogTitle>
                <DialogDescription>
                  {new Date(dayDetail.day.date + 'T12:00:00').toLocaleDateString([], {
                    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
                  })}
                </DialogDescription>
              </DialogHeader>
              <DayDetailBody day={dayDetail.day} tf={tf} />
              <DialogFooter className="gap-2">
                <Button
                  variant="outline"
                  disabled={approveDay.isPending || dayDetail.day.pendingCorrection || !dayDetail.day.entries.length}
                  title={dayDetail.day.pendingCorrection ? 'Cannot approve while a correction is pending for this day' : undefined}
                  onClick={() => handleApproveDay(dayDetail.staff.id, dayDetail.day.date)}
                  style={{ color: '#22c55e', borderColor: '#22c55e' }}
                >
                  {approveDay.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <CheckCircle className="mr-1 h-3.5 w-3.5" />
                  Approve Day
                </Button>
                <Button
                  variant="outline"
                  disabled={approveDay.isPending || !dayDetail.day.entries.length}
                  onClick={() => openRejectDay(dayDetail.staff, dayDetail.day)}
                  style={{ color: 'var(--kc-error)', borderColor: 'var(--kc-error)' }}
                >
                  <XCircle className="mr-1 h-3.5 w-3.5" />
                  Reject Day
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Week detail modal (per-staff) */}
      <Dialog open={!!weekDetailStaff} onOpenChange={(o) => !o && setWeekDetailStaffId(null)}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          {weekDetailStaff && (
            <>
              <DialogHeader>
                <DialogTitle>
                  {weekDetailStaff.firstName} {weekDetailStaff.lastName}
                </DialogTitle>
                <DialogDescription>Week of {week.label}</DialogDescription>
              </DialogHeader>

              <WeekDetailBody
                staff={weekDetailStaff}
                tf={tf}
                actionsPending={approveDay.isPending}
                onApproveDay={(date) => handleApproveDay(weekDetailStaff.id, date)}
                onRejectDay={(d) => openRejectDay(weekDetailStaff, d)}
              />

              <WeekDetailFooter
                staff={weekDetailStaff}
                approveDayPending={approveDay.isPending}
                approveWeekPending={approveWeek.isPending}
                onApproveAllRemaining={() => handleApproveAllRemaining(weekDetailStaff)}
                onRejectAll={() => openRejectWeek(weekDetailStaff)}
              />
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Reject comment modal */}
      <Dialog open={!!rejectTarget} onOpenChange={(o) => !o && setRejectTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" style={{ color: 'var(--kc-warning)' }} />
              Reject {rejectTarget?.kind === 'week' ? 'Week' : 'Day'}
            </DialogTitle>
            <DialogDescription>
              {rejectTarget?.staffName}
              {rejectTarget?.kind === 'day' && ` — ${rejectTarget.date}`}
              {rejectTarget?.kind === 'week' && ` — week starting ${rejectTarget.weekStart}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <label className="text-sm font-medium" style={{ color: 'var(--kc-text-1)' }}>
              Reason <span style={{ color: 'var(--kc-error)' }}>*</span>
            </label>
            <textarea
              value={rejectComment}
              onChange={(e) => setRejectComment(e.target.value)}
              required
              rows={4}
              placeholder="Explain why you're rejecting these hours…"
              className="w-full rounded-md border px-3 py-2 text-sm"
              style={{ borderColor: 'var(--kc-border)', background: 'var(--kc-bg)', color: 'var(--kc-text-1)' }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectTarget(null)} disabled={approveDay.isPending || approveWeek.isPending}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRejectSubmit}
              disabled={approveDay.isPending || approveWeek.isPending || !rejectComment.trim()}
            >
              {(approveDay.isPending || approveWeek.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function DayCell({ day, onClick }: { day: TeamWeekDay; onClick: () => void }) {
  const hours = shortHours(day.entries);
  const empty = day.entries.length === 0;
  const status = day.approval?.status;
  const color =
    status === 'APPROVED' ? '#22c55e'
    : status === 'REJECTED' ? 'var(--kc-error)'
    : empty ? 'var(--kc-text-3)'
    : 'var(--kc-text-2)';
  const mark =
    status === 'APPROVED' ? '✓'
    : status === 'REJECTED' ? '✗'
    : null;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={empty}
      className="inline-flex items-center gap-1 rounded px-1.5 py-1 transition-colors hover:bg-[var(--kc-surface-2)] disabled:cursor-default disabled:hover:bg-transparent disabled:opacity-50"
      style={{ minWidth: '44px' }}
    >
      <span className="text-xs tabular-nums" style={{ color }}>
        {hours}
      </span>
      {mark && <span className="text-xs font-bold" style={{ color }}>{mark}</span>}
      {day.pendingCorrection && !mark && (
        <span className="text-xs" style={{ color: 'var(--kc-warning)' }}>⚠</span>
      )}
    </button>
  );
}

function ApproveWeekButton({
  pendingCount,
  isPending,
  onClick,
}: {
  pendingCount: number;
  isPending: boolean;
  onClick: () => void;
}) {
  const blocked = pendingCount > 0;
  const btn = (
    <Button
      variant="outline"
      size="sm"
      disabled={blocked || isPending}
      onClick={onClick}
      style={!blocked ? { color: '#22c55e', borderColor: '#22c55e' } : undefined}
    >
      {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      <CheckCircle className="mr-1 h-3.5 w-3.5" />
      Approve Week
    </Button>
  );
  if (!blocked) return btn;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span tabIndex={0}>{btn}</span>
      </TooltipTrigger>
      <TooltipContent
        className="text-xs p-2 shadow-md"
        style={{ background: 'var(--kc-bg)', color: 'var(--kc-text-1)', border: '1px solid var(--kc-border)' }}
      >
        {pendingCount} pending correction{pendingCount > 1 ? 's' : ''}
      </TooltipContent>
    </Tooltip>
  );
}

function DayDetailBody({ day, tf }: { day: TeamWeekDay; tf: '12h' | '24h' }) {
  const ci = day.entries.find((e) => e.type === 'CLOCK_IN');
  const bi = day.entries.find((e) => e.type === 'BREAK_IN');
  const bo = day.entries.find((e) => e.type === 'BREAK_OUT');
  const co = day.entries.find((e) => e.type === 'CLOCK_OUT');
  return (
    <div className="space-y-3 py-2 text-sm">
      {!day.entries.length ? (
        <p style={{ color: 'var(--kc-text-3)' }}>No attendance recorded for this day.</p>
      ) : (
        <div className="space-y-1.5">
          {ci && (
            <div className="flex justify-between">
              <span style={{ color: 'var(--kc-text-3)' }}>Clock In</span>
              <span className="tabular-nums" style={{ color: 'var(--kc-text-1)' }}>{formatTime(ci.deviceTimestamp, tf)}</span>
            </div>
          )}
          {bi && (
            <div className="flex justify-between">
              <span style={{ color: 'var(--kc-text-3)' }}>Break</span>
              <span className="tabular-nums" style={{ color: 'var(--kc-text-1)' }}>
                {formatTime(bi.deviceTimestamp, tf)}
                {bo && <> – {formatTime(bo.deviceTimestamp, tf)}</>}
              </span>
            </div>
          )}
          {co && (
            <div className="flex justify-between">
              <span style={{ color: 'var(--kc-text-3)' }}>Clock Out</span>
              <span className="tabular-nums" style={{ color: 'var(--kc-text-1)' }}>{formatTime(co.deviceTimestamp, tf)}</span>
            </div>
          )}
          <div className="flex justify-between pt-2 mt-1" style={{ borderTop: '1px solid var(--kc-border)' }}>
            <span className="font-medium">Total</span>
            <span className="font-semibold tabular-nums" style={{ color: 'var(--kc-p-600)' }}>{workedFull(day.entries)}</span>
          </div>
        </div>
      )}
      {day.pendingCorrection && (
        <div className="p-2 rounded-md flex items-start gap-2" style={{ background: 'var(--kc-warning-bg)' }}>
          <AlertTriangle className="h-4 w-4 flex-none mt-0.5" style={{ color: 'var(--kc-warning)' }} />
          <p className="text-xs" style={{ color: 'var(--kc-warning)' }}>
            A correction request is pending for this day. Resolve it before approving.
          </p>
        </div>
      )}
      {day.approval && (
        <div className="p-2 rounded-md text-xs" style={{ background: 'var(--kc-surface-2)', color: 'var(--kc-text-2)' }}>
          Status:{' '}
          <span
            className="font-semibold"
            style={{ color: day.approval.status === 'APPROVED' ? '#22c55e' : 'var(--kc-error)' }}
          >
            {day.approval.status}
          </span>
          {day.approval.directorComment && <p className="mt-1">{day.approval.directorComment}</p>}
        </div>
      )}
    </div>
  );
}

// ===================================================== WEEK DETAIL MODAL

function WeekDetailBody({
  staff,
  tf,
  actionsPending,
  onApproveDay,
  onRejectDay,
}: {
  staff: TeamWeekStaff;
  tf: '12h' | '24h';
  actionsPending: boolean;
  onApproveDay: (date: string) => void;
  onRejectDay: (day: TeamWeekDay) => void;
}) {
  return (
    <div className="rounded-md border" style={{ borderColor: 'var(--kc-border)' }}>
      {staff.days.map((d, i) => {
        const dateObj = new Date(d.date + 'T12:00:00');
        const weekdayLabel = dateObj.toLocaleDateString([], { weekday: 'long' });
        const shortDateLabel = dateObj.toLocaleDateString([], { month: 'short', day: 'numeric' });
        const ci = d.entries.find((e) => e.type === 'CLOCK_IN');
        const bi = d.entries.find((e) => e.type === 'BREAK_IN');
        const bo = d.entries.find((e) => e.type === 'BREAK_OUT');
        const co = d.entries.find((e) => e.type === 'CLOCK_OUT');
        const hasPunches = d.entries.length > 0;
        const dayHours = fmtDuration(workedMsForDay(d.entries));
        const approved = d.approval?.status === 'APPROVED';
        const rejected = d.approval?.status === 'REJECTED';

        return (
          <div
            key={d.date}
            className="grid grid-cols-[7rem_1fr_auto] items-stretch"
            style={i > 0 ? { borderTop: '1px solid var(--kc-border)' } : undefined}
          >
            {/* Date column */}
            <div className="p-3" style={{ borderRight: '1px solid var(--kc-border)' }}>
              <p className="text-sm font-medium" style={{ color: 'var(--kc-text-1)' }}>{weekdayLabel}</p>
              <p className="text-xs" style={{ color: 'var(--kc-text-3)' }}>{shortDateLabel}</p>
              {hasPunches && (
                <p className="text-xs mt-1 tabular-nums font-semibold" style={{ color: 'var(--kc-p-600)' }}>
                  {dayHours}
                </p>
              )}
            </div>

            {/* Entries column */}
            <div className="p-3 text-sm space-y-1" style={{ borderRight: '1px solid var(--kc-border)' }}>
              {!hasPunches ? (
                <p style={{ color: 'var(--kc-text-3)' }}>No attendance recorded</p>
              ) : (
                <>
                  {ci && (
                    <div className="flex gap-2">
                      <span className="text-xs w-20 flex-none" style={{ color: 'var(--kc-text-3)' }}>Clock In:</span>
                      <span className="tabular-nums" style={{ color: 'var(--kc-text-1)' }}>{formatTime(ci.deviceTimestamp, tf)}</span>
                    </div>
                  )}
                  {bi && (
                    <div className="flex gap-2">
                      <span className="text-xs w-20 flex-none" style={{ color: 'var(--kc-text-3)' }}>Break:</span>
                      <span className="tabular-nums" style={{ color: 'var(--kc-text-1)' }}>
                        {formatTime(bi.deviceTimestamp, tf)}
                        {bo && <> – {formatTime(bo.deviceTimestamp, tf)}</>}
                      </span>
                    </div>
                  )}
                  {co && (
                    <div className="flex gap-2">
                      <span className="text-xs w-20 flex-none" style={{ color: 'var(--kc-text-3)' }}>Clock Out:</span>
                      <span className="tabular-nums" style={{ color: 'var(--kc-text-1)' }}>{formatTime(co.deviceTimestamp, tf)}</span>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Action / status column */}
            <div className="p-3 flex items-center justify-center min-w-[8rem]">
              {!hasPunches ? (
                <span className="text-xs" style={{ color: 'var(--kc-text-3)' }}>—</span>
              ) : approved ? (
                <span className="inline-flex items-center gap-1 text-xs font-semibold" style={{ color: '#22c55e' }}>
                  <CheckCircle className="h-3.5 w-3.5" />
                  Approved
                </span>
              ) : rejected ? (
                <span
                  className="inline-flex items-center gap-1 text-xs font-semibold"
                  style={{ color: 'var(--kc-error)' }}
                  title={d.approval?.directorComment ?? undefined}
                >
                  <XCircle className="h-3.5 w-3.5" />
                  Rejected
                </span>
              ) : d.pendingCorrection ? (
                <span
                  className="inline-flex items-center gap-1 text-xs"
                  style={{ color: 'var(--kc-warning)' }}
                  title="Resolve the pending correction first"
                >
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Pending correction
                </span>
              ) : (
                <div className="flex gap-1.5">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    disabled={actionsPending}
                    onClick={() => onApproveDay(d.date)}
                    aria-label="Approve day"
                    title="Approve day"
                    style={{ color: '#22c55e', borderColor: '#22c55e' }}
                  >
                    <CheckCircle className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    disabled={actionsPending}
                    onClick={() => onRejectDay(d)}
                    aria-label="Reject day"
                    title="Reject day"
                    style={{ color: 'var(--kc-error)', borderColor: 'var(--kc-error)' }}
                  >
                    <XCircle className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function WeekDetailFooter({
  staff,
  approveDayPending,
  approveWeekPending,
  onApproveAllRemaining,
  onRejectAll,
}: {
  staff: TeamWeekStaff;
  approveDayPending: boolean;
  approveWeekPending: boolean;
  onApproveAllRemaining: () => void;
  onRejectAll: () => void;
}) {
  const totalMs = staff.days.reduce((sum, d) => sum + workedMsForDay(d.entries), 0);
  const approved = staff.days.filter((d) => d.approval?.status === 'APPROVED').length;
  const rejected = staff.days.filter((d) => d.approval?.status === 'REJECTED').length;
  const pendingCorrection = staff.days.filter((d) => d.pendingCorrection).length;
  const empty = staff.days.filter((d) => d.entries.length === 0).length;
  const unreviewed = staff.days.filter(
    (d) => !d.approval && !d.pendingCorrection && d.entries.length > 0,
  ).length;

  const summaryParts: string[] = [];
  if (approved) summaryParts.push(`${approved} approved`);
  if (rejected) summaryParts.push(`${rejected} rejected`);
  if (pendingCorrection) summaryParts.push(`${pendingCorrection} pending correction${pendingCorrection > 1 ? 's' : ''}`);
  if (unreviewed) summaryParts.push(`${unreviewed} unreviewed`);
  if (empty) summaryParts.push(`${empty} empty`);

  return (
    <div className="pt-3" style={{ borderTop: '1px solid var(--kc-border)' }}>
      <div className="flex items-center justify-between text-sm mb-2">
        <span style={{ color: 'var(--kc-text-3)' }}>Total worked:</span>
        <span className="font-semibold tabular-nums" style={{ color: 'var(--kc-p-600)' }}>
          {fmtDuration(totalMs)}
        </span>
      </div>
      {summaryParts.length > 0 && (
        <p className="text-xs mb-3" style={{ color: 'var(--kc-text-3)' }}>
          {summaryParts.join(' · ')}
        </p>
      )}
      <div className="flex flex-col sm:flex-row sm:justify-end gap-2">
        <Button
          variant="outline"
          disabled={approveDayPending || unreviewed === 0}
          onClick={onApproveAllRemaining}
          title={unreviewed === 0 ? 'No days available to approve' : `Approve ${unreviewed} day${unreviewed > 1 ? 's' : ''}`}
          style={unreviewed > 0 ? { color: '#22c55e', borderColor: '#22c55e' } : undefined}
        >
          {approveDayPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          <CheckCircle className="mr-1 h-3.5 w-3.5" />
          Approve All Remaining
        </Button>
        <Button
          variant="outline"
          disabled={approveWeekPending}
          onClick={onRejectAll}
          style={{ color: 'var(--kc-error)', borderColor: 'var(--kc-error)' }}
        >
          <XCircle className="mr-1 h-3.5 w-3.5" />
          Reject All
        </Button>
      </div>
    </div>
  );
}
