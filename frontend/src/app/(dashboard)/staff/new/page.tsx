'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { useCreateStaff } from '@/lib/hooks/use-staff';
import { useTranslation } from '@/lib/i18n';
import { StaffForm } from '@/components/staff/staff-form';
import type { StaffFormData } from '@/lib/schemas/staff';

export default function NewStaffPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const mutation = useCreateStaff();

  const handleSubmit = (data: StaffFormData) => {
    mutation.mutate(data, {
      onSuccess: (created) => {
        toast.success(t('staff.createdToast'));
        router.push(`/staff/${created.id}`);
      },
    });
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="space-y-2">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link href="/staff">
            <ArrowLeft className="mr-1 h-4 w-4" />
            {t('staff.title')}
          </Link>
        </Button>
        <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight">
          {t('staff.create')}
        </h1>
      </div>

      <StaffForm
        mode="create"
        isSubmitting={mutation.isPending}
        serverError={mutation.error}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
