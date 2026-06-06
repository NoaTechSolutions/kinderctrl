'use client';

import type { ReactNode } from 'react';
import { useState } from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDebouncedValue } from '@/lib/hooks/use-debounced-value';
import { useCenterChildren } from '@/lib/hooks/use-children';
import { useTranslation } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { SearchInput } from '@/components/ui/search-input';
import { Skeleton } from '@/components/ui/skeleton';
import { ChildTable } from './child-table';
import { ChildCard } from './child-card';
import { ChildrenEmptyState } from './children-empty-state';

/**
 * A center's children roster — search + table (tablet+) / cards (mobile) +
 * "+ New Child". Shared by the standalone /children page (DIRECTOR, with the
 * "Children" heading) AND the Children tab on /centers/[id] (SUPER_ADMIN
 * parity, no heading). The create button always carries ?centerId so the
 * wizard targets THIS center (the backend re-checks access).
 */
export function CenterChildrenList({
  centerId,
  heading,
}: {
  centerId: string;
  heading?: ReactNode;
}) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const search = useDebouncedValue(query, 300).trim();
  const hasSearch = search.length > 0;

  const { data: children, isLoading, error } = useCenterChildren(centerId, {
    search: hasSearch ? search : undefined,
  });

  const showSearchBar = !isLoading && ((children?.length ?? 0) > 0 || hasSearch);

  return (
    <div className="space-y-6">
      <div
        className={cn(
          'flex flex-col gap-4 sm:flex-row sm:items-start',
          heading ? 'sm:justify-between' : 'sm:justify-end',
        )}
      >
        {heading}
        <Button asChild className="self-start">
          <Link href={`/children/new?centerId=${centerId}`}>
            <Plus className="mr-1.5 h-4 w-4" />
            {t('children.newChild')}
          </Link>
        </Button>
      </div>

      {error && (
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
            {error.message ? ` — ${error.message}` : ''}
          </p>
        </div>
      )}

      {showSearchBar && (
        <div className="max-w-md">
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder={t('children.searchPlaceholder')}
            ariaLabel={t('children.searchAria')}
          />
        </div>
      )}

      {isLoading && (
        <div className="space-y-3">
          <Skeleton className="h-12 w-full rounded-lg" />
          <Skeleton className="h-16 w-full rounded-lg" />
          <Skeleton className="h-16 w-full rounded-lg" />
          <Skeleton className="h-16 w-full rounded-lg" />
        </div>
      )}

      {!isLoading &&
        children &&
        children.length === 0 &&
        (hasSearch ? (
          <div className="py-12 text-center" style={{ color: 'var(--kc-text-3)' }}>
            <p className="text-sm">
              {t('children.noMatchPrefix')}{' '}
              <span className="font-mono">&quot;{search}&quot;</span>
            </p>
          </div>
        ) : (
          <ChildrenEmptyState canCreate />
        ))}

      {!isLoading && children && children.length > 0 && (
        <>
          <div className="hidden sm:block">
            <ChildTable children={children} />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:hidden">
            {children.map((c) => (
              <ChildCard key={c.id} child={c} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
