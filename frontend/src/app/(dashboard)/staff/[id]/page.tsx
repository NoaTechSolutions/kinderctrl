'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  Briefcase,
  CalendarDays,
  Edit,
  Mail,
  Phone,
  ShieldCheck,
  StickyNote,
  User as UserIcon,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useStaffMember } from '@/lib/hooks/use-staff';
import { ApiError } from '@/lib/api/client';
import { useTranslation } from '@/lib/i18n';
import { useAuthStore } from '@/store/auth';
import { StaffStatusBadge } from '@/components/staff/staff-status-badge';
import { StaffComplianceStatus } from '@/components/staff/staff-compliance-status';
import { BackgroundCheckForm } from '@/components/staff/background-check-form';
import { CprCertificationForm } from '@/components/staff/cpr-certification-form';
import { formatPhoneUS } from '@/lib/utils/phone';
import type { Staff } from '@/lib/types/staff';

const ROLE_LABEL_KEY: Record<Staff['role'], string> = {
  TEACHER: 'staff.roleTeacher',
  ASSISTANT: 'staff.roleAssistant',
  ADMIN: 'staff.roleAdmin',
};

const EMPLOYMENT_LABEL_KEY: Record<string, string> = {
  full_time: 'staff.employmentFullTime',
  part_time: 'staff.employmentPartTime',
};

