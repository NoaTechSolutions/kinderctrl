'use client';

import Link from 'next/link';
import { Building2 } from 'lucide-react';
import { useRequireRole } from '@/lib/hooks/use-require-role';
import { useAuthStore } from '@/store/auth';
import { useMyChildren } from '@/lib/hooks/use-children';
import { useTranslation } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { CenterChildrenList } from '@/components/children/center-children-list';
import { ChildCard } from '@/components/children/child-card';
import { ChildrenEmptyState } from '@/components/children/children-empty-state';

// /children — role-branched (the backend enforces the real matrix; this is the
// client surface):
//   • DIRECTOR (or SA with a primary center) → their center's roster.
//   • SUPER_ADMIN without a center → prompt to pick one (SA manages a center's
//     children via the Children tab on /centers/[id], reusing CenterChildrenList).
//   • PARENT → their own children (read-only).
//   • STAFF → bounced by useRequireRole.
export default function ChildrenPage() {
  const { ready, allowed } = useRequireRole([
    'DIRECTOR',
    'SUPER_ADMIN',
    'PARENT',
  ]);
  const user = useAuthStore((s) => s.user);
  const { t } = useTranslation();

  if (!ready || !allowed || !user) return null;

  if (user.role === 'PARENT') return <ParentChildren />;
  if (user.centerId) {
    return (
      <CenterChildrenList
        centerId={user.centerId}
        heading={
          <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight">
            {t('children.title')}
          </h1>
        }
      />
    );
  }
  return <PickACenter />;
}

// ───────────────────────────────────── Parent read-only view

function ParentChildren() {
  const { t } = useTranslation();
  const { data: children, isLoading, error } = useMyChildren();

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight">
        {t('children.myChildren')}
      </h1>

      {error && <LoadError message={error.message} />}

      {isLoading && <ListSkeleton />}

      {!isLoading && children && children.length === 0 && <ChildrenEmptyState />}

      {!isLoading && children && children.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {children.map((c) => (
            <ChildCard key={c.id} child={c} />
          ))}
        </div>
      )}
    </div>
  );
}

// ───────────────────────────────────── SA without a center

function PickACenter() {
  const { t } = useTranslation();
  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight">
        {t('children.title')}
      </h1>
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div
          className="flex h-20 w-20 items-center justify-center rounded-full"
          style={{ background: 'var(--kc-surface-2)' }}
        >
          <Building2 className="h-10 w-10" style={{ color: 'var(--kc-text-4)' }} />
        </div>
        <h3 className="mt-4 font-display text-lg font-semibold">
          {t('children.selectCenter')}
        </h3>
        <p className="mt-2 max-w-sm text-sm" style={{ color: 'var(--kc-text-3)' }}>
          {t('children.selectCenterManaged')}
        </p>
        <Button asChild className="mt-6">
          <Link href="/centers">{t('children.goToCenters')}</Link>
        </Button>
      </div>
    </div>
  );
}

// ───────────────────────────────────── shared bits

function LoadError({ message }: { message?: string }) {
  const { t } = useTranslation();
  return (
    <div
      role="alert"
      className="rounded-lg border p-4"
      style={{
        background: 'var(--kc-error-bg)',
        borderColor: 'color-mix(in oklch, var(--kc-error), transparent 70%)',
      }}
    >
      <p className="text-sm" style={{ color: 'var(--kc-error)' }}>
        {t('children.loadError')}
        {message ? ` — ${message}` : ''}
      </p>
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-12 w-full rounded-lg" />
      <Skeleton className="h-16 w-full rounded-lg" />
      <Skeleton className="h-16 w-full rounded-lg" />
      <Skeleton className="h-16 w-full rounded-lg" />
    </div>
  );
}
