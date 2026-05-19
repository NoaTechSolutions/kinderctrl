'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useStaffMember, useUpdateStaff } from '@/lib/hooks/use-staff';
import { ApiError } from '@/lib/api/client';
import { useTranslation } from '@/lib/i18n';
import { StaffForm } from '@/components/staff/staff-form';
import type { StaffFormData } from '@/lib/schemas/staff';
import type { StaffStatus } from '@/lib/types/staff';

export default function EditStaffPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const { data: staff, isLoading, error: loadError } = useStaffMember(id);
  const mutation = useUpdateStaff();

  const handleSubmit = (data: StaffFormData & { status?: StaffStatus }) => {
    if (!id) return;
    mutation.mutate(
      { id, data },
      {
        onSuccess: (updated) => {
          toast.success(t('staff.updatedToast'));
          router.push(`/staff/${updated.id}`);
        },
      },
    );
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="space-y-2">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link href={id ? `/staff/${id}` : '/staff'}>
            <ArrowLeft className="mr-1 h-4 w-4" />
            {staff
              ? `${staff.firstName} ${staff.lastName}`
              : t('staff.title')}
          </Link>
        </Button>
        <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight">
          {t('staff.edit')}
        </h1>
      </div>

      {isLoading && (
        <div className="space-y-4">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-56 w-full" />
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
              ? t('staff.notFound')
              : t('staff.loadError')}
          </p>
        </div>
      )}

      {!isLoading && !loadError && staff && (
        <StaffForm
          mode="edit"
          initialData={staff}
          isSubmitting={mutation.isPending}
          serverError={mutation.error}
          onSubmit={handleSubmit}
        />
      )}
    </div>
  );
}
