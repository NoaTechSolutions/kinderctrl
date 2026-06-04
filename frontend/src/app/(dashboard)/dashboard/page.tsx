'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Clock,
  Loader2,
  Lock,
  Play,
  Settings,
  Store,
  Unlock,
  UserCircle,
  type LucideIcon,
} from 'lucide-react';
import { toast } from 'sonner';

import { useAuthStore } from '@/store/auth';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CardWithHeader } from '@/components/ui/card-with-header';
import { activateKiosk, KioskNotConfiguredError } from '@/lib/api/kiosk';
import { useTranslation } from '@/lib/i18n';
import { getDashboardGreeting, getDisplayRole } from '@/lib/user-display';
import { TimeClockWidget } from '@/components/attendance/time-clock-widget';
import { useKioskSettings, useKioskActivity } from '@/lib/hooks/use-kiosk';
import { getPendingCount } from '@/lib/kiosk/offline-store';
import { useLockedKioskPins, useUnlockStaffKioskPin } from '@/lib/hooks/use-staff';
import { DashboardSkeleton } from '@/components/skeletons/dashboard-skeleton';
import { SuperAdminOverview } from '@/components/dashboard/super-admin-overview';

const STATS = [
  { title: 'Total Centers' },
  { title: 'Total Children' },
  { title: 'Active Staff' },
  { title: 'Attendance Today' },
];

