'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Plus, Search } from 'lucide-react';
import { useCenters } from '@/lib/hooks/use-centers';
import { useTranslation } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { CenterCard } from '@/components/centers/center-card';
import { CenterTable } from '@/components/centers/center-table';
import { EmptyState } from '@/components/centers/empty-state';

export default function CentersPage() {
  const { t } = useTranslation();
  const { data: centers, isLoading, error } = useCenters();
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    if (!centers) return [];
    if (!query.trim()) return centers;
    const q = query.trim().toLowerCase();
    return centers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.city.toLowerCase().includes(q) ||
        c.state.toLowerCase().includes(q),
    );
  }, [centers, query]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight">
            {t('centers.title')}
          </h1>
          <p
            className="mt-1.5 text-sm"
            style={{ color: 'var(--kc-text-3)' }}
          >
            {t('centers.list')}
          </p>
        </div>

        <Button asChild className="self-start">
          <Link href="/centers/new">
            <Plus className="mr-2 h-4 w-4" />
            {t('centers.create')}
          </Link>
        </Button>
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
            {t('centers.loadError')}
            {error.message ? ` — ${error.message}` : ''}
          </p>
        </div>
      )}

      {!isLoading && centers && centers.length > 0 && (
        <div className="relative max-w-md">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none"
            style={{ color: 'var(--kc-text-3)' }}
            aria-hidden
          />
          <Input
            placeholder="Search by name, city, or state…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9 h-10"
            aria-label="Search centers"
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
          <div className="grid gap-4 sm:grid-cols-2 md:hidden">
            <Skeleton className="h-56 w-full" />
            <Skeleton className="h-56 w-full" />
          </div>
        </>
      )}

      {!isLoading && centers && centers.length === 0 && <EmptyState />}

      {!isLoading &&
        centers &&
        centers.length > 0 &&
        filtered.length === 0 && (
          <div
            className="text-center py-12"
            style={{ color: 'var(--kc-text-3)' }}
          >
            <p className="text-sm">
              No centers match{' '}
              <span className="font-mono">&quot;{query}&quot;</span>
            </p>
          </div>
        )}

      {!isLoading && filtered.length > 0 && (
        <>
          <div className="hidden md:block">
            <CenterTable centers={filtered} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2 md:hidden">
            {filtered.map((c) => (
              <CenterCard key={c.id} center={c} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
