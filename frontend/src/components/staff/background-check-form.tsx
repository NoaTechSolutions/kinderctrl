'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { toast } from '@/lib/toast';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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

// PO QA #46: dialog-form for the BG sub-tab of the Employment-card
// modal (#44). Simplified to Status + Approved (the date / expiry /
// notes / verifier columns are gone from the schema). Approved only
// renders when Status === COMPLETED, matching the spec UI rule.

interface BackgroundCheckFormProps {
  staff: Staff;
  // Optional — when provided, the modal closes on save and a Cancel
  // button renders alongside Save (PO QA #36 hybrid pattern reused for
  // the unified Employment modal).
  onClose?: () => void;
}

const STATUS_KEY: Record<BackgroundCheckStatus, string> = {
  PENDING: 'staff.bgStatusPending',
  COMPLETED: 'staff.bgStatusCompleted',
  CANCELLED: 'staff.bgStatusCancelled',
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
      approved: staff.backgroundCheckApproved === true,
    },
  });

  const status = form.watch('status');
  const approved = form.watch('approved');

  const onSubmit = (data: UpdateBackgroundCheckFormData) => {
    form.clearErrors('root');
    // Mirror the server-side rule in the request body — approved only
    // travels with COMPLETED. Backend nulls it anyway, but keeping the
    // payload coherent makes the network log easier to read.
    const payload: UpdateBackgroundCheckFormData =
      data.status === 'COMPLETED'
        ? { status: 'COMPLETED', approved: data.approved === true }
        : { status: data.status };

    mutation.mutate(payload, {
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
          onValueChange={(v) => {
            const next = v as BackgroundCheckStatus;
            form.setValue('status', next, {
              shouldDirty: true,
              shouldValidate: true,
            });
            // Clear approved if we left COMPLETED — keeps form state
            // honest with what the backend will persist.
            if (next !== 'COMPLETED') {
              form.setValue('approved', false, { shouldDirty: true });
            }
          }}
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

      {status === 'COMPLETED' && (
        <label
          htmlFor="bg-approved"
          className="flex items-start gap-3 cursor-pointer"
        >
          <Checkbox
            id="bg-approved"
            checked={approved === true}
            onCheckedChange={(v) =>
              form.setValue('approved', v === true, { shouldDirty: true })
            }
            className="mt-0.5"
          />
          <span className="space-y-0.5 leading-tight">
            <span className="block text-sm font-medium">
              {t('staff.bgApprovedLabel')}
            </span>
            <span
              className="block text-xs"
              style={{ color: 'var(--kc-text-3)' }}
            >
              {t('staff.bgApprovedHint')}
            </span>
          </span>
        </label>
      )}

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