// Compact, fixed-height stat card shared by the mobile kiosk row (grid-cols-3)
// and the mobile global stats grid (grid-cols-2). The fixed height is what
// guarantees every stat card lines up at the same compact height on phones —
// kiosk and "Coming soon" alike — regardless of icon/sublabel presence.
function CompactStatCard({
  icon: Icon,
  iconColor,
  label,
  value,
  sublabel,
}: {
  icon?: LucideIcon;
  iconColor?: string;
  label: string;
  value: string;
  sublabel?: string;
}) {
  return (
    <Card className="h-20">
      <CardContent className="flex h-full flex-col items-center justify-center gap-0.5 p-2 text-center">
        {Icon && <Icon className="h-4 w-4 flex-none" style={{ color: iconColor }} />}
        <p
          className="text-[10px] font-medium uppercase leading-tight tracking-wide"
          style={{ color: 'var(--kc-text-3)' }}
        >
          {label}
        </p>
        <p
          className="w-full truncate text-sm font-semibold leading-tight"
          style={{ color: 'var(--kc-text-1)' }}
        >
          {value}
        </p>
        {sublabel && (
          <p className="text-[10px] leading-tight" style={{ color: 'var(--kc-text-3)' }}>
            {sublabel}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// Launch flow shared by the desktop Kiosk card and the mobile section so the
// two never drift: activate (mint a kiosk session token) then navigate. A plain
// <Link href="/kiosk"> would skip activation. Fallback "Set up a PIN first" when
// the center has no PIN yet (KioskNotConfiguredError) → bounce to settings.
function useKioskLaunch() {
  const router = useRouter();
  const [launching, setLaunching] = useState(false);

  const launchKiosk = async () => {
    setLaunching(true);
    try {
      const result = await activateKiosk();
      sessionStorage.setItem('kc-kiosk-token', result.kioskSessionToken);
      sessionStorage.setItem('kc-kiosk-timeout', String(result.timeoutMin));
      router.push('/kiosk');
    } catch (e) {
      if (e instanceof KioskNotConfiguredError) {
        toast.error('Set up a PIN first');
      } else {
        toast.error('Could not launch kiosk');
      }
      router.push('/kiosk-settings');
    } finally {
      setLaunching(false);
    }
  };

  return { launching, launchKiosk };
}

// Desktop-only Kiosk card (hidden on phones — see the mobile section below).
function KioskWidget() {
  const { data: settings } = useKioskSettings();
  const isActive = settings?.isEnabled ?? false;
  const { launching, launchKiosk } = useKioskLaunch();

  return (
    <CardWithHeader icon={Store} title="Kiosk Mode">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5">
          <div
            className="w-2 h-2 rounded-full"
            style={{ background: isActive ? '#22c55e' : 'var(--kc-text-3)' }}
          />
          <span className="text-xs font-medium" style={{ color: isActive ? '#22c55e' : 'var(--kc-text-3)' }}>
            {isActive ? 'Active' : 'Not active'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={launchKiosk} disabled={launching} size="sm">
            {launching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
            Launch Kiosk
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/kiosk-settings">
              {isActive ? 'Manage' : 'Set up'}
              <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </div>
    </CardWithHeader>
  );
}

// Mobile-only (phones): a 2-button row under the title (Launch Kiosk + PIN
// Settings) + the 3 kiosk stat cards in a single row. Replaces the desktop
// Kiosk card on small screens; desktop layout is untouched.
function KioskMobileSection() {
  const { launching, launchKiosk } = useKioskLaunch();
  const { data: activity } = useKioskActivity();
  const [pendingSync, setPendingSync] = useState(0);

  useEffect(() => {
    getPendingCount().then(setPendingSync).catch(() => {});
  }, []);

  const lastActivityStr = activity?.lastActivity
    ? new Date(activity.lastActivity).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    : '—';

  const stats = [
    { label: 'Punches Today', value: String(activity?.todayCount ?? 0), icon: Activity, color: 'var(--kc-p-600)' },
    {
      label: 'Pending Sync',
      value: pendingSync > 0 ? `${pendingSync} pending` : 'All synced',
      icon: AlertTriangle,
      color: pendingSync > 0 ? '#f59e0b' : '#22c55e',
    },
    { label: 'Last Activity', value: lastActivityStr, icon: Clock, color: 'var(--kc-text-3)' },
  ];

  return (
    <div className="space-y-3 sm:hidden">
      {/* 2-button row */}
      <div className="grid grid-cols-2 gap-3">
        <Button onClick={launchKiosk} disabled={launching}>
          {launching ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Play className="mr-2 h-4 w-4 fill-current" />
          )}
          Launch Kiosk
        </Button>
        <Button asChild variant="outline">
          <Link href="/kiosk-settings">
            <Settings className="mr-2 h-4 w-4" /> PIN Settings
          </Link>
        </Button>
      </div>

      {/* Kiosk stats — all three in one row */}
      <div className="grid grid-cols-3 gap-2">
        {stats.map((s) => (
          <CompactStatCard
            key={s.label}
            icon={s.icon}
            iconColor={s.color}
            label={s.label}
            value={s.value}
          />
        ))}
      </div>
    </div>
  );
}

// Director alert: staff whose kiosk PIN locked after too many failed attempts.
function KioskPinLockedAlerts() {
  const { data: locked } = useLockedKioskPins();
  const unlock = useUnlockStaffKioskPin();

  if (!locked || locked.length === 0) return null;

  return (
    <div className="space-y-2">
      {locked.map((s) => (
        <div
          key={s.id}
          role="status"
          className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-lg border p-4"
          style={{
            background: 'color-mix(in oklch, var(--kc-error), transparent 88%)',
            borderColor: 'color-mix(in oklch, var(--kc-error), transparent 65%)',
          }}
        >
          <Lock className="h-5 w-5 flex-none" style={{ color: 'var(--kc-error)' }} aria-hidden />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium" style={{ color: 'var(--kc-text-1)' }}>
              {s.firstName} {s.lastName}&apos;s kiosk PIN is locked (too many attempts)
            </p>
            <p className="mt-0.5 text-sm" style={{ color: 'var(--kc-text-2)' }}>
              They can&apos;t clock in at the kiosk until you unlock it.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="flex-none"
            disabled={unlock.isPending}
            onClick={() =>
              unlock.mutate(s.id, {
                onSuccess: () =>
                  toast.success(`Unlocked ${s.firstName} ${s.lastName}'s kiosk PIN`),
                onError: (e) =>
                  toast.error(e instanceof Error ? e.message : 'Failed to unlock'),
              })
            }
          >
            <Unlock className="mr-1.5 h-3.5 w-3.5" /> Unlock
          </Button>
        </div>
      ))}
    </div>
  );
}

export default function DashboardPage() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);

  if (!user) return <DashboardSkeleton />;

  // PO QA #8 Opción C: nag STAFF members who skipped /profile/complete.
  // Only shown when role=STAFF AND linked staff record exists AND that
  // record has profileComplete=false. Disappears the moment they save
  // anything via /profile (useUpdateMyProfile refreshes the store).
  const showProfileBanner =
    user.role === 'STAFF' && user.staff && !user.staff.profileComplete;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight">
          {getDashboardGreeting(user)}
        </h1>
        <p
          className="mt-2 text-sm"
          style={{ color: 'var(--kc-text-3)' }}
        >
          {getDisplayRole(user)}
        </p>
      </div>

      {showProfileBanner && (
        <div
          role="status"
          className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-lg border p-4"
          style={{
            background: 'var(--kc-warning-bg)',
            borderColor:
              'color-mix(in oklch, var(--kc-warning), transparent 70%)',
          }}
        >
          <UserCircle
            className="h-6 w-6 flex-none"
            style={{ color: 'var(--kc-warning)' }}
            aria-hidden
          />
          <div className="flex-1 min-w-0">
            <p
              className="text-sm font-medium"
              style={{ color: 'var(--kc-text-1)' }}
            >
              {t('staff.profileBannerTitle')}
            </p>
            <p
              className="mt-0.5 text-sm"
              style={{ color: 'var(--kc-text-2)' }}
            >
              {t('staff.profileBannerBody')}
            </p>
          </div>
          <Button asChild variant="outline" size="sm" className="flex-none">
            <Link href="/profile/complete">
              {t('staff.profileBannerCta')}
              <ArrowRight className="ml-2 h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      )}

      {user.role === 'STAFF' && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <TimeClockWidget />
        </div>
      )}

      {(user.role === 'DIRECTOR' || user.role === 'SUPER_ADMIN') && (
        <>
          {/* Phones: 2-button row + kiosk stats in one row, right under the title */}
          <KioskMobileSection />
          {/* Desktop: original Kiosk Mode card, unchanged */}
          <div className="hidden sm:block">
            <KioskWidget />
          </div>
        </>
      )}

      {user.role === 'DIRECTOR' && <KioskPinLockedAlerts />}

      {user.role === 'SUPER_ADMIN' ? (
        <SuperAdminOverview />
      ) : (
        <>
          {/* Phones: compact 2x2, same fixed height as the kiosk stat cards */}
          <div className="grid grid-cols-2 gap-3 sm:hidden">
            {STATS.map((stat) => (
              <CompactStatCard
                key={stat.title}
                label={stat.title}
                value="—"
                sublabel="Coming soon"
              />
            ))}
          </div>

          {/* Desktop: original cards, unchanged */}
          <div className="hidden gap-3 sm:grid sm:grid-cols-2 md:grid-cols-4">
            {STATS.map((stat) => (
              <Card key={stat.title}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {stat.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-display font-semibold">—</div>
                  <p
                    className="text-xs mt-1"
                    style={{ color: 'var(--kc-text-3)' }}
                  >
                    Coming soon
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
