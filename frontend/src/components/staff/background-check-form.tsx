'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

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
import { useUpdateBackgroundCheck } from '@/lib/hooks/use-staff';
import {
  updateBackgroundCheckSchema,
  type UpdateBackgroundCheckFormData,
} from '@/lib/schemas/staff';
import type { BackgroundCheckStatus, Staff } from '@/lib/types/staff';

// Backend dates are full ISO strings; <input type="date"> needs YYYY-MM-DD.
// Truncate at T to convert without timezone surprises (the API returns
// midnight UTC for date-only columns).
function isoToDateInput(iso: string | null | undefined): string {
  if (!iso) return '';
  return iso.slice(0, 10);
}

interface BackgroundCheckFormProps {
  staff: Staff;
  onClose?: () => void;
}

const STATUS_KEY: Record<BackgroundCheckStatus, string> = {
  NOT_STARTED: 'staff.bgStatusNotStarted',
  PENDING: 'staff.bgStatusPending',
  APPROVED: 'staff.bgStatusApproved',
  REJECTED: 'staff.bgStatusRejected',
  EXPIRED: 'staff.bgStatusExpired',
};

export function BackgroundCheckForm({
  staff,
  onClose,
}: BackgroundCheckFormProps) {
  const { t } = useTranslation();
  const mutation = useUpdateBackgroundCheck(staff.id);

  const form = useForm<UpdateBackgroundCheckFormData>({
    resolver: zodResolver(updateBackgroundCheckSchema),
    defaultValues: {
      status: staff.backgroundCheckStatus,
      date: isoToDateInput(staff.backgroundCheckDate),
      expiryDate: isoToDateInput(staff.backgroundCheckExpiryDate),
      notes: staff.backgroundCheckNotes ?? '',
    },
  });

  const status = form.watch('status');

  const onSubmit = (data: UpdateBackgroundCheckFormData) => {
    form.clearErrors('root');
    mutation.mutate(data, {
      onSuccess: () => {
        toast.success(t('staff.bgSaved'));
        onClose?.();
      },
      onError: (err) => {
        const msg =
          err instanceof ApiError && err.message
            ? err.message
            : t('staff.bgSaveError');
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
        <Label htmlFor="bg-status" className="text-sm font-medium">
          {t('staff.bgStatus')}
        </Label>
        <Select
          value={status}
          onValueChange={(v) =>
            form.setValue('status', v as BackgroundCheckStatus, {
              shouldDirty: true,
              shouldValidate: true,
            })
          }
        >
          <SelectTrigger id="bg-status" className="h-10">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(STATUS_KEY) as BackgroundCheckStatus[]).map((s) => (
              <SelectItem key={s} value={s}>
                {t(STATUS_KEY[s])}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="bg-date" className="text-sm font-medium">
            {t('staff.bgDate')}
          </Label>
          <Input
            id="bg-date"
            type="date"
            className="h-10"
            {...form.register('date')}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="bg-expiry" className="text-sm font-medium">
            {t('staff.bgExpiryDate')}
          </Label>
          <Input
            id="bg-expiry"
            type="date"
            className="h-10"
            {...form.register('expiryDate')}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="bg-notes" className="text-sm font-medium">
          {t('staff.bgNotes')}
        </Label>
        <textarea
          id="bg-notes"
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
            t('staff.bgSave')
          )}
        </Button>
      </div>
    </form>
  );
}
