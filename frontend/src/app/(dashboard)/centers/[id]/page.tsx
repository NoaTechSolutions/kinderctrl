'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams, usePathname } from 'next/navigation';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Baby,
  Building2,
  CalendarDays,
  Clock,
  DollarSign,
  Edit,
  Eye,
  FileEdit,
  FileText,
  Globe,
  Mail,
  MapPin,
  Phone,
  Store,
  TabletSmartphone,
  Users,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { CardWithHeader } from '@/components/ui/card-with-header';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { FilterTabs, type FilterTab } from '@/components/ui/filter-tabs';
import { useCenter, useCenterStats } from '@/lib/hooks/use-centers';
import { ApiError } from '@/lib/api/client';
import { useTranslation } from '@/lib/i18n';
import { StatusBadge } from '@/components/centers/status-badge';
import { CenterHoursDisplay } from '@/components/centers/center-hours-display';
import { SetupPendingBanner } from '@/components/centers/setup-pending-banner';
import { AdminActionsMenu } from '@/components/centers/admin-actions-menu';
import { formatPhoneUS } from '@/lib/utils/phone';
import { useAuthStore } from '@/store/auth';
import type { CenterStats } from '@/lib/api/centers';
import type { Center } from '@/lib/types/center';

type TabValue = 'overview' | 'staff' | 'attendance' | 'settings';

const TAB_VALUES: ReadonlyArray<TabValue> = ['overview', 'staff', 'attendance', 'settings'];

function parseTab(raw: string | null): TabValue {
  return (TAB_VALUES as readonly string[]).includes(raw ?? '')
    ? (raw as TabValue)
    : 'overview';
}

