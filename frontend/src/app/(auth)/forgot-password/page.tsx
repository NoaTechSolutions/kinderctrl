'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { ArrowLeft, Check, Loader2, Mail } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTranslation } from '@/lib/i18n';
import { forgotPassword } from '@/lib/api/auth';
import { ApiError } from '@/lib/api/client';
import {
  forgotPasswordSchema,
  type ForgotPasswordFormData,
} from '@/lib/schemas/auth';

export default function ForgotPasswordPage() {
  const { t } = useTranslation();
  // Hold a per-submit flag for the success state instead of relying on the
  // mutation status alone, so revisiting the form (clearing errors) doesn't
  // wipe the "check your email" copy out from under the user.
  const [submitted, setSubmitted] = useState(false);
  const [rateLimitSecondsLeft, setRateLimitSecondsLeft] = useState(0);

  const form = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const mutation = useMutation({
    mutationFn: (data: ForgotPasswordFormData) => forgotPassword(data.email),
    onSuccess: () => setSubmitted(true),
    onError: (error: Error) => {
      let message = t('errGeneric');
      if (error instanceof ApiError) {
        if (error.errorCode === 'RATE_LIMITED') {
          const seconds = error.retryAfter ?? 3600;
          setRateLimitSecondsLeft(seconds);
          message = t('errRateLimited').replace(
            '{seconds}',
            String(seconds),
          );
        } else if (error.status === 429) {
          message = t('errRateLimitedShort');
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
          {t('forgotSentTitle')}
        </h1>
        <p
          className="text-sm mb-8"
          style={{ color: 'var(--kc-text-3)' }}
        >
          {t('forgotSentBody')}
        </p>
        <Button asChild variant="outline" className="w-full h-11">
          <Link href="/login">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('forgotBackToLogin')}
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full">
      <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight mb-2">
        {t('forgotTitle')}
      </h1>
      <p className="text-muted-foreground mb-8">{t('forgotSubtitle')}</p>

      <form
        onSubmit={form.handleSubmit((data) => {
          if (rateLimitSecondsLeft > 0) return;
          form.clearErrors('root');
          mutation.mutate(data);
        })}
        className="space-y-4"
        noValidate
        aria-busy={mutation.isPending}
      >
        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-sm font-medium">
            {t('email')}
          </Label>
          <div className="relative">
            <Mail
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none"
              aria-hidden
            />
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder={t('emailPh')}
              className="pl-10 h-11"
              aria-invalid={!!form.formState.errors.email}
              aria-required="true"
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
          disabled={mutation.isPending || rateLimitSecondsLeft > 0}
        >
          {mutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t('forgotSending')}
            </>
          ) : (
            t('forgotSubmit')
          )}
        </Button>

        <Button asChild variant="ghost" className="w-full h-11">
          <Link href="/login">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('forgotBackToLogin')}
          </Link>
        </Button>
      </form>
    </div>
  );
}
