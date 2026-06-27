'use client';

import Link from 'next/link';
import {
  Briefcase,
  Building2,
  CalendarDays,
  CalendarOff,
  CheckCircle2,
  Clock,
  ClockArrowDown,
  DoorOpen,
  LogIn,
  LogOut,
  Mail,
  Minus,
  Phone,
  type LucideIcon,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { initialsFor } from '@/components/profile/user-avatar';
import { useTranslation } from '@/lib/i18n';
import { formatClockTime } from '@/lib/format-child';
import { formatPhoneUS } from '@/lib/utils/phone';
import {
  staffAttendanceProxy,
  type Staff,
  type StaffAttendanceStatus,
  type StaffAttendanceToday,
} from '@/lib/types/staff';
import type { UserRole } from '@/store/auth';
import { StaffStatusBadge } from './staff-status-badge';
import { StaffActionsMenu } from './staff-actions-menu';

interface StaffCardProps {
  staff: Staff;
  // SUPER_ADMIN sees a Center row to disambiguate cross-center listings.
  userRole?: UserRole;
}

type Translator = (key: string) => string;

const ROLE_LABEL_KEY: Record<Staff['role'], string> = {
  TEACHER: 'staff.roleTeacher',
  ASSISTANT: 'staff.roleAssistant',
  ADMIN: 'staff.roleAdmin',
};

const EMPLOYMENT_LABEL_KEY: Record<string, string> = {
  full_time: 'staff.employmentFullTime',
  part_time: 'staff.employmentPartTime',
};

// No-photo avatar palette — rotated deterministically by the staff id so the
// same person always reads the same color (all SAAS tokens). Mirrors ChildCard.
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

// Attendance band — keyed on today's time-clock status, identical color/icon
// language to ChildCard's band. EARLY_DEPARTURE has no semantic token so it's
// mixed between warning and danger.
const BAND: Record<
  StaffAttendanceStatus,
  { icon: LucideIcon; labelKey: string; fg: string; bg: string }
> = {
  PRESENT: {
    icon: CheckCircle2,
    labelKey: 'staff.attPresent',
    fg: 'var(--kc-success)',
    bg: 'var(--kc-success-bg)',
  },
  END_OF_SHIFT: {
    icon: DoorOpen,
    labelKey: 'staff.attEndOfShift',
    fg: 'var(--kc-error)',
    bg: 'var(--kc-error-bg)',
  },
  NOT_ARRIVED: {
    icon: Clock,
    labelKey: 'staff.attNotArrived',
    fg: 'var(--kc-warning)',
    bg: 'var(--kc-warning-bg)',
  },
  NOT_SCHEDULED: {
    icon: CalendarOff,
    labelKey: 'staff.attNotScheduled',
    fg: 'var(--kc-text-3)',
    bg: 'var(--kc-surface-2)',
  },
  EARLY_DEPARTURE: {
    icon: ClockArrowDown,
    labelKey: 'staff.attEarlyDeparture',
    fg: 'color-mix(in oklch, var(--kc-warning), var(--kc-error))',
    bg: 'color-mix(in oklch, var(--kc-warning-bg), var(--kc-error-bg))',
  },
};

// Bottom-anchored detail line: an icon + a check-in/out time, or a "no record"
// placeholder. Resolved per status (mirror of ChildCard's bandRight).
function attendanceDetail(
  att: StaffAttendanceToday,
  t: Translator,
): { icon: LucideIcon; text: string } {
  switch (att.status) {
    case 'PRESENT':
      return {
        icon: LogIn,
        text: `${t('staff.attCheckIn')} ${att.checkInTime ? formatClockTime(att.checkInTime) : ''}`.trim(),
      };
    case 'END_OF_SHIFT':
      return {
        icon: LogOut,
        text: `${t('staff.attCheckOut')} ${att.checkOutTime ? formatClockTime(att.checkOutTime) : ''}`.trim(),
      };
    case 'EARLY_DEPARTURE':
      return {
        icon: LogOut,
        text: att.checkOutTime ? formatClockTime(att.checkOutTime) : '',
      };
    case 'NOT_ARRIVED':
      return { icon: Minus, text: t('staff.attNoRecord') };
    case 'NOT_SCHEDULED':
    default:
      return { icon: Minus, text: t('staff.attNotAttending') };
  }
}

function AttendanceBand({ att, t }: { att: StaffAttendanceToday; t: Translator }) {
  const cfg = BAND[att.status] ?? BAND.NOT_SCHEDULED;
  const Icon = cfg.icon;
  return (
    <div
      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium"
      style={{ background: cfg.bg, color: cfg.fg }}
    >
      <Icon className="h-3.5 w-3.5 flex-none" aria-hidden />
      <span className="truncate">{t(cfg.labelKey)}</span>
    </div>
  );
}

// Director/SA roster card — used on phones AND the desktop "cards" view (toggle).
// Mirrors ChildCard: attendance band + initials avatar + name + key info + a
// bottom-anchored attendance detail line and actions kebab. Whole card
// navigates to the detail page.
export function StaffCard({ staff, userRole }: StaffCardProps) {
  const { t } = useTranslation();
  const fullName = `${staff.firstName} ${staff.lastName}`;
  const showCenter = userRole === 'SUPER_ADMIN' && !!staff.centerName;
  const employmentLabel = EMPLOYMENT_LABEL_KEY[staff.employmentType]
    ? t(EMPLOYMENT_LABEL_KEY[staff.employmentType])
    : staff.employmentType;

  // Prefer a real attendanceToday when the list endpoint provides it; until
  // then fall back to the status proxy (no PRESENT/END_OF_SHIFT without a punch).
  const att = staff.attendanceToday ?? staffAttendanceProxy(staff.status);
  const detail = attendanceDetail(att, t);
  const DetailIcon = detail.icon;
  const bandFg = (BAND[att.status] ?? BAND.NOT_SCHEDULED).fg;

  return (
    <Card className="relative flex h-full flex-col gap-0 overflow-hidden py-0 transition-shadow hover:shadow-md">
      {/* Stretched nav link covers the card as a SIBLING of the content (not a
          parent of the kebab — that would be invalid <a><button>). */}
      <Link
        href={`/staff/${staff.id}`}
        aria-label={fullName}
        className="absolute inset-0 z-0"
      />
      <div className="pointer-events-none relative flex h-full flex-col">
        {/* 1 — attendance band */}
        <AttendanceBand att={att} t={t} />

        {/* 2 — initials avatar (4/3) */}
        <div
          className="relative w-full overflow-hidden"
          style={{ aspectRatio: '4 / 3' }}
        >
          <div
            className="flex h-full w-full items-center justify-center font-semibold text-white"
            style={{ background: avatarColor(staff.id), fontSize: '48px' }}
          >
            {initialsFor({ firstName: staff.firstName, lastName: staff.lastName })}
          </div>
        </div>

        {/* 3 — body */}
        <div className="flex flex-1 flex-col p-3">
          <div className="space-y-2">
            <h3
              className="truncate text-base font-semibold leading-tight"
              style={{ color: 'var(--kc-text-1)' }}
              title={fullName}
            >
              {fullName}
            </h3>

            {/* Role · Status badge — same row */}
            <div className="flex items-center justify-between gap-2">
              <span
                className="truncate text-sm"
                style={{ color: 'var(--kc-text-3)' }}
              >
                {t(ROLE_LABEL_KEY[staff.role])}
              </span>
              <StaffStatusBadge status={staff.status} />
            </div>

            <div className="border-t" style={{ borderColor: 'var(--kc-border)' }} />

            <InfoRow icon={Mail} truncate title={staff.email}>
              {staff.email}
            </InfoRow>
            {staff.phone && (
              <InfoRow icon={Phone}>{formatPhoneUS(staff.phone)}</InfoRow>
            )}
            <InfoRow icon={Briefcase}>
              {employmentLabel}
              {staff.hourlyRate != null && (
                <span style={{ color: 'var(--kc-text-3)' }}>
                  {' · $'}
                  {staff.hourlyRate.toFixed(2)}/hr
                </span>
              )}
            </InfoRow>
            {showCenter && (
              <InfoRow icon={Building2} truncate title={staff.centerName ?? ''}>
                {staff.centerName}
              </InfoRow>
            )}
            <InfoRow icon={CalendarDays}>
              {t('staff.hireDate')}: {new Date(staff.hireDate).toLocaleDateString()}
            </InfoRow>
          </div>

          {/* Bottom-anchored: separator + attendance detail (left) + kebab
              (right). mt-auto pins it to the bottom so every card in a row has
              an identical footer regardless of how many info rows it has. */}
          <div className="mt-auto pt-3">
            <div className="border-t" style={{ borderColor: 'var(--kc-border)' }} />
            <div className="mt-2 flex items-center justify-between gap-2">
              <span
                className="flex min-w-0 items-center gap-1.5 text-sm font-medium tabular-nums"
                style={{ color: bandFg }}
              >
                <DetailIcon className="h-3.5 w-3.5 flex-none" aria-hidden />
                <span className="truncate">{detail.text}</span>
              </span>
              <span className="pointer-events-auto relative z-10 flex-none">
                <StaffActionsMenu staff={staff} variant="card" />
              </span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

function InfoRow({
  icon: Icon,
  children,
  truncate,
  title,
}: {
  icon: LucideIcon;
  children: React.ReactNode;
  truncate?: boolean;
  title?: string;
}) {
  return (
    <div
      className="flex items-start gap-2 text-sm"
      style={{ color: 'var(--kc-text-2)' }}
    >
      <Icon
        className="h-3.5 w-3.5 mt-0.5 flex-none"
        style={{ color: 'var(--kc-text-4)' }}
        aria-hidden
      />
      <span className={truncate ? 'truncate min-w-0' : 'min-w-0'} title={title}>
        {children}
      </span>
    </div>
  );
}