export default function CenterDetailPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const user = useAuthStore((s) => s.user);

  const tab = parseTab(searchParams.get('tab'));
  const { data: center, isLoading, error } = useCenter(id);

  const setTab = (next: TabValue) => {
    const sp = new URLSearchParams(searchParams.toString());
    if (next === 'overview') sp.delete('tab');
    else sp.set('tab', next);
    const qs = sp.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  };

  const canManage = user?.role === 'SUPER_ADMIN' || user?.role === 'DIRECTOR';
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const backToList = isSuperAdmin;

  const tabs = useMemo<ReadonlyArray<FilterTab<TabValue>>>(
    () => [
      { value: 'overview', label: 'Overview' },
      { value: 'staff', label: 'Staff' },
      { value: 'attendance', label: 'Attendance' },
      { value: 'settings', label: 'Settings' },
    ],
    [],
  );

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-5xl">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error) {
    const isNotFound = error instanceof ApiError && error.status === 404;
    return (
      <div className="space-y-4 max-w-5xl">
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
            borderColor: 'color-mix(in oklch, var(--kc-error), transparent 70%)',
          }}
        >
          <p className="text-sm" style={{ color: 'var(--kc-error)' }}>
            {isNotFound ? t('centers.notFound') : t('centers.loadError')}
          </p>
        </div>
      </div>
    );
  }

  if (!center) return null;
  const isSetupPending = center.status === 'SETUP_PENDING';

  return (
    <div className="space-y-6 max-w-5xl">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link href={backToList ? '/centers' : '/dashboard'}>
          <ArrowLeft className="mr-1 h-4 w-4" />
          {backToList ? t('centers.title') : 'Dashboard'}
        </Link>
      </Button>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div
            className="flex h-12 w-12 flex-none items-center justify-center rounded-xl"
            style={{
              background: 'color-mix(in oklch, var(--kc-p-100), transparent 30%)',
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
              {center.licenseNumber && (
                <span className="font-mono text-xs" style={{ color: 'var(--kc-text-3)' }}>
                  {center.licenseNumber}
                </span>
              )}
            </div>
          </div>
        </div>

        {isSuperAdmin && (
          <Button
            variant="outline"
            disabled
            title="Coming in next update"
            className="flex-none"
          >
            <Eye className="mr-2 h-4 w-4" />
            View as Director
            <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {isSetupPending && (
        <SetupPendingBanner
          centerId={canManage ? center.id : undefined}
          centerName={canManage ? center.name : undefined}
          initialHours={center.centerHours}
        />
      )}

      <FilterTabs tabs={tabs} value={tab} onChange={setTab} ariaLabel="Center sections" />

      {tab === 'overview' && (
        <OverviewTab center={center} canManage={canManage} isSuperAdmin={isSuperAdmin} />
      )}
      {tab === 'staff' && <StaffTab centerId={center.id} />}
      {tab === 'attendance' && <AttendanceTab />}
      {tab === 'settings' && <SettingsTab center={center} canManage={canManage} />}
    </div>
  );
}

// ============================================================ OVERVIEW

function OverviewTab({
  center,
  canManage,
  isSuperAdmin,
}: {
  center: Center;
  canManage: boolean;
  isSuperAdmin: boolean;
}) {
  const { t } = useTranslation();
  const { data: stats, isLoading } = useCenterStats(center.id);
  const isClosed = center.status === 'CLOSED';

  return (
    <div className="space-y-6">
      {/* 4 stats */}
      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatTile icon={Users} label="Active Staff" value={String(stats?.counts.staff ?? 0)} />
          <StatTile icon={Baby} label="Active Children" value={String(stats?.counts.children ?? 0)} />
          <StatTile icon={CalendarDays} label="Schedules" value={String(stats?.counts.schedules ?? 0)} />
          <StatTile
            icon={FileEdit}
            label="Pending Corrections"
            value={String(stats?.counts.corrections ?? 0)}
            color={(stats?.counts.corrections ?? 0) > 0 ? 'var(--kc-warning)' : undefined}
          />
        </div>
      )}

      {/* Critical alerts for this center */}
      {!isLoading && stats && <CenterAlerts alerts={stats.alerts} />}

      {/* Info + Hours grid (same as before) */}
      <div className="grid gap-4 lg:grid-cols-3">
        <CardWithHeader
          icon={Building2}
          title="Center Information"
          className="lg:col-span-2"
          action={
            canManage ? (
              <Button asChild variant="ghost" size="icon" className="h-7 w-7" title="Edit center" aria-label="Edit center" disabled={isClosed}>
                <Link
                  href={isClosed ? '#' : `/centers/${center.id}/edit`}
                  aria-disabled={isClosed}
                  tabIndex={isClosed ? -1 : 0}
                >
                  <Edit className="h-3.5 w-3.5" />
                </Link>
              </Button>
            ) : undefined
          }
        >
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
            {center.licenseNumber && (
              <InfoRow icon={FileText} label={t('centers.licenseNumber')}>
                {center.licenseNumber}
              </InfoRow>
            )}
          </dl>
        </CardWithHeader>

        <CenterHoursDisplay
          hours={center.centerHours}
          centerId={canManage ? center.id : undefined}
          centerName={canManage ? center.name : undefined}
          centerStatus={center.status}
        />
      </div>

      {/* Director card */}
      <CardWithHeader icon={Users} title="Director">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm" style={{ color: 'var(--kc-text-3)' }}>
            Director assignment is shown on the dashboard. Use the action on the right to change it.
          </p>
          {isSuperAdmin && (
            <Button
              variant="outline"
              disabled
              title="Coming in next update"
              className="self-start sm:self-auto"
            >
              <Edit className="mr-2 h-3.5 w-3.5" />
              Change Director
            </Button>
          )}
        </div>
      </CardWithHeader>

      {/* SUPER_ADMIN admin actions (status changes etc.) — original UX. */}
      {isSuperAdmin && (
        <div className="flex justify-end">
          <AdminActionsMenu center={center} />
        </div>
      )}
    </div>
  );
}

function StatTile({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: typeof Users;
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <CardWithHeader icon={Icon} title={label}>
      <p
        className="text-2xl font-bold text-center tabular-nums"
        style={{ color: color ?? 'var(--kc-p-600)' }}
      >
        {value}
      </p>
    </CardWithHeader>
  );
}

function CenterAlerts({ alerts }: { alerts: CenterStats['alerts'] }) {
  const total = alerts.oldCorrections + alerts.overduePayrolls + alerts.staffWithoutClockIn;
  if (total === 0) {
    return (
      <CardWithHeader icon={AlertTriangle} title="Alerts">
        <p className="text-sm text-center py-4" style={{ color: 'var(--kc-text-3)' }}>
          ✅ Everything looks healthy for this center.
        </p>
      </CardWithHeader>
    );
  }
  return (
    <CardWithHeader icon={AlertTriangle} title="Alerts">
      <div className="space-y-2">
        {alerts.oldCorrections > 0 && (
          <AlertRow
            icon={FileEdit}
            color="var(--kc-warning)"
            label={`${alerts.oldCorrections} correction request${alerts.oldCorrections > 1 ? 's' : ''} pending more than 48h`}
          />
        )}
        {alerts.overduePayrolls > 0 && (
          <AlertRow
            icon={DollarSign}
            color="var(--kc-error)"
            label={`${alerts.overduePayrolls} payroll period${alerts.overduePayrolls > 1 ? 's' : ''} overdue`}
          />
        )}
        {alerts.staffWithoutClockIn > 0 && (
          <AlertRow
            icon={Clock}
            color="var(--kc-warning)"
            label={`${alerts.staffWithoutClockIn} active staff with no clock-in in the last 7 days`}
          />
        )}
      </div>
    </CardWithHeader>
  );
}

function AlertRow({ icon: Icon, color, label }: { icon: typeof FileEdit; color: string; label: string }) {
  return (
    <div
      className="flex items-center gap-3 py-2 px-3 rounded-md"
      style={{ background: 'var(--kc-surface-2)' }}
    >
      <Icon className="h-4 w-4 flex-none" style={{ color }} aria-hidden />
      <p className="flex-1 text-sm" style={{ color: 'var(--kc-text-1)' }}>{label}</p>
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
      <Icon className="h-4 w-4 mt-1 flex-none" style={{ color: 'var(--kc-text-3)' }} aria-hidden />
      <div className="min-w-0">
        <dt className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--kc-text-3)' }}>
          {label}
        </dt>
        <dd className="mt-0.5 text-sm">{children}</dd>
      </div>
    </div>
  );
}

