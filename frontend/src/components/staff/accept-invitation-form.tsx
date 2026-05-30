'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Check, Eye, EyeOff, Loader2, Lock } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { NameInput } from '@/components/ui/name-input';
import { Label } from '@/components/ui/label';
import { useTranslation } from '@/lib/i18n';
import { ApiError } from '@/lib/api/client';
import { useAcceptInvitation } from '@/lib/hooks/use-staff';
import { useAuthStore } from '@/store/auth';
import {
  acceptInvitationSchema,
  type AcceptInvitationFormData,
} from '@/lib/schemas/staff';
import type { InvitationInfo } from '@/lib/types/staff';
import { formatPhoneUS, parsePhoneDigits } from '@/lib/utils/phone';

interface AcceptInvitationFormProps {
  token: string;
  invitation: InvitationInfo;
}

export function AcceptInvitationForm({
  token,
  invitation,
}: AcceptInvitationFormProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const setTokens = useAuthStore((s) => s.setTokens);
  const [showPassword, setShowPassword] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const mutation = useAcceptInvitation(token);

  const form = useForm<AcceptInvitationFormData>({
    resolver: zodResolver(acceptInvitationSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      phone: '',
      password: '',
      confirmPassword: '',
      agreedToTerms: false as unknown as true,
    },
  });

  const onSubmit = (data: AcceptInvitationFormData) => {
    form.clearErrors('root');
    // Strip phone formatting before POSTing — backend's @Matches accepts
    // digits only. Symmetric with the staff-form pattern.
    const payload: AcceptInvitationFormData = {
      ...data,
      phone: data.phone ? parsePhoneDigits(data.phone) : data.phone,
    };
    mutation.mutate(payload, {
      onSuccess: (res) => {
        // Persist tokens BEFORE navigation so the (dashboard) layout's auth
        // gate sees an authenticated state on first paint.
        setTokens(res.access_token, res.refresh_token, res.user);
        setSubmitted(true);
        // PO QA #55 (FEATURE 6): countdown UI replaces the silent 1.5s
        // wait. The redirect itself is driven by the useEffect below
        // that ticks the counter; no setTimeout here.
      },
      onError: (err) => {
        let msg: string = t('errGeneric');
        if (err instanceof ApiError) {
          if (err.status === 404) msg = t('staff.acceptInvalidBody');
          else if (err.status === 409) msg = t('staff.acceptConflict');
          else if (err.status === 400 && Array.isArray((err.body as { message?: unknown })?.message)) {
            msg = ((err.body as { message: string[] }).message)[0];
          } else if (err.message) {
            msg = err.message;
          }
        }
        form.setError('root', { message: msg });
      },
    });
  };

  // PO QA #55 (FEATURE 6): 5-second countdown after a successful
  // registration. Auto-redirects to /profile/complete when it hits 0,
  // or the user clicks "Go now" to skip the wait. The countdown
  // useEffect only runs when `submitted` is true (gated by early
  // return), so there's no risk of double-redirect from the previous
  // setTimeout pattern.
  const POST_REGISTER_REDIRECT_SECONDS = 5;
  const [countdown, setCountdown] = useState(POST_REGISTER_REDIRECT_SECONDS);
  useEffect(() => {
    if (!submitted) return;
    if (countdown <= 0) {
      router.push('/profile/complete');
      return;
    }
    const timer = window.setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [submitted, countdown, router]);

  if (submitted) {
    return (
      <div className="w-full">
        <div
          className="flex h-14 w-14 items-center justify-center rounded-full mb-4"
          style={{
            background:
              'color-mix(in oklch, var(--kc-p-100), transparent 30%)',
            color: 'var(--kc-p-600)',
          }}
        >
          <Check className="h-7 w-7" />
        </div>
        <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight mb-2">
          {t('staff.acceptSuccessTitle')}
        </h1>
        <p
          className="text-sm mb-6"
          style={{ color: 'var(--kc-text-3)' }}
        >
          {t('staff.acceptSuccessBody')}
        </p>
        {/* Countdown line. Uses the displayed counter clamped at 1 so
            the user never sees a final "0 seconds" flash before the
            navigation lands. */}
        <p
          className="text-sm mb-4"
          aria-live="polite"
          style={{ color: 'var(--kc-text-2)' }}
        >
          {t('staff.acceptCountdown').replace(
            '{seconds}',
            String(Math.max(countdown, 1)),
          )}
        </p>
        <Button
          onClick={() => {
            setCountdown(0);
            router.push('/profile/complete');
          }}
          className="h-11"
        >
          {t('staff.acceptGoNow')}
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full">
      <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight mb-2">
        {t('staff.acceptTitle')}
      </h1>
      <p className="text-muted-foreground mb-6">
        {t('staff.acceptSubtitle').replace('{center}', invitation.centerName)}
      </p>

      <div
        className="rounded-lg border p-3 mb-6 text-sm"
        style={{
          background: 'var(--kc-info-bg)',
          borderColor: 'color-mix(in oklch, var(--kc-info), transparent 70%)',
          color: 'var(--kc-info)',
        }}
      >
        <div>
          <strong>{invitation.email}</strong>
        </div>
        <div className="mt-0.5">
          {t('staff.acceptInvitedBy').replace(
            '{name}',
            invitation.directorName,
          )}
        </div>
      </div>

      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-4"
        noValidate
        aria-busy={mutation.isPending}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="invitee-first" className="text-sm font-medium">
              {t('staff.firstName')}
            </Label>
            {/* PO QA #55: NameInput auto-capitalizes on blur. */}
            <Controller
              control={form.control}
              name="firstName"
              render={({ field }) => (
                <NameInput
                  id="invitee-first"
                  autoComplete="given-name"
                  className="h-11"
                  aria-invalid={!!form.formState.errors.firstName}
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
            <Label htmlFor="invitee-last" className="text-sm font-medium">
              {t('staff.lastName')}
            </Label>
            <Controller
              control={form.control}
              name="lastName"
              render={({ field }) => (
                <NameInput
                  id="invitee-last"
                  autoComplete="family-name"
                  className="h-11"
                  aria-invalid={!!form.formState.errors.lastName}
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
          <Label htmlFor="invitee-phone" className="text-sm font-medium">
            {t('staff.phone')}
          </Label>
          <Controller
            control={form.control}
            name="phone"
            render={({ field }) => (
              <Input
                id="invitee-phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                maxLength={14}
                placeholder="(415) 555-1234"
                className="h-11"
                aria-invalid={!!form.formState.errors.phone}
                value={field.value ?? ''}
                onChange={(e) =>
                  field.onChange(formatPhoneUS(e.target.value))
                }
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

        <div className="space-y-1.5">
          <Label htmlFor="invitee-password" className="text-sm font-medium">
            {t('password')}
          </Label>
          <div className="relative">
            <Lock
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none"
              aria-hidden
            />
            <Input
              id="invitee-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              className="pl-10 pr-10 h-11"
              aria-invalid={!!form.formState.errors.password}
              {...form.register('password')}
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center justify-center w-8 h-8 rounded text-muted-foreground hover:bg-secondary"
              aria-label={showPassword ? t('hide') : t('show')}
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>
          {form.formState.errors.password && (
            <p className="text-xs" style={{ color: 'var(--kc-error)' }}>
              {form.formState.errors.password.message}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="invitee-confirm" className="text-sm font-medium">
            {t('confirmPassword')}
          </Label>
          <div className="relative">
            <Lock
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none"
              aria-hidden
            />
            <Input
              id="invitee-confirm"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              className="pl-10 h-11"
              aria-invalid={!!form.formState.errors.confirmPassword}
              {...form.register('confirmPassword')}
            />
          </div>
          {form.formState.errors.confirmPassword && (
            <p className="text-xs" style={{ color: 'var(--kc-error)' }}>
              {form.formState.errors.confirmPassword.message}
            </p>
          )}
        </div>

        <div className="flex items-start gap-2 pt-1">
          <Controller
            control={form.control}
            name="agreedToTerms"
            render={({ field }) => (
              <Checkbox
                id="invitee-terms"
                checked={field.value === true}
                onCheckedChange={(v) =>
                  field.onChange(v === true ? true : false)
                }
                className="mt-0.5"
              />
            )}
          />
          <Label
            htmlFor="invitee-terms"
            className="text-sm font-normal cursor-pointer leading-snug"
          >
            {t('staff.acceptAgreeTerms')}
          </Label>
        </div>
        {form.formState.errors.agreedToTerms && (
          <p className="text-xs" style={{ color: 'var(--kc-error)' }}>
            {form.formState.errors.agreedToTerms.message}
          </p>
        )}

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

        <Button
          type="submit"
          className="w-full h-11"
          disabled={mutation.isPending || mutation.isSuccess}
        >
          {mutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t('staff.acceptSubmitting')}
            </>
          ) : (
            t('staff.acceptSubmit')
          )}
        </Button>
      </form>
    </div>
  );
}
