'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useCenter, useUpdateCenter } from '@/lib/hooks/use-centers';
import { ApiError } from '@/lib/api/client';
import { useTranslation } from '@/lib/i18n';
import { CenterForm } from '@/components/centers/center-form';
import type { CenterFormData } from '@/lib/schemas/center';

export default function EditCenterPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const { data: center, isLoading, error: loadError } = useCenter(id);
  const mutation = useUpdateCenter();

  const handleSubmit = (data: CenterFormData) => {
    if (!id) return;
    mutation.mutate(
      { id, data },
      {
        onSuccess: (updated) => {
          router.push(`/centers/${updated.id}`);
        },
      },
    );
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="space-y-2">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link href={id ? `/centers/${id}` : '/centers'}>
            <ArrowLeft className="mr-1 h-4 w-4" />
            {center?.name ?? t('centers.title')}
          </Link>
        </Button>
        <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight">
          {t('centers.edit')}
        </h1>
      </div>

      {isLoading && (
        <div className="space-y-4">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-56 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      )}

      {loadError && !isLoading && (
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
            {loadError instanceof ApiError && loadError.status === 404
              ? t('centers.notFound')
              : t('centers.loadError')}
          </p>
        </div>
      )}

      {!isLoading && !loadError && center && (
        <CenterForm
          mode="edit"
          initialData={center}
          isSubmitting={mutation.isPending}
          serverError={mutation.error}
          onSubmit={handleSubmit}
        />
      )}
    </div>
  );
}
