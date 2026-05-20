'use client';

import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTranslation } from '@/lib/i18n';
import { ApiError } from '@/lib/api/client';
import { useUpdateCpr } from '@/lib/hooks/use-staff';
import {
  updateCprSchema,
  type UpdateCprFormData,
} from '@/lib/schemas/staff';
import type { Staff } from '@/lib/types/staff';

function isoToDateInput(iso: string | null | undefined): string {
  if (!iso) return '';
  return iso.slice(0, 10);
}

interface CprCertificationFormProps {
  staff: Staff;
  onClose?: () => void;
}

export function CprCertificationForm({
  staff,
  onClose,
}: CprCertificationFormProps) {
  const { t } = useTranslation();
  const mutation = useUpdateCpr(staff.id);

  const form = useForm<UpdateCprFormData>({
    resolver: zodResolver(updateCprSchema),
    defaultValues: {
      certified: staff.cprCertified,
      certificationDate: isoToDateInput(staff.cprCertificationDate),
      expiryDate: isoToDateInput(staff.cprExpiryDate),
      provider: staff.cprCertificationProvider ?? '',
      notes: staff.cprNotes ?? '',
    },
  });

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
      <div className="flex items-center gap-2">
        <Controller
          control={form.control}
          name="certified"
          render={({ field }) => (
            <Checkbox
              id="cpr-certified"
              checked={!!field.value}
              onCheckedChange={(v) => field.onChange(v === true)}
            />
          )}
        />
        <Label
          htmlFor="cpr-certified"
          className="text-sm font-normal cursor-pointer"
        >
          {t('staff.cprCertified')}
        </Label>
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
          <Label htmlFor="cpr-expiry" className="text-sm font-medium">
            {t('staff.cprExpiryDate')}
          </Label>
          <Input
            id="cpr-expiry"
            type="date"
            className="h-10"
            {...form.register('expiryDate')}
          />
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
