'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { Check, Mail, Lock, Eye, EyeOff, User, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PasswordStrength } from '@/components/auth/password-strength';
import { RolePills, type RoleValue } from '@/components/auth/role-pills';
import { useTranslation } from '@/lib/i18n';
import { signup } from '@/lib/api/auth';
import { ApiError } from '@/lib/api/client';
import { useAuthStore } from '@/store/auth';
import { signupSchema, type SignupFormData } from '@/lib/schemas/auth';

export default function SignupPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const setTokens = useAuthStore((s) => s.setTokens);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const form = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
      firstName: '',
      lastName: '',
      role: 'PARENT',
    },
  });

  const password = form.watch('password');

  const signupMutation = useMutation({
    mutationFn: (data: SignupFormData) =>
      signup({
        email: data.email,
        password: data.password,
        role: data.role,
        firstName: data.firstName?.trim() ? data.firstName.trim() : undefined,
        lastName: data.lastName?.trim() ? data.lastName.trim() : undefined,
      }),
    onSuccess: (data) => {
      setTokens(data.access_token, data.refresh_token, data.user);
      window.setTimeout(() => router.push('/dashboard'), 350);
    },
    onError: (error: Error) => {
      if (error instanceof ApiError && error.status === 409) {
        form.setError('email', { message: t('emailExists') });
      } else {
        form.setError('root', { message: error.message });
      }
    },
  });

  const onSubmit = (data: SignupFormData) => {
    form.clearErrors('root');
    signupMutation.mutate(data);
  };

  return (
    <div className="w-full">
      <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight mb-2">
        {t('heading')}
      </h1>
      <p className="text-muted-foreground mb-8">{t('sub')}</p>

      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-5"
        noValidate
        aria-label={t('createAccount')}
        aria-busy={signupMutation.isPending}
      >
        {/* Email */}
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
                form.formState.errors.email ? 'signup-email-error' : undefined
              }
              {...form.register('email')}
            />
          </div>
          {form.formState.errors.email && (
            <p
              id="signup-email-error"
              role="alert"
              className="text-xs"
              style={{ color: 'var(--kc-error)' }}
            >
              {form.formState.errors.email.message}
            </p>
          )}
        </div>

        {/* Password */}
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
              autoComplete="new-password"
              placeholder={t('passwordPh')}
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
          {password && <PasswordStrength password={password} />}
          {form.formState.errors.password && !password && (
            <p className="text-xs" style={{ color: 'var(--kc-error)' }}>
              {form.formState.errors.password.message}
            </p>
          )}
        </div>

        {/* Confirm Password */}
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
              type={showConfirm ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder={t('confirmPh')}
              className="pl-10 pr-10 h-11"
              aria-invalid={!!form.formState.errors.confirmPassword}
              {...form.register('confirmPassword')}
            />
            <button
              type="button"
              onClick={() => setShowConfirm((s) => !s)}
              className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center justify-center w-8 h-8 rounded text-muted-foreground hover:bg-secondary"
              aria-label={showConfirm ? t('hide') : t('show')}
            >
              {showConfirm ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>
          {form.formState.errors.confirmPassword && (
            <p
              id="confirm-password-error"
              role="alert"
              className="text-xs"
              style={{ color: 'var(--kc-error)' }}
            >
              {form.formState.errors.confirmPassword.message}
            </p>
          )}
        </div>

        {/* First / Last name */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="firstName" className="text-sm font-medium">
              {t('firstName')}
            </Label>
            <div className="relative">
              <User
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none"
                aria-hidden
              />
              <Input
                id="firstName"
                autoComplete="given-name"
                placeholder={t('firstNamePh')}
                className="pl-10 h-11"
                {...form.register('firstName')}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lastName" className="text-sm font-medium">
              {t('lastName')}
            </Label>
            <div className="relative">
              <User
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none"
                aria-hidden
              />
              <Input
                id="lastName"
                autoComplete="family-name"
                placeholder={t('lastNamePh')}
                className="pl-10 h-11"
                {...form.register('lastName')}
              />
            </div>
          </div>
        </div>

        {/* Role pills */}
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">{t('roleLabel')}</Label>
          <Controller
            control={form.control}
            name="role"
            render={({ field }) => (
              <RolePills
                value={field.value as RoleValue}
                onChange={(v) => field.onChange(v)}
              />
            )}
          />
        </div>

        {/* Terms */}
        <p className="text-[11px] leading-relaxed" style={{ color: 'var(--kc-text-3)' }}>
          By continuing you accept our{' '}
          <a
            href="#"
            className="underline-offset-2 hover:underline"
            style={{ color: 'var(--kc-p-600)' }}
          >
            {t('terms')}
          </a>{' '}
          and{' '}
          <a
            href="#"
            className="underline-offset-2 hover:underline"
            style={{ color: 'var(--kc-p-600)' }}
          >
            {t('privacy')}
          </a>
          .
        </p>

        {/* Root error */}
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

        {/* Submit */}
        <Button
          type="submit"
          className="w-full h-11"
          disabled={signupMutation.isPending || signupMutation.isSuccess}
        >
          {signupMutation.isSuccess ? (
            <>
              <Check className="mr-2 h-4 w-4 kc-success-pop" />
              {t('welcomeBack')}
            </>
          ) : signupMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t('creating')}
            </>
          ) : (
            t('createAccount')
          )}
        </Button>

        {/* Login link */}
        <p className="text-center text-sm text-muted-foreground">
          {t('hasAccount')}{' '}
          <button
            type="button"
            onClick={() => router.push('/login')}
            className="font-medium hover:underline"
            style={{ color: 'var(--kc-p-600)' }}
          >
            {t('signInLink')}
          </button>
        </p>
      </form>
    </div>
  );
}
