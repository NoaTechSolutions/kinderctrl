'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { Check, Eye, EyeOff, Loader2, Lock } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTranslation } from '@/lib/i18n';
import { resetPassword } from '@/lib/api/auth';
import { ApiError } from '@/lib/api/client';
import {
  resetPasswordSchema,
  type ResetPasswordFormData,
} from '@/lib/schemas/auth';

export default function ResetPasswordPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useParams<{ token: string }>();
  const token = params?.token ?? '';
  const [showPassword, setShowPassword] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const form = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { newPassword: '', confirmPassword: '' },
  });

  const mutation = useMutation({
    mutationFn: (data: ResetPasswordFormData) =>
      resetPassword(token, data.newPassword),
    onSuccess: () => {
      setSubmitted(true);
      // Auto-bounce to login after a beat so the user sees the success
      // state but doesn't get stuck on it.
      window.setTimeout(() => router.push('/login'), 2500);
    },
    onError: (error: Error) => {
      let message = t('errGeneric');
      if (error instanceof ApiError) {
        if (error.errorCode === 'RESET_TOKEN_INVALID') {
          message = t('resetTokenInvalid');
        } else if (error.status === 429) {
          message = t('errRateLimitedShort');
        } else if (error.status === 400 && Array.isArray((error.body as { message?: unknown })?.message)) {
          // DTO validation errors come back as a string[] in the body.
          message = ((error.body as { message: string[] }).message)[0];
        } else {
          message = error.message || t('errGeneric');
        }
      }
      form.setError('root', { message });
    },
  });

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
          {t('resetDoneTitle')}
        </h1>
        <p
          className="text-sm mb-8"
          style={{ color: 'var(--kc-text-3)' }}
        >
          {t('resetDoneBody')}
        </p>
        <Button asChild className="w-full h-11">
          <Link href="/login">{t('resetGoToLogin')}</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full">
      <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight mb-2">
        {t('resetTitle')}
      </h1>
      <p className="text-muted-foreground mb-8">{t('resetSubtitle')}</p>

      <form
        onSubmit={form.handleSubmit((data) => {
          form.clearErrors('root');
          mutation.mutate(data);
        })}
        className="space-y-4"
        noValidate
        aria-busy={mutation.isPending}
      >
        <div className="space-y-1.5">
          <Label htmlFor="newPassword" className="text-sm font-medium">
            {t('resetNewPassword')}
          </Label>
          <div className="relative">
            <Lock
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none"
              aria-hidden
            />
            <Input
              id="newPassword"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder={t('passwordPh')}
              className="pl-10 pr-10 h-11"
              aria-invalid={!!form.formState.errors.newPassword}
              aria-required="true"
              {...form.register('newPassword')}
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
          {form.formState.errors.newPassword && (
            <p
              role="alert"
              className="text-xs"
              style={{ color: 'var(--kc-error)' }}
            >
              {form.formState.errors.newPassword.message}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="confirmPassword" className="text-sm font-medium">
            {t('confirmPassword')}
          </Label>
          <div className="relative">
            <Lock
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none"
              aria-hidden
            />
            <Input
              id="confirmPassword"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder={t('confirmPh')}
              className="pl-10 h-11"
              aria-invalid={!!form.formState.errors.confirmPassword}
              aria-required="true"
              {...form.register('confirmPassword')}
            />
          </div>
          {form.formState.errors.confirmPassword && (
            <p
              role="alert"
              className="text-xs"
              style={{ color: 'var(--kc-error)' }}
            >
              {form.formState.errors.confirmPassword.message}
            </p>
          )}
        </div>

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
              {t('resetSubmitting')}
            </>
          ) : (
            t('resetSubmit')
          )}
        </Button>
      </form>
    </div>
  );
}
