'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Plus, Search } from 'lucide-react';
import { useStaff } from '@/lib/hooks/use-staff';
import { useTranslation } from '@/lib/i18n';
import { useAuthStore } from '@/store/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { StaffTable } from '@/components/staff/staff-table';
import { StaffCard } from '@/components/staff/staff-card';
import { EmptyState } from '@/components/staff/empty-state';

export default function StaffPage() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const { data: staff, isLoading, error } = useStaff();
  const [query, setQuery] = useState('');

  const canCreate =
    user?.role === 'DIRECTOR' || user?.role === 'SUPER_ADMIN';

  const filtered = useMemo(() => {
    if (!staff) return [];
    if (!query.trim()) return staff;
    const q = query.trim().toLowerCase();
    return staff.filter(
      (s) =>
        s.firstName.toLowerCase().includes(q) ||
        s.lastName.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q),
    );
  }, [staff, query]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight">
            {t('staff.title')}
          </h1>
          <p
            className="mt-1.5 text-sm"
            style={{ color: 'var(--kc-text-3)' }}
          >
            {t('staff.list')}
          </p>
        </div>

        {canCreate && (
          <Button asChild className="self-start">
            <Link href="/staff/new">
              <Plus className="mr-2 h-4 w-4" />
              {t('staff.create')}
            </Link>
          </Button>
        )}
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-lg border p-4"
          style={{
            background: 'var(--kc-error-bg)',
            borderColor:
              'color-mix(in oklch, var(--kc-error), transparent 70%)',
          }}
        >
          <p className="text-sm" style={{ color: 'var(--kc-error)' }}>
            {t('staff.loadError')}
            {error.message ? ` — ${error.message}` : ''}
          </p>
        </div>
      )}

      {!isLoading && staff && staff.length > 0 && (
        <div className="relative max-w-md">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none"
            style={{ color: 'var(--kc-text-3)' }}
            aria-hidden
          />
          <Input
            placeholder="Search by name or email…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9 h-10"
            aria-label="Search staff"
          />
        </div>
      )}

      {isLoading && (
        <>
          <div className="hidden md:block space-y-3">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:hidden">
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        </>
      )}

      {!isLoading && staff && staff.length === 0 && <EmptyState />}

      {!isLoading &&
        staff &&
        staff.length > 0 &&
        filtered.length === 0 && (
          <div
            className="text-center py-12"
            style={{ color: 'var(--kc-text-3)' }}
          >
            <p className="text-sm">
              No staff match{' '}
              <span className="font-mono">&quot;{query}&quot;</span>
            </p>
          </div>
        )}

      {!isLoading && filtered.length > 0 && (
        <>
          <div className="hidden md:block">
            <StaffTable staff={filtered} userRole={user?.role} />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:hidden">
            {filtered.map((s) => (
              <StaffCard key={s.id} staff={s} userRole={user?.role} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