export default function StaffDetailPage() {
  const { t } = useTranslation();
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const user = useAuthStore((s) => s.user);

  const { data: staff, isLoading, error } = useStaffMember(id);

  const canManage =
    user?.role === 'DIRECTOR' || user?.role === 'SUPER_ADMIN';

  // Dialog open state for compliance forms (one each for bg-check + CPR).
  const [bgOpen, setBgOpen] = useState(false);
  const [cprOpen, setCprOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-4xl">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error) {
    const isNotFound = error instanceof ApiError && error.status === 404;
    return (
      <div className="space-y-4 max-w-4xl">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link href="/staff">
            <ArrowLeft className="mr-1 h-4 w-4" />
            {t('staff.title')}
          </Link>
        </Button>
        <div
          role="alert"
          className="rounded-lg border p-4"
          style={{
            background: 'var(--kc-error-bg)',
            borderColor:
              'color-mix(in oklch, var(--kc-error), transparent 70%)',
          }}
        >
          <p className="text-sm" style={{ color: 'var(--kc-error)' }}>
            {isNotFound ? t('staff.notFound') : t('staff.loadError')}
          </p>
        </div>
      </div>
    );
  }

  if (!staff) return null;

  const fullName = `${staff.firstName} ${staff.lastName}`;
  const employmentKey = EMPLOYMENT_LABEL_KEY[staff.employmentType];
  const isTerminated = staff.status === 'TERMINATED';

  return (
    <div className="space-y-6 max-w-4xl">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link href="/staff">
          <ArrowLeft className="mr-1 h-4 w-4" />
          {t('staff.title')}
        </Link>
      </Button>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div
            className="flex h-12 w-12 flex-none items-center justify-center rounded-xl"
            style={{
              background:
                'color-mix(in oklch, var(--kc-p-100), transparent 30%)',
              color: 'var(--kc-p-600)',
            }}
          >
            <UserIcon className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <h1
              className="font-display text-3xl sm:text-4xl font-semibold tracking-tight line-clamp-1 md:line-clamp-2"
              title={fullName}
            >
              {fullName}
            </h1>
            <div className="mt-2 flex items-center gap-2 flex-wrap">
              <StaffStatusBadge status={staff.status} />
              <span
                className="text-sm"
                style={{ color: 'var(--kc-text-3)' }}
              >
                {t(ROLE_LABEL_KEY[staff.role])}
              </span>
              {staff.centerName && (
                <span
                  className="text-xs"
                  style={{ color: 'var(--kc-text-3)' }}
                >
                  · {staff.centerName}
                </span>
              )}
            </div>
          </div>
        </div>

        {canManage && (
          <div className="flex gap-2 flex-none">
            <Button asChild variant="outline" disabled={isTerminated}>
              <Link
                href={isTerminated ? '#' : `/staff/${staff.id}/edit`}
                aria-disabled={isTerminated}
                tabIndex={isTerminated ? -1 : 0}
                onClick={(e) => {
                  if (isTerminated) e.preventDefault();
                }}
              >
                <Edit className="mr-2 h-4 w-4" />
                {t('staff.edit')}
              </Link>
            </Button>
          </div>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {t('staff.titleSingular')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
            <InfoRow icon={Mail} label={t('staff.email')}>
              <span className="break-all">{staff.email}</span>
            </InfoRow>
            {staff.phone && (
              <InfoRow icon={Phone} label={t('staff.phone')}>
                <span className="font-mono">{formatPhoneUS(staff.phone)}</span>
              </InfoRow>
            )}
            <InfoRow icon={Briefcase} label={t('staff.employmentType')}>
              {employmentKey ? t(employmentKey) : staff.employmentType}
              {staff.hourlyRate != null && (
                <span style={{ color: 'var(--kc-text-3)' }}>
                  {' · $'}
                  {staff.hourlyRate.toFixed(2)}
                  {'/hr'}
                </span>
              )}
            </InfoRow>
            <InfoRow icon={CalendarDays} label={t('staff.hireDate')}>
              {new Date(staff.hireDate).toLocaleDateString()}
            </InfoRow>
            {staff.notes && (
              <div className="sm:col-span-2 flex gap-3">
                <StickyNote
                  className="h-4 w-4 mt-1 flex-none"
                  style={{ color: 'var(--kc-text-3)' }}
                  aria-hidden
                />
                <div className="min-w-0">
                  <dt
                    className="text-xs font-medium uppercase tracking-wider"
                    style={{ color: 'var(--kc-text-3)' }}
                  >
                    {t('staff.notes')}
                  </dt>
                  <dd className="mt-0.5 text-sm whitespace-pre-wrap">
                    {staff.notes}
                  </dd>
                </div>
              </div>
            )}
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" aria-hidden />
            {t('staff.complianceTitle')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <StaffComplianceStatus
            backgroundCheckStatus={staff.backgroundCheckStatus}
            backgroundCheckExpiryDate={staff.backgroundCheckExpiryDate}
            cprCertified={staff.cprCertified}
            cprExpiryDate={staff.cprExpiryDate}
            variant="full"
          />

          {canManage && (
            <div className="flex flex-wrap gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setBgOpen(true)}
              >
                <Edit className="mr-2 h-3.5 w-3.5" />
                {t('staff.bgEditTitle')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCprOpen(true)}
              >
                <Edit className="mr-2 h-3.5 w-3.5" />
                {t('staff.cprEditTitle')}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={bgOpen} onOpenChange={setBgOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('staff.bgEditTitle')}</DialogTitle>
            <DialogDescription>
              {t('staff.bgEditDescription')}
            </DialogDescription>
          </DialogHeader>
          <BackgroundCheckForm staff={staff} onClose={() => setBgOpen(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={cprOpen} onOpenChange={setCprOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('staff.cprEditTitle')}</DialogTitle>
            <DialogDescription>
              {t('staff.cprEditDescription')}
            </DialogDescription>
          </DialogHeader>
          <CprCertificationForm staff={staff} onClose={() => setCprOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof Mail;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-3">
      <Icon
        className="h-4 w-4 mt-1 flex-none"
        style={{ color: 'var(--kc-text-3)' }}
        aria-hidden
      />
      <div className="min-w-0">
        <dt
          className="text-xs font-medium uppercase tracking-wider"
          style={{ color: 'var(--kc-text-3)' }}
        >
          {label}
        </dt>
        <dd className="mt-0.5 text-sm">{children}</dd>
      </div>
    </div>
  );
}
