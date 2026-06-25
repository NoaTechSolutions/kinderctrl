'use client';

import Link from 'next/link';
import {
  AlertTriangle,
  CalendarOff,
  CheckCircle2,
  Clock,
  ClockArrowDown,
  DoorOpen,
  LogIn,
  LogOut,
  Minus,
  Moon,
  Phone,
  Pill,
  User,
  type LucideIcon,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { initialsFor } from '@/components/profile/user-avatar';
import { ChildActionsMenu } from './child-actions-menu';
import { ChildStatusBadge } from './child-status-badge';
import {
  childFullName,
  formatAgeLong,
  formatClockTime,
  relationshipLabel,
} from '@/lib/format-child';
import { formatPhoneUS } from '@/lib/utils/phone';
import { useTranslation } from '@/lib/i18n';
import type { ChildAttendanceStatus, ChildListItem } from '@/lib/types/child';

type Translator = (key: string) => string;

// No-photo avatar palette — rotated deterministically by the child id so the
// same child always reads the same color (purple / teal / amber / coral, all
// SAAS tokens). Stable across sort/filter, no index threading needed.
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

// Attendance band — colors are SAAS tokens. EARLY_DEPARTURE has no semantic
// token, so it's mixed "between warning and danger" per the spec (no hardcode).
const BAND: Record<
  ChildAttendanceStatus,
  { icon: LucideIcon; labelKey: string; fg: string; bg: string }
> = {
  PRESENT: {
    icon: CheckCircle2,
    labelKey: 'children.attPresent',
    fg: 'var(--kc-success)',
    bg: 'var(--kc-success-bg)',
  },
  END_OF_SHIFT: {
    icon: DoorOpen,
    labelKey: 'children.attEndOfShift',
    fg: 'var(--kc-error)',
    bg: 'var(--kc-error-bg)',
  },
  NOT_ARRIVED: {
    icon: Clock,
    labelKey: 'children.attNotArrived',
    fg: 'var(--kc-warning)',
    bg: 'var(--kc-warning-bg)',
  },
  NOT_SCHEDULED: {
    icon: CalendarOff,
    labelKey: 'children.attNotScheduled',
    fg: 'var(--kc-text-3)',
    bg: 'var(--kc-surface-2)',
  },
  EARLY_DEPARTURE: {
    icon: ClockArrowDown,
    labelKey: 'children.attEarlyDeparture',
    fg: 'color-mix(in oklch, var(--kc-warning), var(--kc-error))',
    bg: 'color-mix(in oklch, var(--kc-warning-bg), var(--kc-error-bg))',
  },
};

// Right-hand segment of the band: an icon + text (a check-in/out time, or a
// "no record" placeholder). Resolved per status so the band reads as a pair.
function bandRight(
  att: ChildListItem['attendanceToday'],
  t: Translator,
): { icon: LucideIcon; text: string } {
  switch (att.status) {
    case 'PRESENT':
      return {
        icon: LogIn,
        text: `${t('children.attCheckIn')} ${att.checkInTime ? formatClockTime(att.checkInTime) : ''}`.trim(),
      };
    case 'END_OF_SHIFT':
      return {
        icon: LogOut,
        text: `${t('children.attCheckOut')} ${att.checkOutTime ? formatClockTime(att.checkOutTime) : ''}`.trim(),
      };
    case 'EARLY_DEPARTURE':
      return {
        icon: LogOut,
        text: att.checkOutTime ? formatClockTime(att.checkOutTime) : '',
      };
    case 'NOT_ARRIVED':
      return { icon: Minus, text: t('children.attNoRecord') };
    case 'NOT_SCHEDULED':
    default:
      return { icon: Minus, text: t('children.attNotAttending') };
  }
}

function AttendanceBand({
  att,
}: {
  att: ChildListItem['attendanceToday'];
}) {
  const { t } = useTranslation();
  const cfg = BAND[att.status] ?? BAND.NOT_SCHEDULED;
  const Icon = cfg.icon;
  const right = bandRight(att, t);
  const RightIcon = right.icon;
  return (
    <div
      className="flex items-center gap-2.5 px-3 py-1.5 text-xs font-medium"
      style={{ background: cfg.bg, color: cfg.fg }}
    >
      <span className="flex min-w-0 items-center gap-1.5">
        <Icon className="h-3.5 w-3.5 flex-none" aria-hidden />
        <span className="truncate">{t(cfg.labelKey)}</span>
      </span>
      <span className="ml-auto flex flex-none items-center gap-2.5">
        <span
          className="h-3 w-px"
          style={{ background: 'currentColor', opacity: 0.3 }}
          aria-hidden
        />
        <span className="flex items-center gap-1.5 tabular-nums">
          <RightIcon className="h-3.5 w-3.5 flex-none" aria-hidden />
          {right.text}
        </span>
      </span>
    </div>
  );
}

// Small alert pill (allergy / medication / infant-sleep). Icon + optional text.
function AlertPill({
  icon: Icon,
  label,
  fg,
  bg,
}: {
  icon: LucideIcon;
  label: string;
  fg: string;
  bg: string;
}) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium"
      style={{ background: bg, color: fg }}
    >
      <Icon className="h-3 w-3 flex-none" aria-hidden />
      <span className="truncate">{label}</span>
    </span>
  );
}

