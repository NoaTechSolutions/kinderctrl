'use client';

import { Users } from 'lucide-react';
import { useTimeFormat } from '@/lib/preferences/time-format';
import { formatTime } from '@/lib/format-time';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { CardWithHeader } from '@/components/ui/card-with-header';
import { Badge } from '@/components/ui/badge';
import { useTeamToday } from '@/lib/hooks/use-attendance';
import type { TeamMember } from '@/lib/api/attendance';

function statusBadge(member: TeamMember) {
  const s = member.shiftStatus;
  if (s.clockedOut)
    return <Badge variant="secondary">Done</Badge>;
  if (s.onBreak)
    return (
      <Badge
        style={{ background: 'var(--kc-warning-bg)', color: 'var(--kc-warning)' }}
      >
        On Break
      </Badge>
    );
  if (s.clockedIn)
    return (
      <Badge
        style={{
          background: 'color-mix(in oklch, var(--kc-p-100), transparent 30%)',
          color: 'var(--kc-p-700)',
        }}
      >
        Working
      </Badge>
    );
  return (
    <Badge variant="outline" style={{ color: 'var(--kc-text-3)' }}>
      Not In
    </Badge>
  );
}

function TeamRow({ member, tf }: { member: TeamMember; tf: '12h' | '24h' }) {
  const clockIn = member.entries.find((e) => e.type === 'CLOCK_IN');
  const clockOut = member.entries.find((e) => e.type === 'CLOCK_OUT');

  return (
    <div
      className="flex items-center justify-between py-3 px-4 rounded-lg"
      style={{ background: 'var(--kc-surface-2)' }}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div
          className="flex h-9 w-9 flex-none items-center justify-center rounded-full text-sm font-medium"
          style={{
            background:
              'color-mix(in oklch, var(--kc-p-100), transparent 30%)',
            color: 'var(--kc-p-700)',
          }}
        >
          {member.staff.firstName[0]}
          {member.staff.lastName[0]}
        </div>
        <div className="min-w-0">
          <p
            className="text-sm font-medium truncate"
            style={{ color: 'var(--kc-text-1)' }}
          >
            {member.staff.firstName} {member.staff.lastName}
          </p>
          {clockIn && (
            <p className="text-xs" style={{ color: 'var(--kc-text-3)' }}>
              In: {formatTime(clockIn.deviceTimestamp, tf)}
              {clockOut && <> — Out: {formatTime(clockOut.deviceTimestamp, tf)}</>}
            </p>
          )}
        </div>
      </div>
      {statusBadge(member)}
    </div>
  );
}

export function TeamClockView({ centerId }: { centerId?: string }) {
  const { data, isLoading } = useTeamToday(centerId);
  const { timeFormat: tf } = useTimeFormat();

  const working = data?.data.filter((m) => m.shiftStatus.clockedIn && !m.shiftStatus.clockedOut).length ?? 0;
  const onBreak = data?.data.filter((m) => m.shiftStatus.onBreak).length ?? 0;
  const total = data?.data.length ?? 0;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </div>
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <Card>
          <CardContent className="flex flex-col items-center pt-4 text-center">
            <p className="text-2xl font-display font-semibold" style={{ color: 'var(--kc-p-600)' }}>
              {working}
            </p>
            <p className="text-xs" style={{ color: 'var(--kc-text-3)' }}>Working now</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col items-center pt-4 text-center">
            <p className="text-2xl font-display font-semibold" style={{ color: 'var(--kc-warning)' }}>
              {onBreak}
            </p>
            <p className="text-xs" style={{ color: 'var(--kc-text-3)' }}>On break</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col items-center pt-4 text-center">
            <p className="text-2xl font-display font-semibold" style={{ color: 'var(--kc-text-2)' }}>
              {total}
            </p>
            <p className="text-xs" style={{ color: 'var(--kc-text-3)' }}>Total staff</p>
          </CardContent>
        </Card>
      </div>

      <CardWithHeader icon={Users} title="Team Clock">
        {!data?.data.length ? (
          <p className="text-sm py-4 text-center" style={{ color: 'var(--kc-text-3)' }}>
            No active staff in this center
          </p>
        ) : (
          <div className="space-y-2">
            {data.data.map((member) => (
              <TeamRow key={member.staff.id} member={member} tf={tf} />
            ))}
          </div>
        )}
      </CardWithHeader>
    </>
  );
}
