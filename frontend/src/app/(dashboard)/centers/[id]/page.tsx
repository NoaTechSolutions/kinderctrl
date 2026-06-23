'use client';

import { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams, usePathname } from 'next/navigation';
import {
  AlertTriangle,
  ArrowLeft,
  Baby,
  Building2,
  CalendarDays,
  Clock,
  DollarSign,
  Edit,
  Eye,
  EyeOff,
  FileEdit,
  FileText,
  Globe,
  Loader2,
  Mail,
  MapPin,
  Phone,
  TabletSmartphone,
  Users,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { CardWithHeader } from '@/components/ui/card-with-header';
import { Skeleton } from '@/components/ui/skeleton';
import { FilterTabs, type FilterTab } from '@/components/ui/filter-tabs';
import { useCenter, useCenterStats, useUpdateCenter } from '@/lib/hooks/use-centers';
import { ApiError } from '@/lib/api/client';
import { useTranslation } from '@/lib/i18n';
import { StatusBadge } from '@/components/centers/status-badge';
import { AdminCenterBadge } from '@/components/centers/admin-center-badge';
import { CenterHoursDisplay } from '@/components/centers/center-hours-display';
import { SetupPendingBanner } from '@/components/centers/setup-pending-banner';
import { AdminActionsMenu } from '@/components/centers/admin-actions-menu';
import { ChangeDirectorDialog } from '@/components/centers/change-director-dialog';
import { CenterStaffList } from '@/components/staff/center-staff-list';
import { CenterChildrenList } from '@/components/children/center-children-list';
import { TeamClockView } from '@/components/attendance/team-clock-view';
import { SchedulesView } from '@/components/attendance/schedules-view';
import { CorrectionsView } from '@/components/attendance/corrections-view';
import { WeeklyApprovalSection } from '@/components/attendance/weekly-approval-section';
import { formatPhoneUS } from '@/lib/utils/phone';
import { useAuthStore } from '@/store/auth';
import { usePayrollSettings, useUpsertPayrollSettings } from '@/lib/hooks/use-attendance';
import { PayrollReports } from '@/components/payroll/payroll-reports';
import { useKioskSettings, useSetupKiosk } from '@/lib/hooks/use-kiosk';
import { toast } from '@/lib/toast';
import type { CenterStats } from '@/lib/api/centers';
import type { PayrollSettings } from '@/lib/api/attendance';
import type { Center } from '@/lib/types/center';

type TabValue = 'overview' | 'staff' | 'children' | 'attendance' | 'settings' | 'reports';

const TAB_VALUES: ReadonlyArray<TabValue> = ['overview', 'staff', 'children', 'attendance', 'settings', 'reports'];

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

  // Role-based access to the center detail page:
  //  - SUPER_ADMIN → full tabbed management view (4 tabs).
  //  - DIRECTOR / STAFF → plain view of their center, NO management tabs.
  //  - PARENT → not allowed here; bounced to the dashboard.
  // The 4 tabs (Staff/Attendance/Settings) are a SUPER_ADMIN-only surface.
  const role = user?.role;
  const canViewDetail =
    role === 'SUPER_ADMIN' || role === 'DIRECTOR' || role === 'STAFF';
  useEffect(() => {
    if (role && !canViewDetail) {
      router.replace('/dashboard');
    }
  }, [role, canViewDetail, router]);

  const tabs = useMemo<ReadonlyArray<FilterTab<TabValue>>>(
    () => [
      { value: 'overview', label: 'Overview' },
      { value: 'staff', label: 'Staff' },
      { value: 'children', label: 'Children' },
      { value: 'attendance', label: 'Attendance' },
      { value: 'settings', label: 'Settings' },
      { value: 'reports', label: 'Reports' },
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
  // PARENT is mid-redirect (effect above) — render nothing.
  if (role && !canViewDetail) return null;
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
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <StatusBadge status={center.status} />
              {/* System-managed admin center — distinct indigo/slate badge */}
              {center.isAdminCenter && <AdminCenterBadge />}
              {center.licenseNumber && (
                <span className="font-mono text-xs" style={{ color: 'var(--kc-text-3)' }}>
                  {center.licenseNumber}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {isSetupPending && (
        <SetupPendingBanner
          centerId={canManage ? center.id : undefined}
          centerName={canManage ? center.name : undefined}
          initialHours={center.centerHours}
        />
      )}

      {isSuperAdmin ? (
        <>
          <FilterTabs tabs={tabs} value={tab} onChange={setTab} ariaLabel="Center sections" />

          {tab === 'overview' && (
            <OverviewTab center={center} canManage={canManage} isSuperAdmin={isSuperAdmin} />
          )}
          {tab === 'staff' && <StaffTab centerId={center.id} />}
          {tab === 'children' && <ChildrenTab centerId={center.id} />}
          {tab === 'attendance' && <AttendanceTab centerId={center.id} />}
          {tab === 'settings' && <SettingsTab center={center} canManage={canManage} />}
          {tab === 'reports' && <ReportsTab centerId={center.id} />}
        </>
      ) : (
        // DIRECTOR: plain center view, no management tabs — they handle
        // staff/attendance/settings from their own modules.
        <OverviewTab center={center} canManage={canManage} isSuperAdmin={false} />
      )}
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
  const { data: stats, isLoading } = useCenterStats(center.id, canManage);
  const isClosed = center.status === 'CLOSED';
  const [changeDirectorOpen, setChangeDirectorOpen] = useState(false);

  const currentDirectorName =
    [center.owner?.firstName, center.owner?.lastName].filter(Boolean).join(' ') ||
    center.owner?.email ||
    'the current director';

  return (
    <div className="space-y-6">
      {/* Stats + alerts are management data — only DIRECTOR/SUPER_ADMIN
          (canManage). STAFF sees the plain center info below, no stats
          (the stats endpoint is DIRECTOR/SA-only). */}
      {canManage && (
        <>
          {/* 4 stats */}
          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full rounded-lg" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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
        </>
      )}

      {/* Info + Hours grid (same as before) */}
      <div className="grid gap-4 md:grid-cols-3">
        <CardWithHeader
          icon={Building2}
          title="Center Information"
          className="md:col-span-2"
          action={
            // Admin center is system-managed — hide the edit action entirely.
            canManage && !center.isAdminCenter ? (
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
          <div className="space-y-0.5">
            <p className="text-sm font-medium" style={{ color: 'var(--kc-text-1)' }}>
              {currentDirectorName}
            </p>
            {center.owner?.email &&
              currentDirectorName !== center.owner.email && (
                <p className="text-xs" style={{ color: 'var(--kc-text-3)' }}>
                  {center.owner.email}
                </p>
              )}
          </div>
          {/* Admin center is system-managed — director change is not permitted. */}
          {isSuperAdmin && !center.isAdminCenter && (
            <Button
              variant="outline"
              onClick={() => setChangeDirectorOpen(true)}
              className="self-start sm:self-auto"
            >
              <Edit className="mr-2 h-3.5 w-3.5" />
              Change Director
            </Button>
          )}
        </div>
      </CardWithHeader>

      {isSuperAdmin && !center.isAdminCenter && (
        <ChangeDirectorDialog
          centerId={center.id}
          centerName={center.name}
          currentDirectorName={currentDirectorName}
          currentDirectorEmail={center.owner?.email ?? ''}
          open={changeDirectorOpen}
          onOpenChange={setChangeDirectorOpen}
        />
      )}

      {/* SUPER_ADMIN admin actions (status changes, delete).
          Admin center is system-managed — all mutating actions are hidden. */}
      {isSuperAdmin && !center.isAdminCenter && (
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
  return <CenterStaffList centerId={centerId} />;
}

// ============================================================ CHILDREN

// SUPER_ADMIN parity — same roster component the Director sees at /children,
// scoped to this center. "+ New Child" / detail / edit all carry the centerId.
function ChildrenTab({ centerId }: { centerId: string }) {
  return <CenterChildrenList centerId={centerId} />;
}

// ============================================================ REPORTS (SUPER_ADMIN only)

function ReportsTab({ centerId }: { centerId: string }) {
  return <PayrollReports centerId={centerId} />;
}

// ========================================================== ATTENDANCE

type AttendanceSubTab = 'team-clock' | 'schedules' | 'corrections' | 'approvals';

const ATTENDANCE_SUB_TABS: ReadonlyArray<FilterTab<AttendanceSubTab>> = [
  { value: 'team-clock', label: 'Team Clock' },
  { value: 'schedules', label: 'Schedules' },
  { value: 'corrections', label: 'Corrections' },
  { value: 'approvals', label: 'Approvals' },
];

function AttendanceTab({ centerId }: { centerId: string }) {
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

  // Each sub-tab mounts the same component the dedicated /attendance pages
  // use, but scoped to this center via centerId (SUPER_ADMIN path).
  return (
    <div className="space-y-4">
      <FilterTabs
        tabs={ATTENDANCE_SUB_TABS}
        value={sub}
        onChange={setSub}
        ariaLabel="Attendance sub-sections"
      />

      {sub === 'team-clock' && <TeamClockView centerId={centerId} />}
      {sub === 'schedules' && <SchedulesView centerId={centerId} />}
      {sub === 'corrections' && <CorrectionsView centerId={centerId} />}
      {sub === 'approvals' && <WeeklyApprovalSection centerId={centerId} />}
    </div>
  );
}

// ============================================================ SETTINGS

function SettingsTab({ center, canManage }: { center: Center; canManage: boolean }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {/* Operating Hours — kept as-is */}
      <CenterHoursDisplay
        hours={center.centerHours}
        centerId={canManage ? center.id : undefined}
        centerName={canManage ? center.name : undefined}
        centerStatus={center.status}
      />

      <PayrollSettingsCard centerId={center.id} canManage={canManage} />
      <KioskSettingsCard centerId={center.id} canManage={canManage} />
      <GeofenceCard center={center} canManage={canManage} />
    </div>
  );
}

// -------------------------------------------------- Payroll Settings card

function PayrollSettingsCard({
  centerId,
  canManage,
}: {
  centerId: string;
  canManage: boolean;
}) {
  const { data: settings, isLoading } = usePayrollSettings(centerId);
  const upsert = useUpsertPayrollSettings(centerId);

  const [freq, setFreq] = useState<PayrollSettings['frequency']>('WEEKLY');
  const [breakPaid, setBreakPaid] = useState(false);
  const [dailyOT, setDailyOT] = useState(8);
  const [weeklyOT, setWeeklyOT] = useState(40);
  const [otRate, setOtRate] = useState(1.5);
  const [synced, setSynced] = useState(false);

  // One-time sync from server data once it arrives.
  if (settings && !synced) {
    setFreq(settings.frequency);
    setBreakPaid(settings.breakPaid);
    setDailyOT(settings.overtimeDailyThreshold);
    setWeeklyOT(settings.overtimeWeeklyThreshold);
    setOtRate(settings.overtimeRate);
    setSynced(true);
  }

  const handleSave = async () => {
    try {
      await upsert.mutateAsync({
        frequency: freq,
        breakPaid,
        overtimeDailyThreshold: dailyOT,
        overtimeWeeklyThreshold: weeklyOT,
        overtimeRate: otRate,
      });
      toast.success('Payroll settings saved');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save payroll settings');
    }
  };

  const inputCls = 'mt-1 w-full h-9 rounded-md border px-3 text-sm';
  const inputStyle = {
    borderColor: 'var(--kc-border)',
    background: 'var(--kc-bg)',
    color: 'var(--kc-text-1)',
  } as const;

  return (
    <CardWithHeader icon={DollarSign} title="Payroll Settings">
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-full rounded-md" />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium" style={{ color: 'var(--kc-text-1)' }}>
              Payment Frequency
            </label>
            <select
              value={freq}
              onChange={(e) => setFreq(e.target.value as typeof freq)}
              className={inputCls}
              style={inputStyle}
              disabled={!canManage}
            >
              <option value="WEEKLY">Weekly</option>
              <option value="BIWEEKLY">Biweekly</option>
              <option value="MONTHLY">Monthly</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-medium" style={{ color: 'var(--kc-text-1)' }}>
              Break Paid
            </label>
            <select
              value={breakPaid ? 'yes' : 'no'}
              onChange={(e) => setBreakPaid(e.target.value === 'yes')}
              className={inputCls}
              style={inputStyle}
              disabled={!canManage}
            >
              <option value="no">No</option>
              <option value="yes">Yes</option>
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium" style={{ color: 'var(--kc-text-1)' }}>
                Daily OT After (h)
              </label>
              <input
                type="number"
                value={dailyOT}
                onChange={(e) => setDailyOT(Number(e.target.value))}
                min={1}
                max={24}
                className={inputCls}
                style={inputStyle}
                disabled={!canManage}
              />
            </div>
            <div>
              <label className="text-sm font-medium" style={{ color: 'var(--kc-text-1)' }}>
                Weekly OT After (h)
              </label>
              <input
                type="number"
                value={weeklyOT}
                onChange={(e) => setWeeklyOT(Number(e.target.value))}
                min={1}
                max={168}
                className={inputCls}
                style={inputStyle}
                disabled={!canManage}
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium" style={{ color: 'var(--kc-text-1)' }}>
              Overtime Rate
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={otRate}
                onChange={(e) => setOtRate(Number(e.target.value))}
                step={0.1}
                min={1}
                max={5}
                className={inputCls}
                style={inputStyle}
                disabled={!canManage}
              />
              <span className="text-sm flex-none" style={{ color: 'var(--kc-text-3)' }}>
                × rate
              </span>
            </div>
          </div>

          {canManage && (
            <Button onClick={handleSave} disabled={upsert.isPending} size="sm">
              {upsert.isPending && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
              Save Payroll Settings
            </Button>
          )}
        </div>
      )}
    </CardWithHeader>
  );
}

// ---------------------------------------------------- Kiosk Settings card

const TIMEOUT_OPTIONS = [1, 2, 3, 5, 10] as const;

function KioskSettingsCard({
  centerId,
  canManage,
}: {
  centerId: string;
  canManage: boolean;
}) {
  const { data: settings, isLoading } = useKioskSettings(centerId);
  const setupMutation = useSetupKiosk(centerId);

  const isConfigured = !!settings?.id;

  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [timeoutMin, setTimeoutMin] = useState(2);
  const [showPin, setShowPin] = useState(false);

  useEffect(() => {
    if (settings?.timeoutMin) setTimeoutMin(settings.timeoutMin);
  }, [settings?.timeoutMin]);

  const handleSave = async () => {
    if (newPin.length < 4 || newPin.length > 6) {
      toast.error('PIN must be 4–6 digits');
      return;
    }
    if (newPin !== confirmPin) {
      toast.error('PINs do not match');
      return;
    }
    try {
      await setupMutation.mutateAsync({ pin: newPin, timeoutMin });
      toast.success(isConfigured ? 'Kiosk PIN updated' : 'Kiosk configured');
      setNewPin('');
      setConfirmPin('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save kiosk settings');
    }
  };

  const inputCls = 'mt-1 w-full h-9 rounded-md border px-3 text-sm';
  const inputStyle = {
    borderColor: 'var(--kc-border)',
    background: 'var(--kc-bg)',
    color: 'var(--kc-text-1)',
  } as const;

  return (
    <CardWithHeader icon={TabletSmartphone} title="Kiosk Settings">
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-full rounded-md" />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Current status */}
          <div className="flex items-center gap-2">
            <div
              className="w-2.5 h-2.5 rounded-full flex-none"
              style={{ background: settings?.isEnabled ? 'var(--kc-success)' : 'var(--kc-text-3)' }}
            />
            <span className="text-sm" style={{ color: 'var(--kc-text-2)' }}>
              {!isConfigured
                ? 'Not configured'
                : settings?.isEnabled
                  ? 'Kiosk active'
                  : 'Kiosk inactive'}
            </span>
            {isConfigured && settings?.timeoutMin && (
              <span className="text-xs ml-auto" style={{ color: 'var(--kc-text-3)' }}>
                Timeout: {settings.timeoutMin} min
              </span>
            )}
          </div>

          {canManage && (
            <>
              {/* PIN fields */}
              <div>
                <label className="text-sm font-medium" style={{ color: 'var(--kc-text-1)' }}>
                  {isConfigured ? 'New PIN' : 'PIN'} (4–6 digits)
                </label>
                <div className="relative">
                  <input
                    type={showPin ? 'text' : 'password'}
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    maxLength={6}
                    placeholder="••••"
                    className={inputCls}
                    style={inputStyle}
                  />
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2"
                    onClick={() => setShowPin((v) => !v)}
                    aria-label={showPin ? 'Hide PIN' : 'Show PIN'}
                  >
                    {showPin
                      ? <EyeOff className="h-4 w-4" style={{ color: 'var(--kc-text-3)' }} />
                      : <Eye className="h-4 w-4" style={{ color: 'var(--kc-text-3)' }} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium" style={{ color: 'var(--kc-text-1)' }}>
                  Confirm PIN
                </label>
                <input
                  type="password"
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  maxLength={6}
                  placeholder="••••"
                  className={inputCls}
                  style={inputStyle}
                />
              </div>

              {/* Timeout picker */}
              <div>
                <label className="text-sm font-medium" style={{ color: 'var(--kc-text-1)' }}>
                  Inactivity Timeout
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 mt-1.5">
                  {TIMEOUT_OPTIONS.map((t) => (
                    <button
                      key={t}
                      type="button"
                      className="flex-1 py-1.5 rounded-md text-xs font-medium transition-colors text-center"
                      style={{
                        border: timeoutMin === t
                          ? '2px solid var(--kc-p-600)'
                          : '1px solid var(--kc-border)',
                        background: timeoutMin === t
                          ? 'color-mix(in srgb, var(--kc-p-600) 10%, transparent)'
                          : 'var(--kc-bg)',
                        color: timeoutMin === t ? 'var(--kc-p-600)' : 'var(--kc-text-2)',
                        padding: timeoutMin === t ? '5px 0' : '6px 0',
                      }}
                      onClick={() => setTimeoutMin(t)}
                    >
                      {t} min
                    </button>
                  ))}
                </div>
              </div>

              <Button
                size="sm"
                onClick={handleSave}
                disabled={setupMutation.isPending || newPin.length < 4 || !confirmPin}
              >
                {setupMutation.isPending && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
                {isConfigured ? 'Update PIN' : 'Set up Kiosk PIN'}
              </Button>
            </>
          )}
        </div>
      )}
    </CardWithHeader>
  );
}

// ------------------------------------------------------- Geofence card

function GeofenceCard({
  center,
  canManage,
}: {
  center: Center;
  canManage: boolean;
}) {
  const updateCenter = useUpdateCenter();

  const [lat, setLat] = useState(String(center.latitude ?? ''));
  const [lng, setLng] = useState(String(center.longitude ?? ''));
  const [radius, setRadius] = useState(String(center.geoFenceRadiusMeters ?? 0));

  const handleSave = async () => {
    const latNum = lat === '' ? null : Number(lat);
    const lngNum = lng === '' ? null : Number(lng);
    const radiusNum = Number(radius);

    if (latNum !== null && (latNum < -90 || latNum > 90)) {
      toast.error('Latitude must be between -90 and 90');
      return;
    }
    if (lngNum !== null && (lngNum < -180 || lngNum > 180)) {
      toast.error('Longitude must be between -180 and 180');
      return;
    }
    if (radiusNum < 1 || radiusNum > 100000) {
      toast.error('Radius must be between 1 and 100,000 meters');
      return;
    }

    try {
      await updateCenter.mutateAsync({
        id: center.id,
        data: {
          latitude: latNum,
          longitude: lngNum,
          geoFenceRadiusMeters: radiusNum,
        },
      });
      toast.success('Geofence settings saved');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save geofence');
    }
  };

  const inputCls = 'mt-1 w-full h-9 rounded-md border px-3 text-sm';
  const inputStyle = {
    borderColor: 'var(--kc-border)',
    background: 'var(--kc-bg)',
    color: 'var(--kc-text-1)',
  } as const;

  return (
    <CardWithHeader icon={MapPin} title="Geofence">
      <div className="space-y-4">
        <p className="text-xs" style={{ color: 'var(--kc-text-3)' }}>
          Set the center&apos;s geographic coordinates and the radius used to
          validate staff clock-ins.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium" style={{ color: 'var(--kc-text-1)' }}>
              Latitude
            </label>
            <input
              type="number"
              value={lat}
              onChange={(e) => setLat(e.target.value)}
              step="any"
              min={-90}
              max={90}
              placeholder="e.g. 34.0522"
              className={inputCls}
              style={inputStyle}
              disabled={!canManage}
            />
          </div>
          <div>
            <label className="text-sm font-medium" style={{ color: 'var(--kc-text-1)' }}>
              Longitude
            </label>
            <input
              type="number"
              value={lng}
              onChange={(e) => setLng(e.target.value)}
              step="any"
              min={-180}
              max={180}
              placeholder="e.g. -118.2437"
              className={inputCls}
              style={inputStyle}
              disabled={!canManage}
            />
          </div>
        </div>

        <div>
          <label className="text-sm font-medium" style={{ color: 'var(--kc-text-1)' }}>
            Radius (meters)
          </label>
          <input
            type="number"
            value={radius}
            onChange={(e) => setRadius(e.target.value)}
            min={1}
            max={100000}
            placeholder="e.g. 200"
            className={inputCls}
            style={inputStyle}
            disabled={!canManage}
          />
          <p className="mt-1 text-xs" style={{ color: 'var(--kc-text-3)' }}>
            1–100,000 m (set to 0 to disable geofencing)
          </p>
        </div>

        {canManage && (
          <Button
            size="sm"
            onClick={handleSave}
            disabled={updateCenter.isPending}
          >
            {updateCenter.isPending && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
            Save Geofence
          </Button>
        )}
      </div>
    </CardWithHeader>
  );
}
