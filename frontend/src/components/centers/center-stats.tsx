'use client';

import { Baby, UserCog, Users } from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from '@/lib/i18n';

interface CenterStatsProps {
  capacity: number;
}

export function CenterStats({ capacity }: CenterStatsProps) {
  const { t } = useTranslation();

  const stats = [
    {
      icon: Baby,
      label: t('centers.totalChildren'),
      value: '—',
      sub: t('centers.currentCapacity') + `: ${capacity}`,
      soon: true,
    },
    {
      icon: Users,
      label: t('centers.activeStaff'),
      value: '—',
      sub: 'Coming soon',
      soon: true,
    },
    {
      icon: UserCog,
      label: t('centers.enrolledParents'),
      value: '—',
      sub: 'Coming soon',
      soon: true,
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {stats.map(({ icon: Icon, label, value, sub, soon }) => (
        <Card key={label}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{label}</CardTitle>
            <Icon
              className="h-4 w-4"
              style={{ color: 'var(--kc-text-3)' }}
              aria-hidden
            />
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <div className="text-2xl font-display font-semibold tabular-nums">
                {value}
              </div>
              {soon && (
                <Badge
                  variant="secondary"
                  className="text-[10px] px-1.5 py-0"
                >
                  Soon
                </Badge>
              )}
            </div>
            <p
              className="text-xs mt-1"
              style={{ color: 'var(--kc-text-3)' }}
            >
              {sub}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
