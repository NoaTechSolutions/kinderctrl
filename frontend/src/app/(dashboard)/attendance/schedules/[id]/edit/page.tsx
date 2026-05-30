'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScheduleForm } from '@/components/attendance/schedule-form';
import { useScheduleById, useUpdateSchedule } from '@/lib/hooks/use-attendance';

export default function EditSchedulePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { data: schedule, isLoading } = useScheduleById(id);
  const update = useUpdateSchedule();

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-3xl">
        <Skeleton className="h-8 w-24 rounded" />
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-48 rounded" />
            <Skeleton className="h-4 w-64 rounded" />
          </div>
          <Skeleton className="h-6 w-20 rounded-md" />
        </div>
        <Skeleton className="h-80 w-full rounded-lg" />
      </div>
    );
  }

  if (!schedule) return null;

  const isDraft = schedule.status === 'DRAFT';
  const statusStyle = isDraft
    ? { bg: 'var(--kc-warning-bg)', color: 'var(--kc-warning)' }
    : { bg: 'color-mix(in oklch, var(--kc-p-100), transparent 30%)', color: 'var(--kc-p-700)' };

  const handleSubmit = async (days: Parameters<typeof update.mutateAsync>[0]['days']) => {
    try {
      await update.mutateAsync({ id, days });
      toast.success('Schedule updated');
      router.push('/attendance/schedules');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed');
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link href="/attendance/schedules"><ArrowLeft className="mr-1 h-4 w-4" /> Back</Link>
        </Button>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold">
            {isDraft ? 'Edit' : 'View'} Schedule
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--kc-text-3)' }}>
            {schedule.staff.firstName} {schedule.staff.lastName} — {schedule.startDate.split('T')[0]}
          </p>
        </div>
        <Badge style={{ background: statusStyle.bg, color: statusStyle.color }}>
          {schedule.status}
        </Badge>
      </div>

      {!isDraft && (
        <div
          className="rounded-lg border p-3 text-sm"
          style={{ background: 'var(--kc-surface-2)', borderColor: 'var(--kc-border)', color: 'var(--kc-text-2)' }}
        >
          This schedule is approved and cannot be edited. Use &quot;Duplicate&quot; from the list to create a new version.
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
  );
}
