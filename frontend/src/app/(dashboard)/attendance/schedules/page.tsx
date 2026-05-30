'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  Calendar,
  CheckCircle,
  Clock,
  Copy,
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
  useSchedules,
  useApproveSchedule,
  useDeleteSchedule,
  useDuplicateSchedule,
} from '@/lib/hooks/use-attendance';
import { ScheduleCalendar } from '@/components/attendance/schedule-calendar';
import { SchedulesSkeleton } from '@/components/skeletons/schedules-skeleton';
import { useCenter } from '@/lib/hooks/use-centers';
import { useStaff } from '@/lib/hooks/use-staff';
import { useAuthStore } from '@/store/auth';
import type { ScheduleWithStaff } from '@/lib/api/attendance';

const DAY_NAMES = ['', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function totalHours(s: ScheduleWithStaff) {
  return s.days.reduce((sum, d) => {
    if (d.isOff || !d.startTime || !d.endTime) return sum;
    const [sh, sm] = d.startTime.split(':').map(Number);
    const [eh, em] = d.endTime.split(':').map(Number);
    return sum + (eh + em / 60) - (sh + sm / 60);
  }, 0);
}

function ScheduleRow({ s }: { s: ScheduleWithStaff }) {
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
                <Button asChild variant="ghost" size="icon-xs" title="Edit">
                  <Link href={`/attendance/schedules/${s.id}/edit`}><Pencil className="h-3.5 w-3.5" /></Link>
                </Button>
                <Button variant="ghost" size="icon-xs" title="Approve" onClick={async () => {
                  try { await approve.mutateAsync(s.id); toast.success('Approved'); } catch (e) { toast.error(e instanceof Error ? e.message : 'Failed'); }
                }}><CheckCircle className="h-3.5 w-3.5" /></Button>
                <Button variant="ghost" size="icon-xs" title="Delete" onClick={() => setShowDelete(true)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </>
            )}
            <Button variant="ghost" size="icon-xs" title="Duplicate" onClick={async () => {
              try { await dup.mutateAsync(s.id); toast.success('Duplicated'); } catch (e) { toast.error(e instanceof Error ? e.message : 'Failed'); }
            }}><Copy className="h-3.5 w-3.5" /></Button>
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
            <AlertDialogAction onClick={async () => {
              try { await del.mutateAsync(s.id); toast.success('Deleted'); } catch (e) { toast.error(e instanceof Error ? e.message : 'Failed'); }
            }}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function ScheduleStats({ schedules }: { schedules: ScheduleWithStaff[] }) {
  const { data: staffData } = useStaff({ limit: 100 });

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
            <CardContent className="py-3 px-4 flex items-center gap-3">
              <div className="p-2 rounded-lg" style={{ background: card.color + '1A' }}>
                <Icon className="h-4 w-4" style={{ color: card.color }} />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide" style={{ color: 'var(--kc-text-3)' }}>{card.label}</p>
                <p className="text-sm font-semibold truncate" style={{ color: 'var(--kc-text-1)' }}>{card.value}</p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

export default function SchedulesPage() {
  const user = useAuthStore((s) => s.user);
  const { data: center } = useCenter(user?.centerId ?? undefined);
  const [tab, setTab] = useState<'calendar' | 'list'>('calendar');
  const [statusFilter, setStatusFilter] = useState('');
  const { data: schedules, isLoading } = useSchedules(
    statusFilter ? { status: statusFilter } : undefined,
  );

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
          <Button asChild>
            <Link href="/attendance/schedules/new">
              <Plus className="mr-2 h-4 w-4" /> Create
            </Link>
          </Button>
        </div>
      </div>

      {schedules && schedules.length > 0 && <ScheduleStats schedules={schedules} />}

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
            {schedules.map((s) => <ScheduleRow key={s.id} s={s} />)}
          </div>
        </div>
      )}
    </div>
  );
}
