'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertTriangle, Loader2 } from 'lucide-react';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTranslation } from '@/lib/i18n';
import { ApiError } from '@/lib/api/client';
import { useChangeMyPassword } from '@/lib/hooks/use-profile';
import { useUnsavedChangesPrompt } from '@/lib/hooks/use-unsaved-changes-prompt';
import { logout as logoutApi } from '@/lib/api/auth';
import { useAuthStore } from '@/store/auth';

// Issue #6 — Change Password modal. Same destructive shape as
// ChangeEmailModal: amber warning + ConfirmDialog gate before the
// backend call, then session revoke + redirect to /login on success.
// Password rule mirrors RegisterDto / ResetPasswordDto exactly.
interface ChangePasswordModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Mirrors the backend ChangeMyPasswordDto regex: at least 8 chars,
// uppercase + lowercase + number/special. If the backend rule
// changes, change this AND RegisterDto AND ResetPasswordDto in lockstep.
const PASSWORD_RULE =
  /((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/;

const formSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z
      .string()
      .min(8, 'Password must be at least 8 characters long')
      .regex(PASSWORD_RULE, {
        message:
          'Password must contain uppercase, lowercase, and number/special character',
      }),
    confirmPassword: z.string().min(1, 'Please confirm your new password'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })
  .refine((data) => data.newPassword !== data.currentPassword, {
    message: 'New password must be different from current password',
    path: ['newPassword'],
  });

type FormValues = z.infer<typeof formSchema>;

export function ChangePasswordModal({
  open,
  onOpenChange,
}: ChangePasswordModalProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const confirm = useConfirm();
  const mutation = useChangeMyPassword();
  const clearTokens = useAuthStore((s) => s.clearTokens);
  const [isFormDirty, setIsFormDirty] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    }
  }, [open, form]);

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

  const onSubmit = async (data: FormValues) => {
    const ok = await confirm({
      title: t('profile.changePasswordConfirmTitle'),
      description: t('profile.changePasswordConfirmBody'),
      confirmText: t('profile.changePasswordConfirmAction'),
      cancelText: t('staff.cancel'),
      variant: 'warning',
    });
    if (!ok) return;

    mutation.mutate(
      {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      },
      {
        onSuccess: () => {
          toast.success(t('profile.passwordChangedToast'));
          void logoutApi().catch(() => {});
          clearTokens();
          router.replace('/login');
        },
        onError: (err) => {
          if (
            err instanceof ApiError &&
            err.errorCode === 'CURRENT_PASSWORD_INVALID'
          ) {
            form.setError('currentPassword', {
              message: t('profile.currentPasswordWrong'),
            });
            return;
          }
          const msg =
            err instanceof ApiError && err.message
              ? err.message
              : t('profile.changePasswordError');
          toast.error(msg);
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md [&>*]:min-w-0">
        <DialogHeader>
          <DialogTitle>{t('profile.changePasswordTitle')}</DialogTitle>
          <DialogDescription>
            {t('profile.changePasswordSubtitle')}
          </DialogDescription>
        </DialogHeader>

        <div
          role="alert"
          className="rounded-lg border p-3 flex items-start gap-2.5"
          style={{
            background:
              'color-mix(in oklch, var(--kc-warning), transparent 90%)',
            borderColor:
              'color-mix(in oklch, var(--kc-warning), transparent 60%)',
          }}
        >
          <AlertTriangle
            className="h-4 w-4 flex-none mt-0.5"
            style={{ color: 'var(--kc-warning)' }}
            aria-hidden
          />
          <p className="text-xs" style={{ color: 'var(--kc-warning)' }}>
            {t('profile.sessionsRevokedWarning')}
          </p>
        </div>

        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-4"
          noValidate
          aria-busy={mutation.isPending}
        >
          <div className="space-y-1.5">
            <Label
              htmlFor="changePw-current"
              className="text-sm font-medium"
            >
              {t('profile.currentPassword')}
            </Label>
            <Input
              id="changePw-current"
              type="password"
              autoComplete="current-password"
              disabled={mutation.isPending}
              {...form.register('currentPassword')}
            />
            {form.formState.errors.currentPassword && (
              <p className="text-xs" style={{ color: 'var(--kc-error)' }}>
                {form.formState.errors.currentPassword.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="changePw-new" className="text-sm font-medium">
              {t('profile.newPassword')}
            </Label>
            <Input
              id="changePw-new"
              type="password"
              autoComplete="new-password"
              disabled={mutation.isPending}
              {...form.register('newPassword')}
            />
            {form.formState.errors.newPassword ? (
              <p className="text-xs" style={{ color: 'var(--kc-error)' }}>
                {form.formState.errors.newPassword.message}
              </p>
            ) : (
              <p className="text-xs" style={{ color: 'var(--kc-text-3)' }}>
                {t('profile.passwordHint')}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label
              htmlFor="changePw-confirm"
              className="text-sm font-medium"
            >
              {t('profile.confirmNewPassword')}
            </Label>
            <Input
              id="changePw-confirm"
              type="password"
              autoComplete="new-password"
              disabled={mutation.isPending}
              {...form.register('confirmPassword')}
            />
            {form.formState.errors.confirmPassword && (
              <p className="text-xs" style={{ color: 'var(--kc-error)' }}>
                {form.formState.errors.confirmPassword.message}
              </p>
            )}
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
              disabled={mutation.isPending}
            >
              {mutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {t('profile.changePassword')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
