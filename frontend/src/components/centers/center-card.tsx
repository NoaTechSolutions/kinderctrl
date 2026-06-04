'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Building2,
  ChevronDown,
  FileText,
  Mail,
  MapPin,
  Phone,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
} from '@/components/ui/card';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { StatusBadge } from './status-badge';
import { AdminCenterBadge } from './admin-center-badge';
import { formatPhoneUS } from '@/lib/utils/phone';
import type { Center } from '@/lib/types/center';

interface CenterCardProps {
  center: Center;
}

/**
 * Mobile-first collapsible center card.
 *
 * Closed: building icon, truncated name, status badge, chevron — whole
 * header is the trigger so the entire card surface is tappable.
 *
 * Open: name un-truncated, chevron flipped, full address / phone / email
 * / license rows, plus a primary "View" button that navigates to the
 * detail page. Edit is intentionally NOT exposed here — admins follow
 * View -> detail -> Edit (which already gates by canManage + isClosed).
 */
export function CenterCard({ center }: CenterCardProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card className="overflow-hidden gap-3 py-3 transition-shadow hover:shadow-md">
        <CollapsibleTrigger
          className="block w-full cursor-pointer bg-transparent text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
          style={
            {
              // Match the project's primary focus ring token.
              '--tw-ring-color':
                'color-mix(in oklch, var(--kc-p-500), transparent 60%)',
            } as React.CSSProperties
          }
          aria-label={
            open
              ? `${t('centers.view')} ${center.name}`
              : `${center.name} ${t('centers.view')}`
          }
        >
          <CardHeader className="grid-cols-1">
            <div className="flex items-start gap-3 min-w-0">
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
                <h3
                  className={cn(
                    'text-base font-semibold leading-tight',
                    open ? '' : 'truncate',
                  )}
                  title={open ? undefined : center.name}
                >
                  {center.name}
                </h3>
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  <StatusBadge status={center.status} />
                  {center.isAdminCenter && <AdminCenterBadge />}
                </div>
              </div>
              <ChevronDown
                className={cn(
                  'h-5 w-5 flex-none mt-1 transition-transform duration-200',
                  open && 'rotate-180',
                )}
                style={{ color: 'var(--kc-text-3)' }}
                aria-hidden
              />
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="space-y-2.5">
            <Row icon={MapPin}>
              {center.street}, {center.city}, {center.state} {center.zipCode}
            </Row>
            <Row icon={Phone}>{formatPhoneUS(center.phone)}</Row>
            <Row icon={Mail} truncate title={center.email}>
              {center.email}
            </Row>
            {center.licenseNumber && (
              <Row icon={FileText}>
                {t('centers.licenseNumber')}: {center.licenseNumber}
              </Row>
            )}

            <div className="mt-3 flex gap-2">
              <Button asChild className="flex-1">
                <Link href={`/centers/${center.id}`}>{t('centers.view')}</Link>
              </Button>
              {/* Admin center is system-managed — edit is not permitted. */}
              {!center.isAdminCenter && center.status !== 'CLOSED' && (
                <Button asChild variant="outline" className="flex-1">
                  <Link href={`/centers/${center.id}/edit`}>
                    {t('centers.edit')}
                  </Link>
                </Button>
              )}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
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
