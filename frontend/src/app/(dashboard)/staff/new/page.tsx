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

// PO QA #55 (FEATURE 3): DIRECTOR-facing manual create page. Mirrors
// /admin/staff/new which stays as the SUPER_ADMIN surface — same backend
// endpoint (POST /staff), same form, different role gate.
//
// Why a separate route instead of routing both roles to /admin/staff/new:
// the (dashboard)/admin route group guards on SUPER_ADMIN via the layout
// (useRequireRole). Wiring DIRECTOR through that layout would open every
// /admin/* page to them, which is broader than the spec asks. Two thin
// page files share the same StaffForm + useCreateStaff hook so there's
// no real duplication of logic — just routing.
//
// The form internally hides the Center select for DIRECTOR
// (`showCenterSelect = isSuperAdmin` in staff-form.tsx) and the submit
// strips `centerId` from the payload (`if (!isSuperAdmin) delete
// payload.centerId`). Backend's resolveCenterIdForUser defaults to the
// caller's own centerId when DIRECTOR doesn't supply one.
export default function CreateStaffPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const mutation = useCreateStaff();

  const handleSubmit = (data: StaffFormData) => {
    mutation.mutate(data, {
      onSuccess: () => {
        toast.success(t('staff.adminCreatedToast'));
        router.push('/staff');
      },
      onError: (err) => {
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
