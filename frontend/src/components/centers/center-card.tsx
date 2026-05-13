'use client';

import Link from 'next/link';
import { Building2, Mail, MapPin, Phone, Users } from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/lib/i18n';
import { StatusBadge } from './status-badge';
import { formatPhoneUS } from '@/lib/utils/phone';
import type { Center } from '@/lib/types/center';

interface CenterCardProps {
  center: Center;
}

export function CenterCard({ center }: CenterCardProps) {
  const { t } = useTranslation();

  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardHeader>
        <div className="flex items-start gap-3">
          <div
            className="flex h-10 w-10 flex-none items-center justify-center rounded-lg"
            style={{
              background:
                'color-mix(in oklch, var(--kc-p-100), transparent 30%)',
              color: 'var(--kc-p-600)',
            }}
          >
            <Building2 className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <CardTitle
              className="text-base sm:text-lg truncate"
              title={center.name}
            >
              {center.name}
            </CardTitle>
            <div className="mt-1.5">
              <StatusBadge status={center.status} />
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-2.5">
        <Row icon={MapPin}>
          {center.street}, {center.city}, {center.state} {center.zipCode}
        </Row>
        <Row icon={Phone}>{formatPhoneUS(center.phone)}</Row>
        <Row icon={Mail} truncate title={center.email}>
          {center.email}
        </Row>
        <Row icon={Users}>
          {t('centers.capacity')}: {center.capacity}
        </Row>

        <div className="flex gap-2 pt-2">
          <Button asChild variant="outline" size="sm" className="flex-1">
            <Link href={`/centers/${center.id}`}>{t('centers.view')}</Link>
          </Button>
          <Button asChild size="sm" className="flex-1">
            <Link href={`/centers/${center.id}/edit`}>
              {t('centers.edit')}
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function Row({
  icon: Icon,
  children,
  truncate,
  title,
}: {
  icon: typeof Building2;
  children: React.ReactNode;
  truncate?: boolean;
  title?: string;
}) {
  return (
    <div
      className="flex items-start gap-2 text-sm"
      style={{ color: 'var(--kc-text-3)' }}
    >
      <Icon className="h-4 w-4 mt-0.5 flex-none" aria-hidden />
      <span
        className={truncate ? 'truncate min-w-0' : 'min-w-0'}
        title={title}
      >
        {children}
      </span>
    </div>
  );
}
