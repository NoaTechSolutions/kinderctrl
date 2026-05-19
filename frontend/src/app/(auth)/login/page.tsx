'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { Check, Mail, Lock, Eye, EyeOff, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useTranslation } from '@/lib/i18n';
import { login } from '@/lib/api/auth';
import { ApiError } from '@/lib/api/client';
import { useAuthStore } from '@/store/auth';
import { loginSchema, type LoginFormData } from '@/lib/schemas/auth';

export default function LoginPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const setTokens = useAuthStore((s) => s.setTokens);
  const [showPassword, setShowPassword] = useState(false);
  // Drives the disable + "wait N seconds" UI when the server returns
  // RATE_LIMITED with a Retry-After hint. Ticks down to 0 on its own;
  // the button re-enables and the error clears when it lands.
  const [rateLimitSecondsLeft, setRateLimitSecondsLeft] = useState(0);

  useEffect(() => {
    if (rateLimitSecondsLeft <= 0) return;
    const id = window.setTimeout(
      () => setRateLimitSecondsLeft((s) => s - 1),
      1000,
    );
    return () => window.clearTimeout(id);
  }, [rateLimitSecondsLeft]);

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '', remember: false },
  });

  const loginMutation = useMutation({
    mutationFn: (data: LoginFormData) =>
      login({ email: data.email, password: data.password }),
    onSuccess: (data) => {
      setTokens(data.access_token, data.refresh_token, data.user);
      // BUG-013 (2026-05-16): DIRECTOR sin centro jumps straight to the
      // create form instead of bouncing through /centers' empty list. The
      // (dashboard) layout would eventually redirect them, but skipping
      // the intermediate flash is cleaner UX.
      // BUG-012/PENDIENTE 1 (2026-05-15): users with a populated `center`
      // land on /dashboard regardless of role — this reverses the BUG-009
      // STAFF/PARENT deep-link to /centers/{id}.
      const redirectPath = data.user.center
        ? '/dashboard'
        : data.user.role === 'DIRECTOR'
          ? '/centers/new'
          : '/centers';
      window.setTimeout(() => router.push(redirectPath), 350);
    },
    onError: (error: Error) => {
      // Branch on errorCode first (typed, stable), then fall back to status,
      // then to the raw message. Anything we can't classify goes through
      // errGeneric instead of leaking server prose to the user.
      let message = t('errGeneric');
      if (error instanceof ApiError) {
        switch (error.errorCode) {
          case 'INVALID_CREDENTIALS':
            message = t('err');
            break;
          case 'ACCOUNT_NOT_ACTIVE':
            message = t('errAccountNotActive');
            break;
          case 'RATE_LIMITED': {
            const seconds = error.retryAfter ?? 60;
            setRateLimitSecondsLeft(seconds);
            message = t('errRateLimited').replace(
              '{seconds}',
              String(seconds),
            );
            break;
          }
          case 'ACCOUNT_LOCKED': {
            // Same UX as RATE_LIMITED — the user can't do anything except
            // wait, and the countdown lets them see why. Differentiated
            // only by copy ("locked" vs "too many attempts").
            const seconds = error.retryAfter ?? 900;
            setRateLimitSecondsLeft(seconds);
            const minutes = Math.ceil(seconds / 60);
            message = t('errAccountLocked').replace(
              '{minutes}',
              String(minutes),
            );
            break;
          }
          default:
            // Untyped 401 (legacy or unexpected) → generic credentials msg.
            if (error.status === 401) message = t('err');
            else if (error.status === 429) message = t('errRateLimitedShort');
            else message = error.message || t('errGeneric');
        }
      }
      form.setError('root', { message });
    },
  });

  const onSubmit = (data: LoginFormData) => {
    if (rateLimitSecondsLeft > 0) return;
    form.clearErrors('root');
    loginMutation.mutate(data);
  };

  const isRateLimited = rateLimitSecondsLeft > 0;

  return (
    <div className="w-full">
      <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight mb-2">
        {t('welcome')}
      </h1>
      <p className="text-muted-foreground mb-8">{t('subtitle')}</p>

      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-4"
        noValidate
        aria-label={t('signIn')}
        aria-busy={loginMutation.isPending}
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
              aria-describedby={
                form.formState.errors.email ? 'email-error' : undefined
              }
              {...form.register('email')}
            />
          </div>
          {form.formState.errors.email && (
            <p
              id="email-error"
              role="alert"
              className="text-xs"
              style={{ color: 'var(--kc-error)' }}
            >
              {form.formState.errors.email.message}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password" className="text-sm font-medium">
            {t('password')}
          </Label>
          <div className="relative">
            <Lock
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none"
              aria-hidden
            />
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder={t('passwordPh')}
              className="pl-10 pr-10 h-11"
              aria-invalid={!!form.formState.errors.password}
              aria-required="true"
              aria-describedby={
                form.formState.errors.password ? 'password-error' : undefined
              }
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
            <p
              id="password-error"
              role="alert"
              className="text-xs"
              style={{ color: 'var(--kc-error)' }}
            >
              {form.formState.errors.password.message}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Controller
              control={form.control}
              name="remember"
              render={({ field }) => (
                <Checkbox
                  id="remember"
                  checked={!!field.value}
                  onCheckedChange={(v) => field.onChange(v === true)}
                />
              )}
            />
            <Label
              htmlFor="remember"
              className="text-sm font-normal cursor-pointer"
            >
              {t('remember')}
            </Label>
          </div>
          <Link
            href="/forgot-password"
            className="text-sm font-medium hover:underline"
            style={{ color: 'var(--kc-p-600)' }}
          >
            {t('forgot')}
          </Link>
        </div>

        {form.formState.errors.root && (
          <div
            key={form.formState.submitCount}
            role="alert"
            className="kc-shake rounded-lg border p-3"
            style={{
              background: 'var(--kc-error-bg)',
              borderColor: 'color-mix(in oklch, var(--kc-error), transparent 70%)',
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
          disabled={
            loginMutation.isPending ||
            loginMutation.isSuccess ||
            isRateLimited
          }
        >
          {loginMutation.isSuccess ? (
            <>
              <Check className="mr-2 h-4 w-4 kc-success-pop" />
              {t('welcomeBack')}
            </>
          ) : loginMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t('signingIn')}
            </>
          ) : isRateLimited ? (
            `${t('signIn')} (${rateLimitSecondsLeft}s)`
          ) : (
            t('signIn')
          )}
        </Button>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="px-3 bg-background text-muted-foreground uppercase tracking-wider">
              {t('or')}
            </span>
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          className="w-full h-11"
          onClick={() => router.push('/signup')}
        >
          {t('create')}
        </Button>
      </form>
    </div>
  );
}
