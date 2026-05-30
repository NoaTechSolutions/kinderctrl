'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { toast } from '@/lib/toast';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTranslation } from '@/lib/i18n';
import { ApiError } from '@/lib/api/client';
import { useUpdateCpr } from '@/lib/hooks/use-staff';
import {
  updateCprSchema,
  type UpdateCprFormData,
} from '@/lib/schemas/staff';
import type { CprStatus, Staff } from '@/lib/types/staff';

// PO QA #49: dialog-form for the CPR sub-tab of the Employment-card
// modal (#44). Mirror of BackgroundCheckForm (#46) — Status dropdown
// drives the lifecycle, expiryDate is conditional on ACTIVE/EXPIRED.
// Aux fields (certificationDate, provider, notes) are kept per PO and
// stay always-visible (they're optional history columns).

function isoToDateInput(iso: string | null | undefined): string {
  if (!iso) return '';
  return iso.slice(0, 10);
}

interface CprCertificationFormProps {
  staff: Staff;
  onClose?: () => void;
}

const STATUS_KEY: Record<CprStatus, string> = {
  PENDING: 'staff.cprStatusPending',
  ACTIVE: 'staff.cprStatusActive',
  EXPIRED: 'staff.cprStatusExpired',
  CANCELLED: 'staff.cprStatusCancelled',
};

export function CprCertificationForm({
  staff,
  onClose,
}: CprCertificationFormProps) {
  const { t } = useTranslation();
  const mutation = useUpdateCpr(staff.id);

  const form = useForm<UpdateCprFormData>({
    resolver: zodResolver(updateCprSchema),
    defaultValues: {
      status: staff.cprStatus,
      certificationDate: isoToDateInput(staff.cprCertificationDate),
      expiryDate: isoToDateInput(staff.cprExpiryDate),
      provider: staff.cprCertificationProvider ?? '',
      notes: staff.cprNotes ?? '',
    },
  });

  const status = form.watch('status');
  // Expiry is required when status is ACTIVE or EXPIRED — surface a
  // hint to the user inline so they don't get the 400 server-side.
  // Display-only marker; actual enforcement happens at the backend.
  const expiryRequired = status === 'ACTIVE' || status === 'EXPIRED';

  const onSubmit = (data: UpdateCprFormData) => {
    form.clearErrors('root');
    mutation.mutate(data, {
      onSuccess: () => {
        toast.success(t('staff.cprSaved'));
        onClose?.();
      },
      onError: (err) => {
        const msg =
          err instanceof ApiError && err.message
            ? err.message
            : t('staff.cprSaveError');
        toast.error(msg);
        form.setError('root', { message: msg });
      },
    });
  };

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="space-y-4"
      noValidate
      aria-busy={mutation.isPending}
    >
      <div className="space-y-1.5">
        <Label htmlFor="cpr-status" className="text-sm font-medium">
          {t('staff.cprStatus')}
        </Label>
        <Select
          value={status}
          onValueChange={(v) =>
            form.setValue('status', v as CprStatus, {
              shouldDirty: true,
              shouldValidate: true,
            })
          }
        >
          <SelectTrigger id="cpr-status" className="h-10">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(STATUS_KEY) as CprStatus[]).map((s) => (
              <SelectItem key={s} value={s}>
                {t(STATUS_KEY[s])}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="cpr-cert-date" className="text-sm font-medium">
            {t('staff.cprCertificationDate')}
          </Label>
          <Input
            id="cpr-cert-date"
            type="date"
            className="h-10"
            {...form.register('certificationDate')}
          />
        </div>
        <div className="space-y-1.5">
          <Label
            htmlFor="cpr-expiry"
            className="text-sm font-medium inline-flex items-center gap-1"
          >
            {t('staff.cprExpiryDate')}
            {expiryRequired && (
              <span
                aria-label={t('staff.fieldRequired')}
                style={{ color: 'var(--kc-error)' }}
              >
                *
              </span>
            )}
          </Label>
          <Input
            id="cpr-expiry"
            type="date"
            className="h-10"
            {...form.register('expiryDate')}
          />
          {expiryRequired && (
            <p
              className="text-xs"
              style={{ color: 'var(--kc-text-3)' }}
            >
              {status === 'ACTIVE'
                ? t('staff.cprExpiryHintActive')
                : t('staff.cprExpiryHintExpired')}
            </p>
          )}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="cpr-provider" className="text-sm font-medium">
          {t('staff.cprProvider')}
        </Label>
        <Input
          id="cpr-provider"
          type="text"
          placeholder={t('staff.cprProviderPlaceholder')}
          className="h-10"
          maxLength={100}
          {...form.register('provider')}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="cpr-notes" className="text-sm font-medium">
          {t('staff.cprNotes')}
        </Label>
        <textarea
          id="cpr-notes"
          rows={3}
          className="w-full rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2"
          style={{
            background: 'var(--kc-surface)',
            borderColor: 'var(--kc-border)',
          }}
          {...form.register('notes')}
        />
      </div>

      {form.formState.errors.root && (
        <div
          role="alert"
          className="rounded-lg border p-3"
          style={{
            background: 'var(--kc-error-bg)',
            borderColor:
              'color-mix(in oklch, var(--kc-error), transparent 70%)',
          }}
        >
          <p className="text-sm" style={{ color: 'var(--kc-error)' }}>
            {form.formState.errors.root.message}
          </p>
        </div>
      )}

      <div className="flex justify-end gap-2">
        {onClose && (
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={mutation.isPending}
          >
            {t('staff.cancel')}
          </Button>
        )}
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t('staff.saving')}
            </>
          ) : (
            t('staff.cprSave')
          )}
        </Button>
      </div>
    </form>
  );
}
