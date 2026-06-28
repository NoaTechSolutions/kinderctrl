'use client';

import {
  CalendarOff,
  CheckCircle2,
  Clock,
  ClockArrowDown,
  DoorOpen,
  LogIn,
  LogOut,
  Minus,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { useTimeFormat } from '@/lib/preferences/time-format';
import { formatTime } from '@/lib/format-time';
import { Skeleton } from '@/components/ui/skeleton';
import { ReadCard } from '@/components/ui/section-frame';
import { StatTile } from '@/components/ui/stat-tile';
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

// Deterministic avatar tint by id (mirrors the Staff / Child roster cards).
const AVATAR_PALETTE = [
  'var(--kc-p-600)',
  'var(--kc-info)',
  'var(--kc-warning)',
  'var(--kc-error)',
];
function avatarColor(id: string): string {
  let sum = 0;
  for (let i = 0; i < id.length; i++) sum += id.charCodeAt(i);
  return AVATAR_PALETTE[sum % AVATAR_PALETTE.length];
}

const ROLE_LABEL: Record<TeamMember['staff']['role'], string> = {
  TEACHER: 'Teacher',
  ASSISTANT: 'Assistant',
  ADMIN: 'Center Admin',
};

type AttStatus =
  | 'PRESENT'
  | 'END_OF_SHIFT'
  | 'NOT_ARRIVED'
  | 'NOT_SCHEDULED'
  | 'EARLY_DEPARTURE';

// Attendance band — same color/icon language as the Staff / Child roster cards.
const BAND: Record<
  AttStatus,
  { icon: LucideIcon; label: string; fg: string; bg: string }
> = {
  PRESENT: { icon: CheckCircle2, label: 'Present', fg: 'var(--kc-success)', bg: 'var(--kc-success-bg)' },
  END_OF_SHIFT: { icon: DoorOpen, label: 'End of shift', fg: 'var(--kc-error)', bg: 'var(--kc-error-bg)' },
  NOT_ARRIVED: { icon: Clock, label: 'Not arrived yet', fg: 'var(--kc-warning)', bg: 'var(--kc-warning-bg)' },
  NOT_SCHEDULED: { icon: CalendarOff, label: 'Not scheduled', fg: 'var(--kc-text-3)', bg: 'var(--kc-surface-2)' },
  EARLY_DEPARTURE: {
    icon: ClockArrowDown,
    label: 'Early departure',
    fg: 'color-mix(in oklch, var(--kc-warning), var(--kc-error))',
    bg: 'color-mix(in oklch, var(--kc-warning-bg), var(--kc-error-bg))',
  },
};

// Today's attendance derived from the team-today punches + shift status. The
// endpoint only returns ACTIVE staff, so NOT_SCHEDULED / EARLY_DEPARTURE never
// occur here — the band config carries them only for parity with the staff cards.
function deriveAttendance(member: TeamMember): {
  status: AttStatus;
  checkInTime?: string;
  checkOutTime?: string;
} {
  const ci = member.entries.find((e) => e.type === 'CLOCK_IN');
  const co = member.entries.find((e) => e.type === 'CLOCK_OUT');
  if (member.shiftStatus.clockedOut) {
    return {
      status: 'END_OF_SHIFT',
      checkInTime: ci?.deviceTimestamp,
      checkOutTime: co?.deviceTimestamp,
    };
  }
  if (member.shiftStatus.clockedIn) {
    return { status: 'PRESENT', checkInTime: ci?.deviceTimestamp };
  }
  return { status: 'NOT_ARRIVED' };
}

function AttendanceBand({ status }: { status: AttStatus }) {
  const cfg = BAND[status] ?? BAND.NOT_ARRIVED;
  const Icon = cfg.icon;
  return (
    <div
      className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium"
      style={{ background: cfg.bg, color: cfg.fg }}
    >
      <Icon className="h-3.5 w-3.5 flex-none" aria-hidden />
      <span className="truncate">{cfg.label}</span>
    </div>
  );
}

// Compact vertical roster card — attendance band + initials avatar + name +
// role + shift-status badge + a bottom in/out line. Replaces the old flat rows.
function TeamMemberCard({ member, tf }: { member: TeamMember; tf: '12h' | '24h' }) {
  const att = deriveAttendance(member);
  const bandFg = (BAND[att.status] ?? BAND.NOT_ARRIVED).fg;
  const fullName = `${member.staff.firstName} ${member.staff.lastName}`;

  let DetailIcon: LucideIcon = Minus;
  let detailText = 'No record';
  if (att.status === 'END_OF_SHIFT' && att.checkOutTime) {
    DetailIcon = LogOut;
    detailText = `Out ${formatTime(att.checkOutTime, tf)}`;
  } else if (att.status === 'PRESENT' && att.checkInTime) {
    DetailIcon = LogIn;
    detailText = `In ${formatTime(att.checkInTime, tf)}`;
  }

  return (
    <div
      className="flex h-full flex-col overflow-hidden rounded-lg border"
      style={{ borderColor: 'var(--kc-border)', background: 'var(--kc-surface)' }}
    >
      <AttendanceBand status={att.status} />
      <div className="flex flex-1 flex-col items-center gap-1.5 p-3 text-center">
        <div
          className="flex h-12 w-12 flex-none items-center justify-center rounded-full text-sm font-semibold text-white"
          style={{ background: avatarColor(member.staff.id) }}
        >
          {member.staff.firstName[0]}
          {member.staff.lastName[0]}
        </div>
        <div className="w-full min-w-0">
          <p
            className="truncate text-[13px] font-medium"
            style={{ color: 'var(--kc-text-1)' }}
            title={fullName}
          >
            {fullName}
          </p>
          <p className="truncate text-xs" style={{ color: 'var(--kc-text-3)' }}>
            {ROLE_LABEL[member.staff.role]}
          </p>
        </div>
        {statusBadge(member)}
      </div>
      <div className="mt-auto border-t px-3 py-2" style={{ borderColor: 'var(--kc-border)' }}>
        <span
          className="flex items-center justify-center gap-1.5 text-xs font-medium tabular-nums"
          style={{ color: bandFg }}
        >
          <DetailIcon className="h-3.5 w-3.5 flex-none" aria-hidden />
          <span className="truncate">{detailText}</span>
        </span>
      </div>
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
        <StatTile label="Working now" value={String(working)} color="var(--kc-p-600)" />
        <StatTile label="On break" value={String(onBreak)} color="var(--kc-warning)" />
        <StatTile label="Total staff" value={String(total)} color="var(--kc-text-2)" />
      </div>

      <ReadCard icon={Users} title="Team Clock">
        {!data?.data.length ? (
          <p className="text-sm py-4 text-center" style={{ color: 'var(--kc-text-3)' }}>
            No active staff in this center
          </p>
        ) : (
          <div
            className="grid gap-3"
            style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}
          >
            {data.data.map((member) => (
              <TeamMemberCard key={member.staff.id} member={member} tf={tf} />
            ))}
          </div>
        )}
      </ReadCard>
    </>
  );
}
