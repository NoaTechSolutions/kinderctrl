'use client';

import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { z } from 'zod';
import { toast, useConfirm } from '@/lib/toast';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { DateField } from '@/components/ui/date-field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NameInput } from '@/components/ui/name-input';
import { NumericInput } from '@/components/ui/numeric-input';
import { useTranslation } from '@/lib/i18n';
import { ApiError } from '@/lib/api/client';
import { useUpdateMyAuthProfile } from '@/lib/hooks/use-profile';
import { useUnsavedChangesPrompt } from '@/lib/hooks/use-unsaved-changes-prompt';
import { formatPhoneUS, parsePhoneDigits } from '@/lib/utils/phone';
import type { MyProfile } from '@/lib/api/auth';
import { ChangeEmailModal } from './change-email-modal';

// Issue #6 — Personal info editor. Same dialog-wrapped-form pattern as
// SendInvitationDialog (single confirm source at the dialog level for
// X / ESC / outside-click + Cancel). NameInput auto-capitalizes on blur
// and phone is formatted as US ((XXX) XXX-XXXX) for display; parsed
// back to digits on submit so the backend regex (\+?1?\d{10,14}) holds.
interface PersonalInfoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: MyProfile;
}

// firstName / lastName: 1-100 chars when present (empty allowed only as
// a no-op via undefined). Phone is optional, accepts 10-14 digits when
// non-empty. Empty phone explicitly clears the field server-side. v3
// adds 4 optional address fields with the same shapes as Center /
// Staff so a payload round-trips without drift.
const formSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(1, 'First name is required')
    .max(100, 'First name is too long'),
  lastName: z
    .string()
    .trim()
    .min(1, 'Last name is required')
    .max(100, 'Last name is too long'),
  phone: z
    .string()
    .trim()
    .refine(
      (v) => v === '' || /^\+?1?\d{10,14}$/.test(parsePhoneDigits(v)),
      { message: 'Phone must be a valid US phone number' },
    )
    .optional()
    .or(z.literal('')),
  street: z
    .string()
    .trim()
    .max(200, 'Street is too long')
    .optional()
    .or(z.literal('')),
  city: z
    .string()
    .trim()
    .max(100, 'City is too long')
    .optional()
    .or(z.literal('')),
  state: z
    .string()
    .trim()
    .refine((v) => v === '' || /^[A-Z]{2}$/.test(v), {
      message: 'State must be 2 uppercase letters',
    })
    .optional()
    .or(z.literal('')),
  zipCode: z
    .string()
    .trim()
    .refine((v) => v === '' || /^\d{5}(-\d{4})?$/.test(v), {
      message: 'Invalid ZIP code (e.g., 94102)',
    })
    .optional()
    .or(z.literal('')),
  // v14: STAFF-only field. The input is conditionally rendered based
  // on role; if not rendered, the form value stays "" (default) and
  // is skipped on submit. Empty string is allowed in the schema but
  // the submit handler transforms it to undefined so the backend
  // IsDateString validator doesn't reject.
  dateOfBirth: z
    .string()
    .optional()
    .or(z.literal('')),
});

type FormValues = z.infer<typeof formSchema>;

