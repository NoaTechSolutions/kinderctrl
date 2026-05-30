'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { toast } from '@/lib/toast';

import { Button } from '@/components/ui/button';
import { StaffEditSkeleton } from '@/components/skeletons/staff-edit-skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  useStaffMember,
  useUpdateBackgroundCheck,
  useUpdateCpr,
  useUpdateStaff,
} from '@/lib/hooks/use-staff';
import { ApiError } from '@/lib/api/client';
import { useTranslation } from '@/lib/i18n';
import { StaffForm } from '@/components/staff/staff-form';
import type { StaffFormData } from '@/lib/schemas/staff';
import type { Staff, StaffStatus } from '@/lib/types/staff';

type FormPayload = StaffFormData & { status?: StaffStatus };

// PO QA #46: BG dirty check collapsed to the new (status, approved)
// pair. status is encoded in the form as `backgroundCheckCompleted`
// (true ↔ COMPLETED, false ↔ PENDING). `approved` only matters when
// Completed; treat changes to it as dirty only in that branch so a
// toggle-and-untoggle of Completed doesn't fire a no-op PATCH.
function bgDirty(staff: Staff, data: FormPayload): boolean {
  const currentCompleted = staff.backgroundCheckStatus === 'COMPLETED';
  const newCompleted = data.backgroundCheckCompleted === true;
  if (currentCompleted !== newCompleted) return true;
  if (newCompleted) {
    const currentApproved = staff.backgroundCheckApproved === true;
    const newApproved = data.backgroundCheckApproved === true;
    if (currentApproved !== newApproved) return true;
  }
  return false;
}

function cprDirty(staff: Staff, data: FormPayload): boolean {
  // PO QA #49: CPR dirty check now compares (status, expiry, notes,
  // provider, certificationDate) — mirror of bgDirty for the new
  // 4-state model. status is the lifecycle field; date inputs are
  // compared as date-only slices.
  if (staff.cprStatus !== data.cprStatus) return true;
  const currentExpiry = staff.cprExpiryDate?.split('T')[0] ?? '';
  if (currentExpiry !== (data.cprExpiryDate ?? '')) return true;
  const currentNotes = staff.cprNotes ?? '';
  if (currentNotes !== (data.cprNotes ?? '')) return true;
  const currentCertDate = staff.cprCertificationDate?.split('T')[0] ?? '';
  if (currentCertDate !== (data.cprCertificationDate ?? '')) return true;
  return false;
}

// PO QA #46: BG payload simplified to status + approved.
// - Completed checkbox → status='COMPLETED'
// - Otherwise          → status='PENDING'
// - approved is only sent when COMPLETED; the backend nulls it for
//   PENDING / CANCELLED anyway, so we just omit it.
function buildBgPayload(data: FormPayload): {
  status: 'COMPLETED' | 'PENDING';
  approved?: boolean;
} {
  const completed = data.backgroundCheckCompleted === true;
  if (!completed) {
    return { status: 'PENDING' };
  }
  return {
    status: 'COMPLETED',
    approved: data.backgroundCheckApproved === true,
  };
}

function buildCprPayload(
  staff: Staff,
  data: FormPayload,
): {
  status: 'PENDING' | 'ACTIVE' | 'EXPIRED' | 'CANCELLED';
  certificationDate?: string;
  expiryDate?: string;
  notes?: string;
} {
  // PO QA #49: CPR payload built from form's cprStatus picker. Aux
  // fields (certificationDate / expiryDate / notes) flow through.
  // certificationDate falls back to the existing value if the form
  // doesn't surface it as dirty (the form has the input but it's
  // optional and may be left blank when the admin only changes status).
  const status = (data.cprStatus ?? staff.cprStatus) as
    | 'PENDING'
    | 'ACTIVE'
    | 'EXPIRED'
    | 'CANCELLED';
  const certificationDate =
    data.cprCertificationDate ||
    (staff.cprCertificationDate?.split('T')[0] ?? '');
  return {
    status,
    certificationDate: certificationDate || undefined,
    expiryDate: data.cprExpiryDate || undefined,
    notes: data.cprNotes || undefined,
  };
}

