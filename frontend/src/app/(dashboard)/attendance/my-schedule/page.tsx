'use client';

import { Calendar } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthStore } from '@/store/auth';
import { useMySchedule } from '@/lib/hooks/use-attendance';
import { ScheduleCalendar } from '@/components/attendance/schedule-calendar';
import type { ScheduleWithStaff } from '@/lib/api/attendance';

export default function MySchedulePage() {
  const user = useAuthStore((s) => s.user);
  const { data: schedules, isLoading } = useMySchedule();

  if (!user) return null;

  // ScheduleCalendar expects ScheduleWithStaff[]; my-schedule returns plain
  // Schedule[] (single staff = the logged-in user). Attach the user's identity
  // so the calendar can label/color the blocks. Read-only: no edit links.
  const schedulesWithStaff: ScheduleWithStaff[] = (schedules ?? []).map((s) => ({
    ...s,
    staff: {
      id: s.staffId,
      firstName: user.firstName ?? '',
      lastName: user.lastName ?? '',
    },
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">My Schedule</h1>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-lg" />
          ))}
        </div>
      ) : !schedules?.length ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Calendar
              className="mx-auto h-10 w-10 mb-3"
              style={{ color: 'var(--kc-text-3)' }}
            />
            <p className="text-sm" style={{ color: 'var(--kc-text-2)' }}>
              No schedules assigned yet
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--kc-text-3)' }}>
              Your director will publish your schedule here
            </p>
          </CardContent>
        </Card>
      ) : (
        <ScheduleCalendar schedules={schedulesWithStaff} readonly singleStaffMode />
      )}
    </div>
  );
}
