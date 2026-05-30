'use client';

import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { toast } from '@/lib/toast';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NumericInput } from '@/components/ui/numeric-input';
import { useTranslation } from '@/lib/i18n';
import { ApiError } from '@/lib/api/client';
import { useUpdateMyProfile } from '@/lib/hooks/use-staff';
import {
  updateProfileSchema,
  type UpdateProfileFormData,
} from '@/lib/schemas/staff';
import { formatPhoneUS } from '@/lib/utils/phone';
import type { Staff } from '@/lib/types/staff';

// Shared form for /profile/complete (post-invitation onboarding) and
// /profile (day-to-day edit). All fields optional; submit sets the
// profileComplete flag server-side regardless of which fields are filled.
interface ProfileFormProps {
  initial?: Staff | null;
  // If true, render the "Skip for now" outline button alongside Save.
  // Used on /profile/complete; /profile omits it.
  showSkip?: boolean;
  onSaved?: () => void;
  onSkip?: () => void;
}

function isoToDateInput(iso: string | null | undefined): string {
  if (!iso) return '';
  return iso.slice(0, 10);
}

export function ProfileForm({
  initial,
  showSkip,
  onSaved,
  onSkip,
}: ProfileFormProps) {
  const { t } = useTranslation();
  const mutation = useUpdateMyProfile();

  const form = useForm<UpdateProfileFormData>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      dateOfBirth: isoToDateInput(initial?.dateOfBirth),
      street: initial?.street ?? '',
      city: initial?.city ?? '',
      state: initial?.state ?? '',
      zipCode: initial?.zipCode ?? '',
      emergencyContactName: initial?.emergencyContactName ?? '',
      emergencyContactPhone: initial?.emergencyContactPhone
        ? formatPhoneUS(initial.emergencyContactPhone)
        : '',
    },
  });

  const onSubmit = (data: UpdateProfileFormData) => {
    form.clearErrors('root');
    mutation.mutate(data, {
      onSuccess: () => {
        toast.success(t('staff.profileSaved'));
        onSaved?.();
      },
      onError: (err) => {
        const msg =
          err instanceof ApiError && err.message
            ? err.message
            : t('staff.profileSaveError');
        toast.error(msg);
        form.setError('root', { message: msg });
      },
    });
  };

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="space-y-5"
      noValidate
      aria-busy={mutation.isPending}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="profile-dob" className="text-sm font-medium">
            {t('staff.dateOfBirth')}
          </Label>
          <Input
            id="profile-dob"
            type="date"
            disabled={mutation.isPending}
            {...form.register('dateOfBirth')}
          />
        </div>
      </div>

      {/* Address — 4 fields matching Center's pattern (PO QA #11). */}
      <div className="space-y-1.5">
        <Label htmlFor="profile-street" className="text-sm font-medium">
          {t('centers.street')}
        </Label>
        <Input
          id="profile-street"
          type="text"
          maxLength={200}
          placeholder={t('centers.streetPlaceholder')}
          disabled={mutation.isPending}
          {...form.register('street')}
        />
        {form.formState.errors.street && (
          <p className="text-xs" style={{ color: 'var(--kc-error)' }}>
            {form.formState.errors.street.message}
          </p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-[1fr_auto_auto]">
        <div className="space-y-1.5">
          <Label htmlFor="profile-city" className="text-sm font-medium">
            {t('centers.city')}
          </Label>
          <Input
            id="profile-city"
            type="text"
            maxLength={100}
            placeholder={t('centers.cityPlaceholder')}
            disabled={mutation.isPending}
            {...form.register('city')}
          />
          {form.formState.errors.city && (
            <p className="text-xs" style={{ color: 'var(--kc-error)' }}>
              {form.formState.errors.city.message}
            </p>
          )}
        </div>
        <div className="space-y-1.5 w-20">
          <Label htmlFor="profile-state" className="text-sm font-medium">
            {t('centers.state')}
          </Label>
          <Input
            id="profile-state"
            type="text"
            maxLength={2}
            placeholder={t('centers.statePlaceholder')}
            disabled={mutation.isPending}
            {...form.register('state', {
              setValueAs: (v: string) => (v ? v.toUpperCase() : v),
            })}
          />
          {form.formState.errors.state && (
            <p className="text-xs" style={{ color: 'var(--kc-error)' }}>
              {form.formState.errors.state.message}
            </p>
          )}
        </div>
        <div className="space-y-1.5 w-32">
          <Label htmlFor="profile-zip" className="text-sm font-medium">
            {t('centers.zipCode')}
          </Label>
          <Controller
            control={form.control}
            name="zipCode"
            render={({ field }) => (
              <NumericInput
                id="profile-zip"
                maxLength={5}
                placeholder={t('centers.zipCodePlaceholder')}
                disabled={mutation.isPending}
                value={field.value ?? ''}
                onChange={field.onChange}
                onBlur={field.onBlur}
                ref={field.ref}
                name={field.name}
              />
            )}
          />
          {form.formState.errors.zipCode && (
            <p className="text-xs" style={{ color: 'var(--kc-error)' }}>
              {form.formState.errors.zipCode.message}
            </p>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label
            htmlFor="profile-emergency-name"
            className="text-sm font-medium"
          >
            {t('staff.emergencyContactName')}
          </Label>
          <Input
            id="profile-emergency-name"
            type="text"
            maxLength={100}
            placeholder={t('staff.emergencyContactNamePlaceholder')}
            disabled={mutation.isPending}
            {...form.register('emergencyContactName')}
          />
        </div>
        <div className="space-y-1.5">
          <Label
            htmlFor="profile-emergency-phone"
            className="text-sm font-medium"
          >
            {t('staff.emergencyContactPhone')}
          </Label>
          <Controller
            control={form.control}
            name="emergencyContactPhone"
            render={({ field }) => (
              <Input
                id="profile-emergency-phone"
                type="tel"
                inputMode="tel"
                placeholder="(415) 555-1234"
                disabled={mutation.isPending}
                value={field.value ?? ''}
                onChange={(e) =>
                  field.onChange(formatPhoneUS(e.target.value))
                }
                onBlur={field.onBlur}
                name={field.name}
                ref={field.ref}
              />
            )}
          />
          {form.formState.errors.emergencyContactPhone && (
            <p className="text-xs" style={{ color: 'var(--kc-error)' }}>
              {form.formState.errors.emergencyContactPhone.message}
            </p>
          )}
        </div>
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

      <div className="flex flex-wrap justify-end gap-2">
        {showSkip && (
          <Button
            type="button"
            variant="outline"
            onClick={onSkip}
            disabled={mutation.isPending}
          >
            {t('staff.profileSkip')}
          </Button>
        )}
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t('staff.profileSaving')}
            </>
          ) : (
            t('staff.profileSave')
          )}
        </Button>
      </div>
    </form>
  );
}