// Strip compliance fields from the base PATCH /staff/:id call — those
// fields live on dedicated endpoints (/background-check + /cpr). PO QA
// #46 removed the BG date / expiry / notes from the form schema, so
// the strip set shrinks accordingly.
function stripComplianceFields(
  payload: FormPayload,
): Omit<
  FormPayload,
  | 'backgroundCheckCompleted'
  | 'backgroundCheckApproved'
  | 'cprCertified'
  | 'cprStatus'
  | 'cprCertificationDate'
  | 'cprExpiryDate'
  | 'cprNotes'
> {
  const {
    backgroundCheckCompleted: _bg,
    backgroundCheckApproved: _bgApproved,
    cprCertified: _cpr,
    cprStatus: _cprStatus,
    cprCertificationDate: _cprDate,
    cprExpiryDate: _cprExp,
    cprNotes: _cprNotes,
    ...rest
  } = payload;
  return rest;
}

export default function EditStaffPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const { data: staff, isLoading, error: loadError } = useStaffMember(id);

  // PO QA #45: 3 mutations coordinated client-side. The form submit
  // diffs the user's input against `staff` and dispatches only the
  // endpoints whose data actually changed. Promise.all so the success
  // message + redirect fire only once everything settled.
  const updateBase = useUpdateStaff();
  const updateBg = useUpdateBackgroundCheck(id ?? '');
  const updateCpr = useUpdateCpr(id ?? '');

  // Confirmation dialog state for SUPER_ADMIN-only email change. The
  // pending payload is parked here until the user confirms; declining
  // cancels the save entirely (user keeps editing). See onValid below.
  const [pendingPayload, setPendingPayload] = useState<FormPayload | null>(
    null,
  );

  const anyPending =
    updateBase.isPending || updateBg.isPending || updateCpr.isPending;
  const firstError =
    updateBase.error ?? updateBg.error ?? updateCpr.error ?? null;

  const dispatchSave = async (data: FormPayload) => {
    if (!id || !staff) return;

    const promises: Array<Promise<unknown>> = [
      updateBase.mutateAsync({ id, data: stripComplianceFields(data) }),
    ];
    if (bgDirty(staff, data)) {
      promises.push(updateBg.mutateAsync(buildBgPayload(data)));
    }
    if (cprDirty(staff, data)) {
      promises.push(updateCpr.mutateAsync(buildCprPayload(staff, data)));
    }

    try {
      await Promise.all(promises);
      const emailChanged =
        !!data.email &&
        data.email.trim().toLowerCase() !== staff.email.toLowerCase();
      toast.success(
        emailChanged
          ? t('staff.updatedAndSetupSentToast')
          : t('staff.updatedToast'),
      );
      router.push(`/staff/${id}`);
    } catch (err) {
      // Mutations surface their error via firstError → StaffForm renders
      // the message. We don't need to re-toast — the inline alert is
      // already there. Logged for debugging context.
      // eslint-disable-next-line no-console
      console.error('Staff update failed:', err);
    }
  };

  const handleSubmit = (data: FormPayload) => {
    if (!staff) return;
    const emailChanged =
      !!data.email &&
      data.email.trim().toLowerCase() !== staff.email.toLowerCase();
    if (emailChanged) {
      setPendingPayload(data);
      return;
    }
    void dispatchSave(data);
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

      {isLoading && <StaffEditSkeleton />}

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
          isSubmitting={anyPending}
          serverError={firstError}
          onSubmit={handleSubmit}
        />
      )}

      {/* PO QA #45: confirmation gate before applying an email change.
          The action is destructive (sessions revoked, password nulled,
          welcome-setup email re-issued to the new address), so we ask
          before firing the PATCH. Cancel keeps the form state intact;
          confirm dispatches the same multi-call save flow. */}
      <AlertDialog
        open={pendingPayload !== null}
        onOpenChange={(o) => {
          if (!o && !anyPending) setPendingPayload(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('staff.emailChangeConfirmTitle')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('staff.emailChangeConfirmBody').replace(
                '{email}',
                pendingPayload?.email ?? '',
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={anyPending}>
              {t('staff.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={anyPending}
              onClick={(e) => {
                e.preventDefault();
                if (!pendingPayload) return;
                const payload = pendingPayload;
                setPendingPayload(null);
                void dispatchSave(payload);
              }}
            >
              {t('staff.emailChangeConfirmButton')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
