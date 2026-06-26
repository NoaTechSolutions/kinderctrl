'use client';

import { useEffect } from 'react';
import {
  CalendarOff,
  CheckCircle2,
  Clock,
  ClockArrowDown,
  DoorOpen,
  Link2,
  Phone,
  Stethoscope,
  User,
  UserCheck,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import {
  formatClockTime,
  parentFullName,
  relationshipLabel,
  sortedParents,
} from '@/lib/format-child';
import { formatPhoneUS } from '@/lib/utils/phone';
import type { ChildAttendanceStatus } from '@/lib/types/child';
import { ReadCard } from './section-frame';
import { ReadGrid, ReadRow, fmtDate } from './read-view';
import type { SectionEditorHandle, SectionProps } from './use-section-editor';

// Read-only tab → always publishes the no-op handle so the shell guard knows
// nothing here is editing.
const READ_HANDLE: SectionEditorHandle = {
  editing: false,
  dirty: false,
  save: async () => true,
  cancel: () => {},
};

const ATT_CFG: Record<
  ChildAttendanceStatus,
  { labelKey: string; color: string; icon: LucideIcon }
> = {
  PRESENT: { labelKey: 'children.attPresent', color: 'var(--kc-success)', icon: CheckCircle2 },
  END_OF_SHIFT: { labelKey: 'children.attEndOfShift', color: 'var(--kc-error)', icon: DoorOpen },
  NOT_ARRIVED: { labelKey: 'children.attNotArrived', color: 'var(--kc-warning)', icon: Clock },
  NOT_SCHEDULED: { labelKey: 'children.attNotScheduled', color: 'var(--kc-text-3)', icon: CalendarOff },
  EARLY_DEPARTURE: {
    labelKey: 'children.attEarlyDeparture',
    color: 'color-mix(in oklch, var(--kc-warning), var(--kc-error))',
    icon: ClockArrowDown,
  },
};

// Read-only landing tab: quick day-to-day info (primary + emergency contact,
// key facts, today's attendance). No editing — deeper data lives in the other
// tabs. Uses the same card design as the rest (ReadCard + ReadRow).
export function OverviewSection({ child, onEditorChange }: SectionProps) {
  const { t, locale } = useTranslation();
  useEffect(() => onEditorChange(READ_HANDLE), [onEditorChange]);

  const primary = sortedParents(child)[0] ?? null;
  const emergency =
    (child.contacts ?? []).find((c) => c.contactType === 'EMERGENCY') ?? null;
  const authorizedCount = (child.contacts ?? []).filter(
    (c) => c.contactType === 'AUTHORIZED_PICKUP',
  ).length;
  const att = child.attendanceToday;
  const attCfg = att ? ATT_CFG[att.status] : null;
  const AttIcon = attCfg?.icon;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <ReadCard icon={User} title={t('children.overviewPrimaryContact')}>
          <ReadGrid>
            <ReadRow
              icon={User}
              label={t('children.overviewPrimaryContact')}
              value={primary ? parentFullName(primary) : undefined}
            />
            <ReadRow
              icon={Link2}
              label={t('children.relationship')}
              value={primary ? relationshipLabel(primary.relationship, t) : undefined}
            />
            <ReadRow
              icon={Phone}
              label={t('children.phone')}
              value={primary?.parent.homePhone ? formatPhoneUS(primary.parent.homePhone) : undefined}
              full
            />
          </ReadGrid>
        </ReadCard>

        <ReadCard icon={UserCheck} title={t('children.overviewEmergencyContact')}>
          <ReadGrid>
            <ReadRow
              icon={User}
              label={t('children.contactName')}
              value={emergency?.name}
            />
            <ReadRow
              icon={Link2}
              label={t('children.relationship')}
              value={emergency?.relationship ?? undefined}
            />
            <ReadRow
              icon={Phone}
              label={t('children.phone')}
              value={emergency?.phone ? formatPhoneUS(emergency.phone) : undefined}
              full
            />
          </ReadGrid>
        </ReadCard>
      </div>

      <ReadCard icon={Stethoscope} title={t('children.overviewKeyInfo')}>
        <ReadGrid cols={3}>
          <ReadRow icon={Clock} label={t('children.firstDayOfCare')} value={fmtDate(child.firstCareDay, locale)} />
          <ReadRow icon={Stethoscope} label={t('children.doctorName')} value={child.medicalInfo?.doctorName ?? undefined} />
          <ReadRow icon={Users} label={t('children.authorizedPickupCount')} value={String(authorizedCount)} />
        </ReadGrid>
      </ReadCard>

      <ReadCard icon={Clock} title={t('children.overviewAttendanceToday')}>
        {att && attCfg && AttIcon ? (
          <span
            className="inline-flex items-center gap-2 text-sm font-medium"
            style={{ color: attCfg.color }}
          >
            <AttIcon className="h-4 w-4 flex-none" aria-hidden />
            {t(attCfg.labelKey)}
            {att.checkInTime && (
              <span style={{ color: 'var(--kc-text-3)' }}>
                · {formatClockTime(att.checkInTime)}
              </span>
            )}
          </span>
        ) : null}
      </ReadCard>
    </div>
  );
}
