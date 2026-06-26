'use client';

import { useRef } from 'react';
import type { LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { AlertTriangle, ArrowLeft, Moon, Pencil, Pill } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { initialsFor } from '@/components/profile/user-avatar';
import { useRequireRole } from '@/lib/hooks/use-require-role';
import { useAuthStore } from '@/store/auth';
import { useChild } from '@/lib/hooks/use-children';
import { useTranslation } from '@/lib/i18n';
import { ChildStatusBadge } from '@/components/children/child-status-badge';
import {
  ChildDetailTabs,
  type DetailNavigate,
} from '@/components/children/detail/child-detail-tabs';
import { fmtDate } from '@/components/children/detail/read-view';
import { childFullName, formatAge } from '@/lib/format-child';

export default function ChildDetailPage() {
  const { ready, allowed } = useRequireRole(['DIRECTOR', 'SUPER_ADMIN', 'PARENT']);
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const { data: child, isLoading, error } = useChild(id);
  const role = useAuthStore((s) => s.user?.role);
  const canManage = role === 'DIRECTOR' || role === 'SUPER_ADMIN';
  const { t, locale } = useTranslation();
  // Guarded navigator the header alert badges call (set by ChildDetailTabs).
  const navRef = useRef<DetailNavigate | null>(null);

  if (!ready || !allowed) return null;

  if (isLoading) {
    return (
      <div className="mx-auto max-w-5xl space-y-6">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (error || !child) {
    return (
      <div className="mx-auto max-w-5xl space-y-4">
        <BackLink />
        <div
          role="alert"
          className="rounded-lg border p-4"
          style={{
            background: 'var(--kc-error-bg)',
            borderColor: 'color-mix(in oklch, var(--kc-error), transparent 70%)',
          }}
        >
          <p className="text-sm" style={{ color: 'var(--kc-error)' }}>
            {t('children.notFound')}
          </p>
        </div>
      </div>
    );
  }

  // Critical alert badges — always visible across tabs. Clicking jumps (guarded)
  // to the tab/card where the data lives.
  const med = child.medicalInfo;
  const allergies = Array.isArray(med?.allergies) ? (med.allergies as string[]) : [];
  const hasMeds =
    Array.isArray(med?.medications) && (med.medications as unknown[]).length > 0;
  const hasInfantSleep = !!child.infantSleep;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <BackLink />

      {/* Header — avatar + name + age/status/admission + alert badges + Edit. */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <div className="h-14 w-14 flex-none overflow-hidden rounded-xl">
            {child.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={child.photoUrl}
                alt={childFullName(child)}
                className="h-full w-full object-cover"
              />
            ) : (
              <div
                className="flex h-full w-full items-center justify-center text-lg font-semibold text-white"
                style={{ background: 'var(--kc-p-600)' }}
              >
                {initialsFor({ firstName: child.firstName, lastName: child.lastName })}
              </div>
            )}
          </div>

          <div className="min-w-0">
            <h1
              className="truncate text-2xl font-medium tracking-tight sm:text-3xl"
              style={{ color: 'var(--kc-text-1)' }}
            >
              {childFullName(child)}
            </h1>
            <div
              className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm"
              style={{ color: 'var(--kc-text-3)' }}
            >
              <span className="tabular-nums">{formatAge(child.dateOfBirth, t)}</span>
              <ChildStatusBadge status={child.enrollmentStatus} />
              {child.admissionDate && (
                <span>
                  {t('children.admissionDate')}: {fmtDate(child.admissionDate, locale)}
                </span>
              )}
            </div>

            {(allergies.length > 0 || hasMeds || hasInfantSleep) && (
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                {allergies.map((a) => (
                  <AlertBadge
                    key={a}
                    icon={AlertTriangle}
                    label={a}
                    fg="var(--kc-error)"
                    bg="var(--kc-error-bg)"
                    title={t('children.alertBadgeHint')}
                    onClick={() => navRef.current?.('health', 'medical-card-allergies')}
                  />
                ))}
                {hasMeds && (
                  <AlertBadge
                    icon={Pill}
                    label={t('children.badgeMedication')}
                    fg="var(--kc-warning)"
                    bg="var(--kc-warning-bg)"
                    title={t('children.alertBadgeHint')}
                    onClick={() => navRef.current?.('health', 'medical-card-allergies')}
                  />
                )}
                {hasInfantSleep && (
                  <AlertBadge
                    icon={Moon}
                    label={t('children.badgeSleepPlan')}
                    fg="var(--kc-info)"
                    bg="var(--kc-info-bg)"
                    title={t('children.alertBadgeHint')}
                    onClick={() => navRef.current?.('dailyLife')}
                  />
                )}
              </div>
            )}
          </div>
        </div>

        {canManage && (
          <Button
            variant="outline"
            size="sm"
            className="flex-none self-start"
            onClick={() => navRef.current?.('child')}
          >
            <Pencil className="mr-1.5 h-4 w-4" />
            {t('children.edit')}
          </Button>
        )}
      </div>

      <ChildDetailTabs child={child} canManage={canManage} navRef={navRef} />
    </div>
  );
}

function AlertBadge({
  icon: Icon,
  label,
  fg,
  bg,
  title,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  fg: string;
  bg: string;
  title: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold transition-opacity hover:opacity-80"
      style={{ background: bg, color: fg }}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}

function BackLink() {
  const { t } = useTranslation();
  return (
    <Button asChild variant="ghost" size="sm" className="-ml-2">
      <Link href="/children">
        <ArrowLeft className="mr-1 h-4 w-4" />
        {t('children.title')}
      </Link>
    </Button>
  );
}
