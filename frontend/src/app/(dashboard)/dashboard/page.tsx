'use client';

import { useAuthStore } from '@/store/auth';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { getDashboardGreeting, getDisplayRole } from '@/lib/user-display';

const STATS = [
  { title: 'Total Centers' },
  { title: 'Total Children' },
  { title: 'Active Staff' },
  { title: 'Attendance Today' },
];

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);

  if (!user) return null;

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
    </div>
  );
}
