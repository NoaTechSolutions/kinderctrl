'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  Edit,
  FileText,
  Globe,
  Mail,
  MapPin,
  Phone,
  Users,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useCenter } from '@/lib/hooks/use-centers';
import { ApiError } from '@/lib/api/client';
import { useTranslation } from '@/lib/i18n';
import { StatusBadge } from '@/components/centers/status-badge';
import { CenterStats } from '@/components/centers/center-stats';
import { CenterHoursDisplay } from '@/components/centers/center-hours-display';
import { SetupPendingBanner } from '@/components/centers/setup-pending-banner';
import { AdminActionsMenu } from '@/components/centers/admin-actions-menu';
import { formatPhoneUS } from '@/lib/utils/phone';
import { useAuthStore } from '@/store/auth';

export default function CenterDetailPage() {
  const { t } = useTranslation();
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const user = useAuthStore((s) => s.user);

  const { data: center, isLoading, error } = useCenter(id);

  const canManage =
    user?.role === 'SUPER_ADMIN' || user?.role === 'DIRECTOR';
  // STAFF and PARENT share the limited read-only surface; backend's
  // findOne returns 404 if they probe a center that isn't theirs.
  const isAssignedUser =
    user?.role === 'STAFF' || user?.role === 'PARENT';
  // Back button destination: only SUPER_ADMIN goes back to the cross-
  // center list because they're the only role that genuinely browses
  // multiple centers. DIRECTOR (even with multiple centers), STAFF and
  // PARENT all return to /dashboard — their natural "home".
  const backToList = user?.role === 'SUPER_ADMIN';
  // License is operational/regulatory info — PARENT doesn't need it.
  const canSeeLicense = user?.role !== 'PARENT';

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-4xl">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-12 w-64" />
        <div className="grid gap-4 sm:grid-cols-3">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error) {
    const isNotFound = error instanceof ApiError && error.status === 404;
    return (
      <div className="space-y-4 max-w-4xl">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link href={backToList ? '/centers' : '/dashboard'}>
            <ArrowLeft className="mr-1 h-4 w-4" />
            {backToList ? t('centers.title') : 'Dashboard'}
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
            {isNotFound
              ? t('centers.notFound')
              : t('centers.loadError')}
          </p>
        </div>
      </div>
    );
  }

  if (!center) return null;

  const isClosed = center.status === 'CLOSED';
  const isSetupPending = center.status === 'SETUP_PENDING';

  return (
    <div className="space-y-6 max-w-4xl">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link href={backToList ? '/centers' : '/dashboard'}>
          <ArrowLeft className="mr-1 h-4 w-4" />
          {backToList ? t('centers.title') : 'Dashboard'}
        </Link>
      </Button>

      {/* Header: name + status + actions */}
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
            <Building2 className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <h1
              className="font-display text-3xl sm:text-4xl font-semibold tracking-tight line-clamp-1 md:line-clamp-2"
              title={center.name}
            >
              {center.name}
            </h1>
            <div className="mt-2 flex items-center gap-2">
              <StatusBadge status={center.status} />
              {canSeeLicense && center.licenseNumber && (
                <span
                  className="font-mono text-xs"
                  style={{ color: 'var(--kc-text-3)' }}
                >
                  {center.licenseNumber}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-2 flex-none">
          {canManage && (
            <Button asChild variant="outline" disabled={isClosed}>
              <Link
                href={isClosed ? '#' : `/centers/${center.id}/edit`}
                aria-disabled={isClosed}
                tabIndex={isClosed ? -1 : 0}
                onClick={(e) => {
                  if (isClosed) e.preventDefault();
                }}
              >
                <Edit className="mr-2 h-4 w-4" />
                {t('centers.edit')}
              </Link>
            </Button>
          )}
          {user?.role === 'SUPER_ADMIN' && (
            <AdminActionsMenu center={center} />
          )}
        </div>
      </div>

      {/* Setup pending banner — CTA only for those who can manage. */}
      {isSetupPending && (
        <SetupPendingBanner
          centerId={canManage ? center.id : undefined}
          centerName={canManage ? center.name : undefined}
          initialHours={center.centerHours}
        />
      )}

      {/* Stats */}
      {canManage && <CenterStats capacity={center.capacity} />}

      {/* Info + Hours */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Center information</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
              <InfoRow icon={MapPin} label="Address">
                {center.street}
                <br />
                {center.city}, {center.state} {center.zipCode}
              </InfoRow>
              <InfoRow icon={Phone} label={t('centers.phone')}>
                <span className="font-mono">{formatPhoneUS(center.phone)}</span>
              </InfoRow>
              <InfoRow icon={Mail} label={t('centers.email')}>
                <span className="break-all">{center.email}</span>
              </InfoRow>
              {center.website && (
                <InfoRow icon={Globe} label={t('centers.website')}>
                  <a
                    href={center.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="break-all hover:underline"
                    style={{ color: 'var(--kc-p-600)' }}
                  >
                    {center.website}
                  </a>
                </InfoRow>
              )}
              {canManage && (
                <InfoRow icon={Users} label={t('centers.capacity')}>
                  {center.capacity} children
                </InfoRow>
              )}
              {canManage && (
                <InfoRow icon={Globe} label={t('centers.timezone')}>
                  <span className="font-mono text-xs">{center.timezone}</span>
                </InfoRow>
              )}
              {canSeeLicense && center.licenseNumber && (
                <InfoRow icon={FileText} label={t('centers.licenseNumber')}>
                  {center.licenseNumber}
                </InfoRow>
              )}
              {canManage && (
                <InfoRow icon={CalendarDays} label="Created">
                  {new Date(center.createdAt).toLocaleDateString()}
                </InfoRow>
              )}
            </dl>
          </CardContent>
        </Card>

        <CenterHoursDisplay
          hours={center.centerHours}
          centerId={canManage ? center.id : undefined}
          centerName={canManage ? center.name : undefined}
          centerStatus={center.status}
        />
      </div>
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof MapPin;
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