// ============================================================== STAFF

function StaffTab({ centerId }: { centerId: string }) {
  return (
    <CardWithHeader icon={Users} title="Staff">
      <div className="space-y-3 py-4 text-center">
        <p className="text-sm" style={{ color: 'var(--kc-text-2)' }}>
          Staff for this center.
        </p>
        <p className="text-xs" style={{ color: 'var(--kc-text-3)' }}>
          The embedded staff list will be wired in TANDA 2C once <code>useEffectiveCenterId</code>
          {' '}is in place. For now, open the full staff page filtered by this center:
        </p>
        <Button asChild variant="outline" className="mt-2">
          <Link href={`/staff?centerId=${centerId}`}>
            Open Staff list (this center)
            <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
          </Link>
        </Button>
      </div>
    </CardWithHeader>
  );
}

// ========================================================== ATTENDANCE

type AttendanceSubTab = 'team-clock' | 'schedules' | 'corrections' | 'approvals';

const ATTENDANCE_SUB_TABS: ReadonlyArray<FilterTab<AttendanceSubTab>> = [
  { value: 'team-clock', label: 'Team Clock' },
  { value: 'schedules', label: 'Schedules' },
  { value: 'corrections', label: 'Corrections' },
  { value: 'approvals', label: 'Approvals' },
];

const ATTENDANCE_SUB_PATHS: Record<AttendanceSubTab, string> = {
  'team-clock': '/attendance/team',
  schedules: '/attendance/schedules',
  corrections: '/attendance/corrections',
  approvals: '/attendance/team',
};

function AttendanceTab() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const rawSub = searchParams.get('sub') as AttendanceSubTab | null;
  const sub: AttendanceSubTab =
    rawSub && (['team-clock', 'schedules', 'corrections', 'approvals'] as const).includes(rawSub)
      ? rawSub
      : 'team-clock';

  const setSub = (next: AttendanceSubTab) => {
    const sp = new URLSearchParams(searchParams.toString());
    sp.set('sub', next);
    router.replace(`${pathname}?${sp.toString()}`);
  };

  const linkOut = ATTENDANCE_SUB_PATHS[sub];

  return (
    <div className="space-y-4">
      <FilterTabs
        tabs={ATTENDANCE_SUB_TABS}
        value={sub}
        onChange={setSub}
        ariaLabel="Attendance sub-sections"
      />

      <CardWithHeader icon={Clock} title="Attendance">
        <div className="space-y-3 py-4 text-center">
          <p className="text-sm" style={{ color: 'var(--kc-text-2)' }}>
            {sub === 'team-clock' && 'Team Clock view for this center.'}
            {sub === 'schedules' && 'Schedules for this center.'}
            {sub === 'corrections' && 'Correction requests for this center.'}
            {sub === 'approvals' && 'Hours approval grid for this center.'}
          </p>
          <p className="text-xs" style={{ color: 'var(--kc-text-3)' }}>
            Components mount here in TANDA 2C once the visiting-center context is in place
            so they query the correct center automatically.
          </p>
          <Button asChild variant="outline" className="mt-2">
            <Link href={linkOut}>
              Open {sub.replace('-', ' ')} page
              <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </CardWithHeader>
    </div>
  );
}

// ============================================================ SETTINGS

function SettingsTab({ center, canManage }: { center: Center; canManage: boolean }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <CenterHoursDisplay
        hours={center.centerHours}
        centerId={canManage ? center.id : undefined}
        centerName={canManage ? center.name : undefined}
        centerStatus={center.status}
      />

      <SettingsCard
        icon={DollarSign}
        title="Payroll Settings"
        description="Pay frequency, break rules, overtime thresholds."
        href="/reports/payroll"
        label="Open Payroll"
      />

      <SettingsCard
        icon={TabletSmartphone}
        title="Kiosk Settings"
        description="PIN, timeout, kiosk activity."
        href="/kiosk-settings"
        label="Open Kiosk"
      />

      <CardWithHeader icon={MapPin} title="Geofence">
        <p className="text-sm" style={{ color: 'var(--kc-text-3)' }}>
          Geofence configuration UI is not yet built. TODO: surface
          <code> latitude / longitude / geoFenceRadiusMeters</code> editing
          via the existing center edit form, or add a dedicated panel.
        </p>
      </CardWithHeader>
    </div>
  );
}

function SettingsCard({
  icon: Icon,
  title,
  description,
  href,
  label,
}: {
  icon: typeof Store;
  title: string;
  description: string;
  href: string;
  label: string;
}) {
  return (
    <Card>
      <CardContent className="pt-4 space-y-3">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4" style={{ color: 'var(--kc-p-600)' }} aria-hidden />
          <h3 className="font-semibold" style={{ color: 'var(--kc-text-1)' }}>
            {title}
          </h3>
        </div>
        <p className="text-sm" style={{ color: 'var(--kc-text-3)' }}>
          {description}
        </p>
        <Button asChild variant="outline" size="sm">
          <Link href={href}>
            {label}
            <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
