'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  Calendar,
  CheckCircle,
  Clock,
  Copy,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  useSchedules,
  useApproveSchedule,
  useCreateSchedule,
  useDeleteSchedule,
  useDuplicateSchedule,
  useScheduleById,
  useUpdateSchedule,
} from '@/lib/hooks/use-attendance';
import { ScheduleCalendar } from '@/components/attendance/schedule-calendar';
import { ScheduleForm } from '@/components/attendance/schedule-form';
import { SchedulesSkeleton } from '@/components/skeletons/schedules-skeleton';
import { useCenter } from '@/lib/hooks/use-centers';
import { useStaff } from '@/lib/hooks/use-staff';
import { DateField } from '@/components/ui/date-field';
import { useAuthStore } from '@/store/auth';
import type { ScheduleWithStaff } from '@/lib/api/attendance';

function totalHours(s: ScheduleWithStaff) {
  return s.days.reduce((sum, d) => {
    if (d.isOff || !d.startTime || !d.endTime) return sum;
    const [sh, sm] = d.startTime.split(':').map(Number);
    const [eh, em] = d.endTime.split(':').map(Number);
    return sum + (eh + em / 60) - (sh + sm / 60);
  }, 0);
}

// ---------------------------------------------------------------------------
// In-tab Create Dialog (SA-only: shown when centerId is provided)
// ---------------------------------------------------------------------------

function getNextMonday() {
  const d = new Date();
  const day = d.getDay();
  const diff = day === 0 ? 1 : day === 1 ? 0 : 8 - day;
  d.setDate(d.getDate() + diff);
  return d.toLocaleDateString('en-CA');
}

const inputCls = 'h-9 rounded-md border px-3 text-sm w-full';
const inputStyle = {
  borderColor: 'var(--kc-border)',
  background: 'var(--kc-bg)',
  color: 'var(--kc-text-1)',
} as const;

interface CreateScheduleDialogProps {
  open: boolean;
  onClose: () => void;
  centerId: string;
}

