'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Building2, Plus } from 'lucide-react';
import { useRequireRole } from '@/lib/hooks/use-require-role';
import { useAuthStore } from '@/store/auth';
import { useDebouncedValue } from '@/lib/hooks/use-debounced-value';
import { useCenterChildren, useMyChildren } from '@/lib/hooks/use-children';
import { Button } from '@/components/ui/button';
import { SearchInput } from '@/components/ui/search-input';
import { Skeleton } from '@/components/ui/skeleton';
import { ChildTable } from '@/components/children/child-table';
import { ChildCard } from '@/components/children/child-card';
import { ChildrenEmptyState } from '@/components/children/children-empty-state';

// /children — role-branched (the backend enforces the real matrix; this is the
// client surface):
//   • DIRECTOR (or SA with a primary center) → their center's roster.
//   • SUPER_ADMIN without a center → prompt to pick one (children are
//     center-scoped; the per-center SA view is a follow-up tab on /centers/[id]).
//   • PARENT → their own children (read-only).
//   • STAFF → bounced by useRequireRole.
export default function ChildrenPage() {
  const { ready, allowed } = useRequireRole([
    'DIRECTOR',
    'SUPER_ADMIN',
    'PARENT',
  ]);
  const user = useAuthStore((s) => s.user);

  if (!ready || !allowed || !user) return null;

  if (user.role === 'PARENT') return <ParentChildren />;
  if (user.centerId) {
    return <CenterChildren centerId={user.centerId} />;
  }
  return <PickACenter />;
}

// ───────────────────────────────────── Director / SA-with-center roster

function CenterChildren({ centerId }: { centerId: string }) {
  const [query, setQuery] = useState('');
  const search = useDebouncedValue(query, 300).trim();
  const hasSearch = search.length > 0;

  const { data: children, isLoading, error } = useCenterChildren(centerId, {
    search: hasSearch ? search : undefined,
  });

  const showSearchBar = !isLoading && ((children?.length ?? 0) > 0 || hasSearch);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight">
          Children
        </h1>
        <Button asChild className="self-start">
          <Link href="/children/new">
            <Plus className="mr-1.5 h-4 w-4" />
            New Child
          </Link>
        </Button>
      </div>

      {error && <LoadError message={error.message} />}

      {showSearchBar && (
        <div className="max-w-md">
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="Search by name…"
            ariaLabel="Search children"
          />
        </div>
      )}

      {isLoading && <ListSkeleton />}

      {!isLoading && children && children.length === 0 && (
        hasSearch ? (
          <div className="py-12 text-center" style={{ color: 'var(--kc-text-3)' }}>
            <p className="text-sm">
              No children match <span className="font-mono">&quot;{search}&quot;</span>
            </p>
          </div>
        ) : (
          <ChildrenEmptyState canCreate />
        )
      )}

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

// ───────────────────────────────────── Parent read-only view

function ParentChildren() {
  const { data: children, isLoading, error } = useMyChildren();

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight">
        My Children
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
  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight">
        Children
      </h1>
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div
          className="flex h-20 w-20 items-center justify-center rounded-full"
          style={{ background: 'var(--kc-surface-2)' }}
        >
          <Building2 className="h-10 w-10" style={{ color: 'var(--kc-text-4)' }} />
        </div>
        <h3 className="mt-4 font-display text-lg font-semibold">Select a center</h3>
        <p className="mt-2 max-w-sm text-sm" style={{ color: 'var(--kc-text-3)' }}>
          Children are managed per center. Choose a center to view its roster.
        </p>
        <Button asChild className="mt-6">
          <Link href="/centers">Go to Centers</Link>
        </Button>
      </div>
    </div>
  );
}

// ───────────────────────────────────── shared bits

function LoadError({ message }: { message?: string }) {
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
        Could not load children{message ? ` — ${message}` : ''}
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
