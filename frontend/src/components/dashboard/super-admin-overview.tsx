'use client';

import { Baby, Building2, UserCog, Users } from 'lucide-react';
import { CardWithHeader } from '@/components/ui/card-with-header';
import { Skeleton } from '@/components/ui/skeleton';
import { useGlobalStats } from '@/lib/hooks/use-centers';

// SUPER_ADMIN top-level counts shown on /dashboard. The Critical Alerts
// card and per-center list moved to /centers — this view is intentionally
// minimal so the dashboard reads "at a glance."
export function SuperAdminOverview() {
  const { data, isLoading } = useGlobalStats();

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <StatTile icon={Building2} label="Centers" value={String(data?.counts.centers ?? 0)} />
      <StatTile icon={Users} label="Active Staff" value={String(data?.counts.staff ?? 0)} />
      <StatTile icon={Baby} label="Active Children" value={String(data?.counts.children ?? 0)} />
      <StatTile icon={UserCog} label="Directors" value={String(data?.counts.directors ?? 0)} />
    </div>
  );
}

function StatTile({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Building2;
  label: string;
  value: string;
}) {
  return (
    <CardWithHeader icon={Icon} title={label}>
      <p className="text-2xl font-bold text-center tabular-nums" style={{ color: 'var(--kc-p-600)' }}>
        {value}
      </p>
    </CardWithHeader>
  );
}