function CreateScheduleDialog({ open, onClose, centerId }: CreateScheduleDialogProps) {
  const { data: staffData } = useStaff({ centerId, limit: 100 });
  const create = useCreateSchedule(centerId);

  const [staffId, setStaffId] = useState('');
  const [weekStart, setWeekStart] = useState(getNextMonday);
  const [submitting, setSubmitting] = useState(false);

  const selectedStaff = staffData?.data.find((s) => s.id === staffId);

  const handleSubmit = async (days: Parameters<typeof create.mutateAsync>[0]['days']) => {
    if (!staffId) { toast.error('Select a staff member'); return; }
    setSubmitting(true);
    try {
      await create.mutateAsync({ staffId, weekStart, days });
      toast.success('Schedule created');
      // reset for next use
      setStaffId('');
      setWeekStart(getNextMonday());
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Create Schedule</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          {/* Staff + Week row */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium" style={{ color: 'var(--kc-text-1)' }}>
                Staff Member
              </label>
              <select
                value={staffId}
                onChange={(e) => setStaffId(e.target.value)}
                className={inputCls}
                style={inputStyle}
              >
                <option value="">Select staff…</option>
                {staffData?.data
                  .filter((s) => s.status === 'ACTIVE')
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.firstName} {s.lastName}
                    </option>
                  ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium" style={{ color: 'var(--kc-text-1)' }}>
                Week Starting (Monday)
              </label>
              <DateField
                value={weekStart}
                onChange={(e) => setWeekStart(e.target.value)}
              />
            </div>
          </div>

          {/* Day-hours form (reused from ScheduleForm) */}
          <ScheduleForm
            staffName={selectedStaff ? `${selectedStaff.firstName} ${selectedStaff.lastName}` : undefined}
            weekLabel={`Week of ${weekStart}`}
            submitLabel={submitting ? 'Creating…' : 'Save Schedule'}
            onSubmit={handleSubmit}
            isPending={submitting}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// In-tab Edit Dialog (SA-only: shown when centerId is provided)
// ---------------------------------------------------------------------------

interface EditScheduleDialogProps {
  open: boolean;
  onClose: () => void;
  scheduleId: string;
}

function EditScheduleDialog({ open, onClose, scheduleId }: EditScheduleDialogProps) {
  const { data: schedule, isLoading } = useScheduleById(scheduleId);
  const update = useUpdateSchedule();

  const handleSubmit = async (days: Parameters<typeof update.mutateAsync>[0]['days']) => {
    try {
      await update.mutateAsync({ id: scheduleId, days });
      toast.success('Schedule updated');
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed');
    }
  };

  const isDraft = schedule?.status === 'DRAFT';
  const statusStyle = isDraft
    ? { bg: 'var(--kc-warning-bg)', color: 'var(--kc-warning)' }
    : { bg: 'color-mix(in oklch, var(--kc-p-100), transparent 30%)', color: 'var(--kc-p-700)' };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            {isDraft ? 'Edit' : 'View'} Schedule
            {schedule && (
              <Badge style={{ background: statusStyle.bg, color: statusStyle.color }}>
                {schedule.status}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin" style={{ color: 'var(--kc-text-3)' }} />
          </div>
        ) : !schedule ? null : (
          <div className="space-y-4 pt-1">
            {!isDraft && (
              <div
                className="rounded-lg border p-3 text-sm"
                style={{
                  background: 'var(--kc-surface-2)',
                  borderColor: 'var(--kc-border)',
                  color: 'var(--kc-text-2)',
                }}
              >
                This schedule is approved and cannot be edited. Use &quot;Duplicate&quot; to create a new version.
              </div>
            )}
            <ScheduleForm
              initialDays={schedule.days}
              staffName={`${schedule.staff.firstName} ${schedule.staff.lastName}`}
              weekLabel={`Week of ${schedule.startDate.split('T')[0]}`}
              submitLabel="Update Schedule"
              onSubmit={handleSubmit}
              isPending={update.isPending}
              readonly={!isDraft}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Schedule row
// ---------------------------------------------------------------------------

interface ScheduleRowProps {
  s: ScheduleWithStaff;
  /** When provided the Edit button opens an in-tab dialog instead of navigating away */
  onEdit?: (id: string) => void;
}

function ScheduleRow({ s, onEdit }: ScheduleRowProps) {
  const approve = useApproveSchedule();
  const del = useDeleteSchedule();
  const dup = useDuplicateSchedule();
  const [showDelete, setShowDelete] = useState(false);

  const isDraft = s.status === 'DRAFT';
  const hours = totalHours(s);
  const statusStyle = isDraft
    ? { bg: 'var(--kc-warning-bg)', color: 'var(--kc-warning)' }
    : { bg: 'color-mix(in oklch, var(--kc-p-100), transparent 30%)', color: 'var(--kc-p-700)' };

  return (
    <>
      <div className="p-3 rounded-lg" style={{ background: 'var(--kc-surface-2)' }}>
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium" style={{ color: 'var(--kc-text-1)' }}>
                {s.staff.firstName} {s.staff.lastName}
              </span>
              <Badge style={{ background: statusStyle.bg, color: statusStyle.color }}>{s.status}</Badge>
              <span className="text-xs" style={{ color: 'var(--kc-text-3)' }}>
                {s.startDate.split('T')[0]} | {Math.round(hours)}h
              </span>
            </div>
          </div>
          <div className="flex gap-1 flex-none">
            {isDraft && (
              <>
                {/* Edit — in-tab dialog (SA) or navigation (director) */}
                {onEdit ? (
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    title="Edit"
                    onClick={() => onEdit(s.id)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                ) : (
                  <Button asChild variant="ghost" size="icon-xs" title="Edit">
                    <Link href={`/attendance/schedules/${s.id}/edit`}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Link>
                  </Button>
                )}

                {/* Approve */}
                <Button
                  variant="ghost"
                  size="icon-xs"
                  title="Approve"
                  onClick={async () => {
                    try {
                      await approve.mutateAsync(s.id);
                      toast.success('Approved');
                    } catch (e) {
                      toast.error(e instanceof Error ? e.message : 'Failed');
                    }
                  }}
                >
                  <CheckCircle className="h-3.5 w-3.5" />
                </Button>

                {/* Delete */}
                <Button variant="ghost" size="icon-xs" title="Delete" onClick={() => setShowDelete(true)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </>
            )}

            {/* Duplicate — always available */}
            <Button
              variant="ghost"
              size="icon-xs"
              title="Duplicate"
              onClick={async () => {
                try {
                  await dup.mutateAsync(s.id);
                  toast.success('Duplicated');
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : 'Failed');
                }
              }}
            >
              <Copy className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>

      <AlertDialog open={showDelete} onOpenChange={setShowDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete schedule?</AlertDialogTitle>
            <AlertDialogDescription>
              Delete schedule for {s.staff.firstName} {s.staff.lastName} ({s.startDate.split('T')[0]})?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                try {
                  await del.mutateAsync(s.id);
                  toast.success('Deleted');
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : 'Failed');
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ---------------------------------------------------------------------------
// Stats strip
// ---------------------------------------------------------------------------

function ScheduleStats({
  schedules,
  centerId,
}: {
  schedules: ScheduleWithStaff[];
  centerId?: string;
}) {
  const { data: staffData } = useStaff(centerId ? { centerId, limit: 100 } : { limit: 100 });

  const now = new Date();
  const jsDay = now.getDay();
  const thisMonday = new Date(now);
  thisMonday.setDate(now.getDate() - (jsDay === 0 ? 6 : jsDay - 1));
  const thisMondayStr = thisMonday.toLocaleDateString('en-CA');

  const totalStaff = staffData?.data.filter((s) => s.status === 'ACTIVE').length ?? 0;

  const thisWeekSchedules = schedules.filter((s) => s.startDate.split('T')[0] === thisMondayStr);
  const scheduledStaff = new Set(thisWeekSchedules.map((s) => s.staffId)).size;

  const thisWeekHours = thisWeekSchedules.reduce((sum, s) => sum + totalHours(s), 0);

  const weeksAhead = [1, 2, 3, 4].map((w) => {
    const d = new Date(thisMonday);
    d.setDate(d.getDate() + w * 7);
    return d.toLocaleDateString('en-CA');
  });
  const missingWeeks = weeksAhead.filter(
    (monday) => !schedules.some((s) => s.startDate.split('T')[0] === monday),
  ).length;

  const nextUnscheduled = weeksAhead.find(
    (monday) => !schedules.some((s) => s.startDate.split('T')[0] === monday),
  );
  const nextUnscheduledLabel = nextUnscheduled
    ? (() => {
        const start = new Date(nextUnscheduled + 'T12:00:00');
        const end = new Date(start);
        end.setDate(end.getDate() + 6);
        return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
      })()
    : 'All covered';

  const cards = [
    { label: 'Staff Scheduled', value: `${scheduledStaff}/${totalStaff} staff`, icon: Users, color: 'var(--kc-p-600)' },
    { label: 'Weeks Without Schedule', value: missingWeeks > 0 ? `${missingWeeks} week${missingWeeks > 1 ? 's' : ''} ahead missing` : 'All covered', icon: AlertTriangle, color: 'var(--kc-warning)' },
    { label: 'Total Hours This Week', value: `${Math.round(thisWeekHours)}h assigned`, icon: Clock, color: '#22c55e' },
    { label: 'Next Unscheduled Week', value: nextUnscheduledLabel, icon: Calendar, color: 'var(--kc-text-3)' },
  ];

  return (
    <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card key={card.label}>
            <CardContent className="flex flex-col items-center gap-2 py-3 px-4 text-center">
              <div className="p-2 rounded-lg" style={{ background: card.color + '1A' }}>
                <Icon className="h-4 w-4" style={{ color: card.color }} />
              </div>
              <div className="w-full min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide" style={{ color: 'var(--kc-text-3)' }}>{card.label}</p>
                <p className="text-sm font-semibold" style={{ color: 'var(--kc-text-1)' }}>{card.value}</p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main view
// ---------------------------------------------------------------------------

export function SchedulesView({ centerId }: { centerId?: string }) {
  const user = useAuthStore((s) => s.user);
  // Prefer the explicit centerId prop; fall back to the logged-in user's center
  const resolvedCenterId = centerId ?? user?.centerId ?? undefined;
  const { data: center } = useCenter(resolvedCenterId);
  const [tab, setTab] = useState<'calendar' | 'list'>('calendar');
  const [statusFilter, setStatusFilter] = useState('');
  const { data: schedules, isLoading } = useSchedules(
    statusFilter ? { status: statusFilter, centerId } : { centerId },
  );

  // In-tab dialog state — only used when centerId is explicitly provided (SA context)
  const [showCreate, setShowCreate] = useState(false);
  const [editScheduleId, setEditScheduleId] = useState<string | null>(null);

  // SA context: centerId prop is explicitly set → use in-tab dialogs
  const isSAContext = !!centerId;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold">Schedules</h1>
        </div>
        <div className="flex gap-2">
          <div className="flex rounded-md border overflow-hidden" style={{ borderColor: 'var(--kc-border)' }}>
            <button
              className="px-3 py-1.5 text-xs font-medium transition-colors"
              style={{
                background: tab === 'calendar' ? 'var(--kc-p-600)' : 'var(--kc-bg)',
                color: tab === 'calendar' ? 'white' : 'var(--kc-text-2)',
              }}
              onClick={() => setTab('calendar')}
            >
              Calendar
            </button>
            <button
              className="px-3 py-1.5 text-xs font-medium transition-colors border-l"
              style={{
                borderColor: 'var(--kc-border)',
                background: tab === 'list' ? 'var(--kc-p-600)' : 'var(--kc-bg)',
                color: tab === 'list' ? 'white' : 'var(--kc-text-2)',
              }}
              onClick={() => setTab('list')}
            >
              List
            </button>
          </div>

          {/* Create button — in-tab dialog (SA) or navigation (director) */}
          {isSAContext ? (
            <Button onClick={() => setShowCreate(true)}>
              <Plus className="mr-2 h-4 w-4" /> Create Schedule
            </Button>
          ) : (
            <Button asChild>
              <Link href="/attendance/schedules/new">
                <Plus className="mr-2 h-4 w-4" /> Create
              </Link>
            </Button>
          )}
        </div>
      </div>

      {schedules && schedules.length > 0 && (
        <ScheduleStats schedules={schedules} centerId={centerId} />
      )}

      {isLoading ? (
        <SchedulesSkeleton />
      ) : !schedules?.length ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Calendar className="mx-auto h-10 w-10 mb-3" style={{ color: 'var(--kc-text-3)' }} />
            <p className="text-sm" style={{ color: 'var(--kc-text-2)' }}>No schedules found</p>
          </CardContent>
        </Card>
      ) : tab === 'calendar' ? (
        <ScheduleCalendar
          schedules={schedules}
          centerOpenTime={center?.centerHours?.[0]?.openTime}
          centerCloseTime={center?.centerHours?.[0]?.closeTime}
        />
      ) : (
        <div className="space-y-4">
          <div className="flex gap-2">
            {['', 'DRAFT', 'APPROVED'].map((s) => (
              <Button key={s} variant={statusFilter === s ? 'default' : 'outline'} size="sm" onClick={() => setStatusFilter(s)}>
                {s || 'All'}
              </Button>
            ))}
          </div>
          <div className="space-y-2">
            {schedules.map((s) => (
              <ScheduleRow
                key={s.id}
                s={s}
                onEdit={isSAContext ? (id) => setEditScheduleId(id) : undefined}
              />
            ))}
          </div>
        </div>
      )}

      {/* In-tab dialogs (SA context only) */}
      {isSAContext && (
        <>
          <CreateScheduleDialog
            open={showCreate}
            onClose={() => setShowCreate(false)}
            centerId={centerId}
          />
          {editScheduleId && (
            <EditScheduleDialog
              open={!!editScheduleId}
              onClose={() => setEditScheduleId(null)}
              scheduleId={editScheduleId}
            />
          )}
        </>
      )}
    </div>
  );
}
