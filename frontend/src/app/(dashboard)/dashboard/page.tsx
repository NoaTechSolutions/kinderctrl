'use client';

import Link from 'next/link';
import { ArrowRight, TabletSmartphone, UserCircle } from 'lucide-react';

import { useAuthStore } from '@/store/auth';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/lib/i18n';
import { getDashboardGreeting, getDisplayRole } from '@/lib/user-display';
import { TimeClockWidget } from '@/components/attendance/time-clock-widget';
import { useKioskSettings } from '@/lib/hooks/use-kiosk';
import { DashboardSkeleton } from '@/components/skeletons/dashboard-skeleton';
import { SuperAdminOverview } from '@/components/dashboard/super-admin-overview';

const STATS = [
  { title: 'Total Centers' },
  { title: 'Total Children' },
  { title: 'Active Staff' },
  { title: 'Attendance Today' },
];

function KioskWidget() {
  const { data: settings } = useKioskSettings();
  const isActive = settings?.isEnabled ?? false;

  return (
    <Card>
      <CardContent className="py-4 px-5">
        <div className="flex items-center gap-4">
          <div className="p-2.5 rounded-lg" style={{ background: 'var(--kc-p-600)1A' }}>
            <TabletSmartphone className="h-5 w-5" style={{ color: 'var(--kc-p-600)' }} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold" style={{ color: 'var(--kc-text-1)' }}>Kiosk Mode</h3>
            <p className="text-xs mt-0.5" style={{ color: 'var(--kc-text-3)' }}>
              Shared device for staff clock-in/out
            </p>
            <div className="flex items-center gap-1.5 mt-1.5">
              <div
                className="w-2 h-2 rounded-full"
                style={{ background: isActive ? '#22c55e' : 'var(--kc-text-3)' }}
              />
              <span className="text-xs font-medium" style={{ color: isActive ? '#22c55e' : 'var(--kc-text-3)' }}>
                {isActive ? 'Active' : 'Not active'}
              </span>
            </div>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/kiosk-settings">
              {isActive ? 'Manage' : 'Set up'}
              <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
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
        <KioskWidget />
      )}

      {user.role === 'SUPER_ADMIN' ? (
        <SuperAdminOverview />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
      )}
    </div>
  );
}
