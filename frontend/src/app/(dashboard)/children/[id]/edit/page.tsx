'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { useRequireRole } from '@/lib/hooks/use-require-role';
import { useChild } from '@/lib/hooks/use-children';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ChildEditForm } from '@/components/children/child-edit-form';

export default function EditChildPage() {
  const { ready, allowed } = useRequireRole(['DIRECTOR', 'SUPER_ADMIN']);
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const { data: child, isLoading, error } = useChild(id);

  if (!ready || !allowed) return null;

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error || !child) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link href="/children">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Children
          </Link>
        </Button>
        <div
          role="alert"
          className="rounded-lg border p-4"
          style={{
            background: 'var(--kc-error-bg)',
            borderColor: 'color-mix(in oklch, var(--kc-error), transparent 70%)',
          }}
        >
          <p className="text-sm" style={{ color: 'var(--kc-error)' }}>
            Child not found, or you don&apos;t have access to it.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link href={`/children/${id}`}>
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back
        </Link>
      </Button>

      <h1 className="mx-auto max-w-2xl font-display text-3xl sm:text-4xl font-semibold tracking-tight">
        Edit Child
      </h1>

      <ChildEditForm child={child} />
    </div>
  );
}