// Used on phones (Director roster), the desktop "cards" view (toggle), AND the
// parent's read-only view. All navigate to the detail page.
export function ChildCard({ child }: { child: ChildListItem }) {
  const { t } = useTranslation();
  const name = childFullName(child);
  const primary = child.primaryParent;
  const allergies = child.medicalSummary.allergies;
  const hasMeds = child.medicalSummary.medications.length > 0;

  return (
    <Card className="relative flex h-full flex-col gap-0 overflow-hidden py-0 transition-shadow hover:shadow-md">
      {/* Stretched nav link — covers the whole card as a SIBLING of the content
          (not a parent of the kebab button, which would be invalid <a><button>).
          pointer-events route clicks: content passes through to the link;
          the kebab re-captures its own. */}
      <Link
        href={`/children/${child.id}`}
        aria-label={name}
        className="absolute inset-0 z-0"
      />
      <div className="pointer-events-none relative flex h-full flex-col">
        {/* 1 — attendance band */}
        <AttendanceBand att={child.attendanceToday} />

        {/* 2 — photo (4/3) or full-area initials */}
        <div
          className="relative w-full overflow-hidden"
          style={{ aspectRatio: '4 / 3' }}
        >
          {child.photoUrl ? (
            // Plain <img> (not next/image): photoUrl is a remote URL with no
            // storage backend wired yet, so we skip next.config remote-pattern
            // coupling. Swap to <Image> once uploads + a known host land.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={child.photoUrl}
              alt={name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div
              className="flex h-full w-full items-center justify-center font-semibold text-white"
              style={{ background: avatarColor(child.id), fontSize: '48px' }}
            >
              {initialsFor({
                firstName: child.firstName,
                lastName: child.lastName,
              })}
            </div>
          )}
        </div>

        {/* 3 — body: fills the card's remaining height. The top block is all
            single-line/fixed; the alert zone is pinned to the bottom (mt-auto)
            with a FIXED height so every card is identical regardless of how many
            badges a child has. */}
        <div className="flex flex-1 flex-col p-3">
          <div className="space-y-2">
            <h3
              className="truncate text-base font-semibold leading-tight"
              style={{ color: 'var(--kc-text-1)' }}
              title={name}
            >
              {name}
            </h3>

            <div className="flex items-center justify-between gap-2">
              <span
                className="text-sm tabular-nums"
                style={{ color: 'var(--kc-text-3)' }}
              >
                {formatAgeLong(child.dateOfBirth, t)}
              </span>
              <ChildStatusBadge
                status={child.enrollmentStatus}
                className="flex-none"
                hideIcon
              />
            </div>

            <div className="border-t" style={{ borderColor: 'var(--kc-border)' }} />

            {primary && (
              <p
                className="flex items-center gap-1.5 truncate text-sm"
                style={{ color: 'var(--kc-text-2)' }}
              >
                <User
                  className="h-3.5 w-3.5 flex-none"
                  style={{ color: 'var(--kc-text-4)' }}
                  aria-hidden
                />
                <span className="truncate">
                  {primary.name}
                  <span style={{ color: 'var(--kc-text-3)' }}>
                    {' · '}
                    {relationshipLabel(primary.relationship, t)}
                    {' · '}
                    {t('children.primaryTag')}
                  </span>
                </span>
              </p>
            )}

            {primary?.phone && (
              <p
                className="flex items-center gap-1.5 text-sm tabular-nums"
                style={{ color: 'var(--kc-text-2)' }}
              >
                <Phone
                  className="h-3.5 w-3.5 flex-none"
                  style={{ color: 'var(--kc-text-4)' }}
                  aria-hidden
                />
                {formatPhoneUS(primary.phone)}
              </p>
            )}
          </div>

          {/* Bottom row: alert zone (FIXED height, ≤2 rows, always reserved so
              every card is identical; overflow clipped) + the actions kebab in
              the bottom-right corner. mt-3 gives a constant gap from the phone
              row on EVERY card. */}
          <div className="mt-3 flex items-end gap-2">
            <div className="flex h-12 flex-1 flex-wrap content-start gap-1.5 overflow-hidden">
              {allergies.map((a) => (
                <AlertPill
                  key={a}
                  icon={AlertTriangle}
                  label={a}
                  fg="var(--kc-error)"
                  bg="var(--kc-error-bg)"
                />
              ))}
              {hasMeds && (
                <AlertPill
                  icon={Pill}
                  label={t('children.badgeMedication')}
                  fg="var(--kc-warning)"
                  bg="var(--kc-warning-bg)"
                />
              )}
              {child.hasInfantSleepPlan && (
                <AlertPill
                  icon={Moon}
                  label={t('children.badgeSleepPlan')}
                  fg="var(--kc-info)"
                  bg="var(--kc-info-bg)"
                />
              )}
            </div>
            {/* Re-enable pointer events + raise above the stretched link so the
                kebab is clickable and its clicks don't navigate. */}
            <span className="pointer-events-auto relative z-10">
              <ChildActionsMenu child={child} variant="card" />
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}
