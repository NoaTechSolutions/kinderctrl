'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ChevronDown, Loader2, Mail } from 'lucide-react';
import { toast } from '@/lib/toast';
import { useUnsavedChangesPrompt } from '@/lib/hooks/use-unsaved-changes-prompt';

import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NumericInput } from '@/components/ui/numeric-input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n';
import { ApiError } from '@/lib/api/client';
import { useInviteStaff } from '@/lib/hooks/use-staff';
import { useAuthStore } from '@/store/auth';
import {
  inviteStaffSchema,
  type InviteStaffFormData,
} from '@/lib/schemas/staff';
import { CenterCombobox } from './center-combobox';

// Optional success/cancel hooks so the form works both as a standalone
// page and as a dialog body. When omitted, defaults to the legacy
// router.push('/staff') behavior — keeps any caller that still embeds
// the form as a page working without changes.
//
// PO QA #29 (Opción F++): `prefillOpenDefault` controls whether the
// pre-fill section starts expanded. The compact modal (`/staff/invite`)
// keeps it collapsed; the SUPER_ADMIN full-page entry at
// `/admin/staff/new` opens it by default so all operational fields are
// visible at once. The button is still "Send Invitation" because that's
// what the backend does — the page framing is a UX hint, not a behavior
// difference.
interface StaffInvitationFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
  prefillOpenDefault?: boolean;
  // Issue #5 — bubbles the form's `isDirty` flag so the wrapping
  // SendInvitationDialog can intercept X / ESC / outside-click closes
  // and show the branded discard-changes ConfirmDialog. The dialog
  // owns the confirm flow; the form is just a dirty-state source.
  // Pass `setIsFormDirty` directly (stable reference) so the bubble
  // effect only re-fires when the dirty flag actually flips.
  onDirtyChange?: (isDirty: boolean) => void;
}

