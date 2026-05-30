'use client';

import Link from 'next/link';
import { AlertTriangle, ArrowRight, Clock, DollarSign, FileEdit } from 'lucide-react';
import { CardWithHeader } from '@/components/ui/card-with-header';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthStore } from '@/store/auth';
import { useGlobalStats } from '@/lib/hooks/use-centers';

// Critical alerts card for SUPER_ADMIN — corrections >48h, payroll overdue,
// staff without clock-in 7d. Renders nothing for non-SA roles so it's safe
// to drop into any page without an outer role check.
export function CriticalAlerts() {
  const user = useAuthStore((s) => s.user);
  if (user?.role !== 'SUPER_ADMIN') return null;
  return <CriticalAlertsInner />;
}

function CriticalAlertsInner() {
  const { data, isLoading } = useGlobalStats();

  if (isLoading) {
    return (
      <CardWithHeader icon={AlertTriangle} title="Critical Alerts">
        <Skeleton className="h-10 w-full rounded-md" />
      </CardWithHeader>
    );
  }
  if (!data) return null;

  const { oldCorrections, overduePayrolls, staffWithoutClockIn } = data.alerts;
  const total = oldCorrections + overduePayrolls + staffWithoutClockIn;

  if (total === 0) {
    return (
      <CardWithHeader icon={AlertTriangle} title="Critical Alerts">
        <p className="text-sm text-center py-4" style={{ color: 'var(--kc-text-3)' }}>
          ✅ Everything looks healthy.
        </p>
      </CardWithHeader>
    );
  }

  return (
    <CardWithHeader icon={AlertTriangle} title="Critical Alerts">
      <div className="space-y-2">
        {oldCorrections > 0 && (
          <AlertRow
            icon={FileEdit}
            color="var(--kc-warning)"
            label={`${oldCorrections} correction request${oldCorrections > 1 ? 's' : ''} pending more than 48h`}
            href="/attendance/corrections"
          />
        )}
        {overduePayrolls > 0 && (
          <AlertRow
            icon={DollarSign}
            color="var(--kc-error)"
            label={`${overduePayrolls} payroll period${overduePayrolls > 1 ? 's' : ''} overdue (still OPEN past 7 days)`}
            href="/reports/payroll"
          />
        )}
        {staffWithoutClockIn > 0 && (
          <AlertRow
            icon={Clock}
            color="var(--kc-warning)"
            label={`${staffWithoutClockIn} active staff with no clock-in in the last 7 days`}
          />
        )}
      </div>
    </CardWithHeader>
  );
}

function AlertRow({
  icon: Icon,
  color,
  label,
  href,
}: {
  icon: typeof FileEdit;
  color: string;
  label: string;
  href?: string;
}) {
  const inner = (
    <div
      className="flex items-center gap-3 py-2 px-3 rounded-md"
      style={{ background: 'var(--kc-surface-2)' }}
    >
      <Icon className="h-4 w-4 flex-none" style={{ color }} aria-hidden />
      <p className="flex-1 text-sm" style={{ color: 'var(--kc-text-1)' }}>
        {label}
      </p>
      {href && <ArrowRight className="h-4 w-4 flex-none" style={{ color: 'var(--kc-text-3)' }} />}
    </div>
  );
  if (href) {
    return (
      <Link href={href} className="block hover:opacity-80 transition-opacity">
        {inner}
      </Link>
    );
  }
  return inner;
}
