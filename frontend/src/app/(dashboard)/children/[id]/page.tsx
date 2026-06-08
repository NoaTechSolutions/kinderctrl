'use client';

import { useRef } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Baby, TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useRequireRole } from '@/lib/hooks/use-require-role';
import { useAuthStore } from '@/store/auth';
import { useChild } from '@/lib/hooks/use-children';
import { useTranslation } from '@/lib/i18n';
import { ChildStatusBadge } from '@/components/children/child-status-badge';
import {
  ChildDetailTabs,
  type DetailNavigate,
} from '@/components/children/detail/child-detail-tabs';
import { childFullName, formatAge } from '@/lib/format-child';

export default function ChildDetailPage() {
  const { ready, allowed } = useRequireRole(['DIRECTOR', 'SUPER_ADMIN', 'PARENT']);
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const { data: child, isLoading, error } = useChild(id);
  const role = useAuthStore((s) => s.user?.role);
  const canManage = role === 'DIRECTOR' || role === 'SUPER_ADMIN';
  const { t } = useTranslation();
  // Guarded navigator the header alert badges call (set by ChildDetailTabs).
  const navRef = useRef<DetailNavigate | null>(null);

  if (!ready || !allowed) return null;

  if (isLoading) {
    return (
      <div className="mx-auto max-w-5xl space-y-6">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (error || !child) {
    return (
      <div className="mx-auto max-w-5xl space-y-4">
        <BackLink />
        <div
          role="alert"
          className="rounded-lg border p-4"
          style={{
            background: 'var(--kc-error-bg)',
            borderColor: 'color-mix(in oklch, var(--kc-error), transparent 70%)',
          }}
        >
          <p className="text-sm" style={{ color: 'var(--kc-error)' }}>
            {t('children.notFound')}
          </p>
        </div>
      </div>
    );
  }

  // Header alert badges — ONE per alert TYPE the child actually has, visible
  // from every tab. Clicking jumps (guarded) to the card where the data lives.
  const med = child.medicalInfo;
  const hasAllergies =
    !!med &&
    ((Array.isArray(med.allergies) && med.allergies.length > 0) || !!med.medicationAllergies);
  const hasSpecialCare =
    !!med &&
    (med.hasSpecialNeeds ||
      !!med.specialDevices ||
      (Array.isArray(med.medicalConditions) && med.medicalConditions.length > 0));

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <BackLink />

      <div className="flex items-start gap-3 min-w-0">
        <div
          className="flex h-12 w-12 flex-none items-center justify-center rounded-xl"
          style={{
            background: 'color-mix(in oklch, var(--kc-p-100), transparent 30%)',
            color: 'var(--kc-p-600)',
          }}
        >
          <Baby className="h-6 w-6" />
        </div>
        <div className="min-w-0">
          <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight">
            {childFullName(child)}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <ChildStatusBadge status={child.enrollmentStatus} />
            {hasAllergies && (
              <button
                type="button"
                onClick={() => navRef.current?.('medical', 'medical-card-allergies')}
                title={t('children.alertBadgeHint')}
                className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold transition-opacity hover:opacity-80"
                style={{
                  background: 'var(--kc-error-bg)',
                  color: 'var(--kc-error)',
                  border: '1px solid color-mix(in oklch, var(--kc-error), transparent 60%)',
                }}
              >
                <TriangleAlert className="h-3.5 w-3.5" />
                {t('children.badgeAllergies')}
              </button>
            )}
            {hasSpecialCare && (
              <button
                type="button"
                onClick={() => navRef.current?.('medical', 'medical-card-health')}
                title={t('children.alertBadgeHint')}
                className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold transition-opacity hover:opacity-80"
                style={{
                  background: 'var(--kc-warning-bg, var(--kc-surface-2))',
                  color: 'var(--kc-warning, var(--kc-text-2))',
                  border: '1px solid color-mix(in oklch, var(--kc-warning, var(--kc-text-3)), transparent 60%)',
                }}
              >
                <TriangleAlert className="h-3.5 w-3.5" />
                {t('children.badgeSpecialCare')}
              </button>
            )}
            <span className="text-sm" style={{ color: 'var(--kc-text-3)' }}>
              {formatAge(child.dateOfBirth, t)}
            </span>
          </div>
        </div>
      </div>

      <ChildDetailTabs child={child} canManage={canManage} navRef={navRef} />
    </div>
  );
}

function BackLink() {
  const { t } = useTranslation();
  return (
    <Button asChild variant="ghost" size="sm" className="-ml-2">
      <Link href="/children">
        <ArrowLeft className="mr-1 h-4 w-4" />
        {t('children.title')}
      </Link>
    </Button>
  );
}
