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

export default function CenterDetailPage() {
  const { t } = useTranslation();
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const { data: center, isLoading, error } = useCenter(id);

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
          <Link href="/centers">
            <ArrowLeft className="mr-1 h-4 w-4" />
            {t('centers.title')}
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
        <Link href="/centers">
          <ArrowLeft className="mr-1 h-4 w-4" />
          {t('centers.title')}
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
              className="font-display text-3xl sm:text-4xl font-semibold tracking-tight truncate"
              title={center.name}
            >
              {center.name}
            </h1>
            <div className="mt-2 flex items-center gap-2">
              <StatusBadge status={center.status} />
              {center.licenseNumber && (
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
        </div>
      </div>

      {/* Setup pending banner */}
      {isSetupPending && <SetupPendingBanner />}

      {/* Stats */}
      <CenterStats capacity={center.capacity} />

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
                <span className="font-mono">{center.phone}</span>
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
              <InfoRow icon={Users} label={t('centers.capacity')}>
                {center.capacity} children
              </InfoRow>
              <InfoRow icon={Globe} label={t('centers.timezone')}>
                <span className="font-mono text-xs">{center.timezone}</span>
              </InfoRow>
              {center.licenseNumber && (
                <InfoRow icon={FileText} label={t('centers.licenseNumber')}>
                  {center.licenseNumber}
                </InfoRow>
              )}
              <InfoRow icon={CalendarDays} label="Created">
                {new Date(center.createdAt).toLocaleDateString()}
              </InfoRow>
            </dl>
          </CardContent>
        </Card>

        <CenterHoursDisplay
          hours={center.centerHours}
          centerId={isSetupPending ? center.id : undefined}
          centerName={isSetupPending ? center.name : undefined}
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