export function StaffInvitationForm({
  onSuccess,
  onCancel,
  prefillOpenDefault = false,
  onDirtyChange,
}: StaffInvitationFormProps = {}) {
  const { t } = useTranslation();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  const mutation = useInviteStaff();

  const form = useForm<InviteStaffFormData>({
    resolver: zodResolver(inviteStaffSchema),
    defaultValues: { email: '', centerId: undefined, prefill: undefined },
  });

  // Issue #5 — mirror the dirty flag up to the dialog (if any) so it
  // can prompt before closing. Also guards F5 / Cmd-R via beforeunload
  // and intercepts in-app <Link> clicks, same as StaffForm.
  const isDirty = form.formState.isDirty;
  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);
  useUnsavedChangesPrompt(
    isDirty && !mutation.isPending,
    t('staff.unsavedChangesPrompt'),
  );

  // Collapsed by default — the pre-fill section is for power users
  // batching staff onboarding with known operational data (PO QA #28
  // Opción F). The full-page SUPER_ADMIN entry passes
  // prefillOpenDefault=true to invert this (PO QA #29 Opción F++).
  const [prefillOpen, setPrefillOpen] = useState(prefillOpenDefault);

  const onSubmit = (data: InviteStaffFormData) => {
    if (isSuperAdmin && !data.centerId) {
      form.setError('centerId', { message: t('staff.inviteCenterPlaceholder') });
      return;
    }
    form.clearErrors('root');
    mutation.mutate(data, {
      onSuccess: (res) => {
        toast.success(
          t('staff.inviteSuccess').replace('{email}', res.email),
        );
        if (onSuccess) {
          form.reset();
          onSuccess();
        } else {
          router.push('/staff');
        }
      },
      onError: (err) => {
        let msg = t('staff.inviteError');
        if (err instanceof ApiError) {
          if (err.status === 409) msg = t('staff.inviteEmailExists');
          else if (err.status === 429) {
            const seconds = err.retryAfter ?? 3600;
            const minutes = Math.max(1, Math.ceil(seconds / 60));
            msg = t('staff.inviteThrottled').replace('{minutes}', String(minutes));
          } else if (err.message) {
            msg = err.message;
          }
        }
        toast.error(msg);
        form.setError('root', { message: msg });
      },
    });
  };

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      // No max-w here — the only consumer now is SendInvitationDialog
      // whose DialogContent already caps width at sm:max-w-lg. Keeping
      // max-w-lg on the form fought the dialog constraint on narrow
      // viewports and caused a horizontal overflow (PO QA #17 AJUSTE 1).
      className="space-y-5"
      noValidate
      aria-busy={mutation.isPending}
    >
      <div className="space-y-1.5">
        <Label htmlFor="invite-email" className="text-sm font-medium">
          {t('staff.email')}
        </Label>
        <div className="relative">
          <Mail
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none"
            aria-hidden
          />
          <Input
            id="invite-email"
            type="email"
            autoComplete="email"
            placeholder={t('staff.invitePlaceholderEmail')}
            className="pl-10 h-11"
            aria-invalid={!!form.formState.errors.email}
            {...form.register('email')}
          />
        </div>
        {form.formState.errors.email && (
          <p
            role="alert"
            className="text-xs"
            style={{ color: 'var(--kc-error)' }}
          >
            {form.formState.errors.email.message}
          </p>
        )}
      </div>

      {isSuperAdmin && (
        <div className="space-y-1.5">
          <Label htmlFor="invite-center" className="text-sm font-medium">
            {t('staff.inviteCenter')}
          </Label>
          <Controller
            control={form.control}
            name="centerId"
            render={({ field }) => (
              <CenterCombobox
                id="invite-center"
                value={field.value}
                onChange={(v) =>
                  form.setValue('centerId', v, {
                    shouldDirty: true,
                    shouldValidate: true,
                  })
                }
                disabled={mutation.isPending}
              />
            )}
          />
          {form.formState.errors.centerId && (
            <p
              role="alert"
              className="text-xs"
              style={{ color: 'var(--kc-error)' }}
            >
              {form.formState.errors.centerId.message}
            </p>
          )}
        </div>
      )}

      {/* PO QA #28 Opción F: optional pre-fill section. Collapsed by
          default so the modal stays compact for the typical
          invite-by-email case. */}
      <Collapsible open={prefillOpen} onOpenChange={setPrefillOpen}>
        <CollapsibleTrigger
          type="button"
          className="flex items-center gap-2 text-sm font-medium w-full hover:opacity-80"
          style={{ color: 'var(--kc-text-2)' }}
        >
          <ChevronDown
            className={cn(
              'h-4 w-4 transition-transform duration-200',
              prefillOpen && 'rotate-180',
            )}
            aria-hidden
          />
          {t('staff.invitePrefillToggle')}
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-4 pt-3">
          <p className="text-xs" style={{ color: 'var(--kc-text-3)' }}>
            {t('staff.invitePrefillHint')}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 [&>*]:min-w-0">
            <div className="space-y-1.5 min-w-0">
              <Label
                htmlFor="invite-prefill-position"
                className="text-sm font-medium"
              >
                {t('staff.position')}
              </Label>
              <Input
                id="invite-prefill-position"
                type="text"
                placeholder={t('staff.invitePrefillPositionPh')}
                {...form.register('prefill.position')}
              />
            </div>

            <div className="space-y-1.5 min-w-0">
              <Label
                htmlFor="invite-prefill-employment"
                className="text-sm font-medium"
              >
                {t('staff.employmentType')}
              </Label>
              <Controller
                control={form.control}
                name="prefill.employmentType"
                render={({ field }) => (
                  <Select
                    value={field.value ?? ''}
                    onValueChange={(v) =>
                      field.onChange(
                        v === 'full_time' || v === 'part_time'
                          ? v
                          : undefined,
                      )
                    }
                  >
                    <SelectTrigger
                      id="invite-prefill-employment"
                      className="w-full"
                    >
                      <SelectValue
                        placeholder={t('staff.invitePrefillSelectPh')}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full_time">
                        {t('staff.employmentFullTime')}
                      </SelectItem>
                      <SelectItem value="part_time">
                        {t('staff.employmentPartTime')}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="space-y-1.5 min-w-0">
              <Label
                htmlFor="invite-prefill-hireDate"
                className="text-sm font-medium"
              >
                {t('staff.hireDate')}
              </Label>
              <Input
                id="invite-prefill-hireDate"
                type="date"
                {...form.register('prefill.hireDate')}
              />
            </div>

            <div className="space-y-1.5 min-w-0">
              <Label
                htmlFor="invite-prefill-rate"
                className="text-sm font-medium"
              >
                {t('staff.hourlyRate')}
              </Label>
              {/* PO QA #50: NumericInput with decimals — same control as
                  /staff/new hourlyRate. Letters/negative blocked in real
                  time; schema preprocess converts the string to number. */}
              <Controller
                control={form.control}
                name="prefill.hourlyRate"
                render={({ field }) => (
                  <NumericInput
                    id="invite-prefill-rate"
                    allowDecimal
                    placeholder="0.00"
                    value={field.value == null ? '' : String(field.value)}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    ref={field.ref}
                    name={field.name}
                  />
                )}
              />
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {form.formState.errors.root && (
        <div
          key={form.formState.submitCount}
          role="alert"
          className="kc-shake rounded-lg border p-3"
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
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            if (onCancel) onCancel();
            else router.push('/staff');
          }}
          disabled={mutation.isPending}
        >
          {t('staff.cancel')}
        </Button>
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t('staff.inviteSending')}
            </>
          ) : (
            t('staff.inviteSend')
          )}
        </Button>
      </div>
    </form>
  );
}
