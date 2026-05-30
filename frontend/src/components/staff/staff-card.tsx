'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Briefcase,
  CalendarDays,
  ChevronDown,
  Mail,
  Phone,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
} from '@/components/ui/card';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { formatPhoneUS } from '@/lib/utils/phone';
import type { Staff } from '@/lib/types/staff';
import type { UserRole } from '@/store/auth';
import { StaffStatusBadge } from './staff-status-badge';

interface StaffCardProps {
  staff: Staff;
  // SUPER_ADMIN sees a Center row to disambiguate cross-center listings.
  // Other roles only ever see their own center's staff.
  userRole?: UserRole;
}

const ROLE_LABEL_KEY: Record<Staff['role'], string> = {
  TEACHER: 'staff.roleTeacher',
  ASSISTANT: 'staff.roleAssistant',
  ADMIN: 'staff.roleAdmin',
};

const EMPLOYMENT_LABEL_KEY: Record<string, string> = {
  full_time: 'staff.employmentFullTime',
  part_time: 'staff.employmentPartTime',
};

export function StaffCard({ staff, userRole }: StaffCardProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const fullName = `${staff.firstName} ${staff.lastName}`;
  const showCenter = userRole === 'SUPER_ADMIN' && !!staff.centerName;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card className="overflow-hidden gap-3 py-3 transition-shadow hover:shadow-md">
        <CollapsibleTrigger
          className="block w-full cursor-pointer bg-transparent text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
          style={
            {
              '--tw-ring-color':
                'color-mix(in oklch, var(--kc-p-500), transparent 60%)',
            } as React.CSSProperties
          }
          aria-label={
            open
              ? `${t('staff.view')} ${fullName}`
              : `${fullName} ${t('staff.view')}`
          }
        >
          <CardHeader className="grid-cols-1">
            {/* PO QA #25 layout (matches invitations-table.tsx mobile
                cards): row 1 = primary identifier + status pill +
                chevron; row 2 = center (SUPER_ADMIN only); row 3 = role.
                Avatar icon dropped to align with the cross-module pattern.
                Primary identifier stays as fullName — for an HR/staff
                list, name is the natural identity; email is contact
                data and lives inside the collapsed body. */}
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className={cn(
                    'font-semibold text-sm leading-tight min-w-0 flex-1',
                    open ? '' : 'truncate',
                  )}
                  title={open ? undefined : fullName}
                >
                  {fullName}
                </span>
                <StaffStatusBadge status={staff.status} />
                <ChevronDown
                  className={cn(
                    'h-5 w-5 flex-none transition-transform duration-200',
                    open && 'rotate-180',
                  )}
                  style={{ color: 'var(--kc-text-3)' }}
                  aria-hidden
                />
              </div>
              {showCenter && (
                <p
                  className="text-xs truncate min-w-0"
                  style={{ color: 'var(--kc-text-3)' }}
                  title={staff.centerName}
                >
                  {staff.centerName}
                </p>
              )}
              <p
                className="text-xs"
                style={{ color: 'var(--kc-text-3)' }}
              >
                {t(ROLE_LABEL_KEY[staff.role])}
              </p>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="space-y-2.5">
            <Row icon={Mail} truncate title={staff.email}>
              {staff.email}
            </Row>
            {/* Center moved to the header (PO QA #25); not duplicated
                here. Same with role (header row 3) and status (header
                row 1's pill). */}
            {staff.phone && (
              <Row icon={Phone}>{formatPhoneUS(staff.phone)}</Row>
            )}
            <Row icon={Briefcase}>
              {EMPLOYMENT_LABEL_KEY[staff.employmentType]
                ? t(EMPLOYMENT_LABEL_KEY[staff.employmentType])
                : staff.employmentType}
              {staff.hourlyRate != null && (
                <span style={{ color: 'var(--kc-text-3)' }}>
                  {' · $'}
                  {staff.hourlyRate.toFixed(2)}/hr
                </span>
              )}
            </Row>
            <Row icon={CalendarDays}>
              {t('staff.hireDate')}:{' '}
              {new Date(staff.hireDate).toLocaleDateString()}
            </Row>

            <div className="mt-3 flex gap-2">
              <Button asChild className="flex-1">
                <Link href={`/staff/${staff.id}`}>{t('staff.view')}</Link>
              </Button>
              {staff.status !== 'TERMINATED' && (
                <Button asChild variant="outline" className="flex-1">
                  <Link href={`/staff/${staff.id}/edit`}>
                    {t('staff.edit')}
                  </Link>
                </Button>
              )}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

function Row({
  icon: Icon,
  children,
  truncate,
  title,
}: {
  icon: typeof Mail;
  children: React.ReactNode;
  truncate?: boolean;
  title?: string;
}) {
  return (
    <div
      className="flex items-start gap-2 text-sm"
      style={{ color: 'var(--kc-text-3)' }}
    >
      <Icon className="h-4 w-4 mt-0.5 flex-none" aria-hidden />
      <span
        className={truncate ? 'truncate min-w-0' : 'min-w-0'}
        title={title}
      >
        {children}
      </span>
    </div>
  );
}
