'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useCreateCenter } from '@/lib/hooks/use-centers';
import { useTranslation } from '@/lib/i18n';
import { CenterForm } from '@/components/centers/center-form';
import type { CenterFormData } from '@/lib/schemas/center';

export default function NewCenterPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const mutation = useCreateCenter();

  const handleSubmit = (data: CenterFormData) => {
    mutation.mutate(data, {
      onSuccess: (created) => {
        router.push(`/centers/${created.id}`);
      },
    });
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="space-y-2">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link href="/dashboard">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Dashboard
          </Link>
        </Button>
        <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight">
          {t('centers.create')}
        </h1>
      </div>

      <CenterForm
        mode="create"
        isSubmitting={mutation.isPending}
        serverError={mutation.error}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
