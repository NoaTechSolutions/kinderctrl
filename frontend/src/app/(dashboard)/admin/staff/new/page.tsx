'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { toast } from '@/lib/toast';

import { Button } from '@/components/ui/button';
import { useCreateStaff } from '@/lib/hooks/use-staff';
import { useTranslation } from '@/lib/i18n';
import { StaffForm } from '@/components/staff/staff-form';
import { ApiError } from '@/lib/api/client';
import type { StaffFormData } from '@/lib/schemas/staff';

// SUPER_ADMIN-only manual create page (PO QA #30 Opción E). Submits to
// POST /staff which creates Staff (ACTIVE) + User (password=null) + sends
// the staff a welcome email with a tokenized setup link. The admin never
// sees the password — only the staff sets it via the email link.
// Role gate comes from /admin/layout.tsx (useRequireRole SUPER_ADMIN).
export default function AdminCreateStaffPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const mutation = useCreateStaff();

  const handleSubmit = (data: StaffFormData) => {
    mutation.mutate(data, {
      onSuccess: () => {
        // PO QA #28 CAMBIO 1 carried over: drop the admin back on the
        // list view rather than the detail — most onboarding sessions
        // create multiple staff in a row.
        toast.success(t('staff.adminCreatedToast'));
        router.push('/staff');
      },
      onError: (err) => {
        // Generic error path; the form surfaces the specific message
        // through its own serverError prop.
        const msg =
          err instanceof ApiError && err.message
            ? err.message
            : t('errGeneric');
        toast.error(msg);
      },
    });
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link href="/staff">
          <ArrowLeft className="mr-1 h-4 w-4" />
          {t('staff.title')}
        </Link>
      </Button>

      {/* PO QA #32: dropped the subtitle paragraph — the title alone is
          enough; the form's section headings already explain what each
          part is for. */}
      <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight">
        {t('staff.adminCreateTitle')}
      </h1>

      <StaffForm
        mode="create"
        isSubmitting={mutation.isPending}
        serverError={mutation.error}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