export function PersonalInfoModal({
  open,
  onOpenChange,
  profile,
}: PersonalInfoModalProps) {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const mutation = useUpdateMyAuthProfile();
  const [isFormDirty, setIsFormDirty] = useState(false);
  // Email change is a separate destructive flow (session revoke). It now
  // lives INSIDE this modal — the "Change" button opens ChangeEmailModal
  // nested over this dialog. Its router.replace('/login') on success is
  // programmatic, so useUnsavedChangesPrompt won't block the redirect.
  const [emailOpen, setEmailOpen] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: profile.firstName ?? '',
      lastName: profile.lastName ?? '',
      phone: profile.phone ? formatPhoneUS(profile.phone) : '',
      street: profile.street ?? '',
      city: profile.city ?? '',
      state: profile.state ?? '',
      zipCode: profile.zipCode ?? '',
      // v14: DOB on the wire is YYYY-MM-DD which matches HTML
      // <input type="date">'s expected value format exactly. No
      // formatting needed.
      dateOfBirth: profile.dateOfBirth ?? '',
    },
  });

  // Reset the form to fresh values every time the modal opens — covers
  // the case where the profile data changed externally between opens.
  useEffect(() => {
    if (open) {
      form.reset({
        firstName: profile.firstName ?? '',
        lastName: profile.lastName ?? '',
        phone: profile.phone ? formatPhoneUS(profile.phone) : '',
        street: profile.street ?? '',
        city: profile.city ?? '',
        state: profile.state ?? '',
        zipCode: profile.zipCode ?? '',
        dateOfBirth: profile.dateOfBirth ?? '',
      });
    }
  }, [open, profile, form]);

  const isDirty = form.formState.isDirty;
  useEffect(() => {
    setIsFormDirty(isDirty);
  }, [isDirty]);
  useUnsavedChangesPrompt(
    isDirty && !mutation.isPending,
    t('staff.unsavedChangesPrompt'),
  );

  const handleOpenChange = async (next: boolean) => {
    if (next) {
      onOpenChange(true);
      return;
    }
    if (isFormDirty) {
      const ok = await confirm({
        title: t('staff.discardChangesTitle'),
        description: t('staff.unsavedChangesPrompt'),
        confirmText: t('staff.discardChangesAction'),
        cancelText: t('staff.keepEditing'),
        variant: 'warning',
      });
      if (!ok) return;
    }
    setIsFormDirty(false);
    onOpenChange(false);
  };

  const onSubmit = (data: FormValues) => {
    const payload = {
      firstName: data.firstName.trim(),
      lastName: data.lastName.trim(),
      // Empty phone explicitly clears the column (backend interprets
      // empty string as null). Digits-only on the wire so the regex
      // accepts the value regardless of how the input rendered it.
      phone: data.phone === undefined || data.phone === ''
        ? ''
        : parsePhoneDigits(data.phone),
      // Address — empty strings clear the column (backend null). Trim
      // before send; state arrives already uppercased from the input.
      street: data.street?.trim() ?? '',
      city: data.city?.trim() ?? '',
      state: data.state?.trim() ?? '',
      zipCode: data.zipCode?.trim() ?? '',
      // v14: DOB — empty string is transformed to undefined because
      // the backend's @IsDateString validator rejects "". `undefined`
      // tells the service "no change". A real value passes through
      // as YYYY-MM-DD which the @IsDateString accepts.
      dateOfBirth: data.dateOfBirth ? data.dateOfBirth : undefined,
    };
    mutation.mutate(payload, {
      onSuccess: () => {
        toast.success(t('profile.savedToast'));
        setIsFormDirty(false);
        onOpenChange(false);
      },
      onError: (err) => {
        const msg =
          err instanceof ApiError && err.message
            ? err.message
            : t('profile.saveError');
        toast.error(msg);
      },
    });
  };

  return (
    <>
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {/* v3: bumped from max-w-md to max-w-lg to comfortably fit the
          address fields without cramping the existing name/phone rows. */}
      <DialogContent className="sm:max-w-lg [&>*]:min-w-0">
        <DialogHeader>
          <DialogTitle>{t('profile.personalInfoEditTitle')}</DialogTitle>
          <DialogDescription>
            {t('profile.personalInfoEditSubtitle')}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-4"
          noValidate
          aria-busy={mutation.isPending}
        >
          <div className="grid gap-4 sm:grid-cols-2 [&>*]:min-w-0">
            <div className="space-y-1.5">
              <Label htmlFor="profile-firstName" className="text-sm font-medium">
                {t('profile.firstName')}
              </Label>
              <Controller
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <NameInput
                    id="profile-firstName"
                    placeholder={t('profile.firstNamePlaceholder')}
                    disabled={mutation.isPending}
                    value={field.value ?? ''}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    ref={field.ref}
                    name={field.name}
                  />
                )}
              />
              {form.formState.errors.firstName && (
                <p className="text-xs" style={{ color: 'var(--kc-error)' }}>
                  {form.formState.errors.firstName.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="profile-lastName" className="text-sm font-medium">
                {t('profile.lastName')}
              </Label>
              <Controller
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <NameInput
                    id="profile-lastName"
                    placeholder={t('profile.lastNamePlaceholder')}
                    disabled={mutation.isPending}
                    value={field.value ?? ''}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    ref={field.ref}
                    name={field.name}
                  />
                )}
              />
              {form.formState.errors.lastName && (
                <p className="text-xs" style={{ color: 'var(--kc-error)' }}>
                  {form.formState.errors.lastName.message}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="profile-phone" className="text-sm font-medium">
              {t('profile.phone')}
            </Label>
            <Controller
              control={form.control}
              name="phone"
              render={({ field }) => (
                <Input
                  id="profile-phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  maxLength={14}
                  placeholder="(415) 555-1234"
                  disabled={mutation.isPending}
                  value={field.value ?? ''}
                  onChange={(e) => field.onChange(formatPhoneUS(e.target.value))}
                  onBlur={field.onBlur}
                  ref={field.ref}
                  name={field.name}
                />
              )}
            />
            {form.formState.errors.phone && (
              <p className="text-xs" style={{ color: 'var(--kc-error)' }}>
                {form.formState.errors.phone.message}
              </p>
            )}
          </div>

          {/* Email — read-only here; the destructive Change flow (session
              revoke) opens the dedicated ChangeEmailModal. Sits between the
              core identity fields and the address block, fenced by separators
              so the destructive affordance reads as its own zone. */}
          <div
            className="space-y-1.5 pt-3 border-t"
            style={{ borderColor: 'var(--kc-border)' }}
          >
            <Label htmlFor="profile-email" className="text-sm font-medium">
              {t('profile.email')}
            </Label>
            <div className="flex items-center gap-3">
              <span
                id="profile-email"
                className="min-w-0 flex-1 truncate text-sm"
                style={{ color: 'var(--kc-text-1)' }}
              >
                {profile.email}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="flex-none"
                onClick={() => setEmailOpen(true)}
                disabled={mutation.isPending}
              >
                {t('profile.change')}
              </Button>
            </div>
          </div>

          {/* Address — same layout pattern as the staff create form
              (street full width, city full width, state + zip 50/50
              inline). All optional; empty string clears the field. */}
          <div className="space-y-3 pt-2 border-t" style={{ borderColor: 'var(--kc-border)' }}>
            <p
              className="text-xs font-semibold uppercase tracking-wide pt-3"
              style={{ color: 'var(--kc-text-3)' }}
            >
              {t('profile.personalInfoEditAddressTitle')}
            </p>

            <div className="space-y-1.5">
              <Label htmlFor="profile-street" className="text-sm font-medium">
                {t('profile.street')}
              </Label>
              <Input
                id="profile-street"
                type="text"
                maxLength={200}
                placeholder={t('profile.streetPlaceholder')}
                disabled={mutation.isPending}
                {...form.register('street')}
              />
              {form.formState.errors.street && (
                <p className="text-xs" style={{ color: 'var(--kc-error)' }}>
                  {form.formState.errors.street.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="profile-city" className="text-sm font-medium">
                {t('profile.city')}
              </Label>
              <Input
                id="profile-city"
                type="text"
                maxLength={100}
                placeholder={t('profile.cityPlaceholder')}
                disabled={mutation.isPending}
                {...form.register('city')}
              />
              {form.formState.errors.city && (
                <p className="text-xs" style={{ color: 'var(--kc-error)' }}>
                  {form.formState.errors.city.message}
                </p>
              )}
            </div>

            {/* v14: STAFF-only DOB input. Lives inside the address
                block visually (matches v14's spec — DOB after the
                address fields in display) so the form reads as one
                continuous "personal details" subsection. Other roles
                don't see this. */}
            {profile.role === 'STAFF' && (
              <div className="space-y-1.5">
                <Label htmlFor="profile-dob" className="text-sm font-medium">
                  {t('profile.dateOfBirth')}
                </Label>
                <DateField
                  id="profile-dob"
                  type="date"
                  disabled={mutation.isPending}
                  {...form.register('dateOfBirth')}
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 [&>*]:min-w-0">
              <div className="space-y-1.5">
                <Label
                  htmlFor="profile-state"
                  className="text-sm font-medium"
                >
                  {t('profile.state')}
                </Label>
                <Input
                  id="profile-state"
                  type="text"
                  maxLength={2}
                  placeholder="CA"
                  disabled={mutation.isPending}
                  {...form.register('state', {
                    // Mirror staff-form: uppercase on blur via setValueAs
                    // so the regex passes regardless of how the user
                    // typed it.
                    setValueAs: (v: unknown) =>
                      typeof v === 'string' ? v.trim().toUpperCase() : v,
                  })}
                />
                {form.formState.errors.state && (
                  <p className="text-xs" style={{ color: 'var(--kc-error)' }}>
                    {form.formState.errors.state.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label
                  htmlFor="profile-zip"
                  className="text-sm font-medium"
                >
                  {t('profile.zipCode')}
                </Label>
                <Controller
                  control={form.control}
                  name="zipCode"
                  render={({ field }) => (
                    <NumericInput
                      id="profile-zip"
                      maxLength={5}
                      placeholder="94102"
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
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={mutation.isPending}
            >
              {t('staff.cancel')}
            </Button>
            <Button
              type="submit"
              disabled={mutation.isPending || !isDirty}
            >
              {mutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {mutation.isPending ? t('staff.saving') : t('profile.save')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>

      {/* Nested destructive email-change flow, triggered from the Email
          row above. Self-contained — on success it logs out + redirects. */}
      <ChangeEmailModal
        open={emailOpen}
        onOpenChange={setEmailOpen}
        currentEmail={profile.email}
      />
    </>
  );
}
