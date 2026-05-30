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
import { useUpdateMyEmail } from '@/lib/hooks/use-profile';
import { useUnsavedChangesPrompt } from '@/lib/hooks/use-unsaved-changes-prompt';
import { logout as logoutApi } from '@/lib/api/auth';
import { useAuthStore } from '@/store/auth';

// Issue #6 — Change Email modal. Two-step UX:
//   1. User enters newEmail + currentPassword.
//   2. On submit, the form fires a branded ConfirmDialog warning about
//      session revoke. Only on Confirm does the backend call go out.
//   3. Backend rotates the email AND deletes every session. On 204 we
//      logout the local store + redirect to /login. The user re-enters
//      with their new credentials.
// Field-scoped error for CURRENT_PASSWORD_INVALID — the input lights up
// red instead of a generic banner.
interface ChangeEmailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentEmail: string;
}

const formSchema = z.object({
  newEmail: z
    .string()
    .trim()
    .min(1, 'Email is required')
    .email('Must be a valid email address')
    .toLowerCase(),
  currentPassword: z.string().min(1, 'Current password is required'),
});

type FormValues = z.infer<typeof formSchema>;

export function ChangeEmailModal({
  open,
  onOpenChange,
  currentEmail,
}: ChangeEmailModalProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const confirm = useConfirm();
  const mutation = useUpdateMyEmail();
  const clearTokens = useAuthStore((s) => s.clearTokens);
  const [isFormDirty, setIsFormDirty] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { newEmail: '', currentPassword: '' },
  });

  useEffect(() => {
    if (open) {
      form.reset({ newEmail: '', currentPassword: '' });
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
    // PO Israel spec: confirm dialog BEFORE the destructive call. Once
    // the backend deletes sessions, the user is logged out and any
    // mid-flight error UI would be lost — better to warn upfront.
    const ok = await confirm({
      title: t('profile.changeEmailConfirmTitle'),
      description: t('profile.changeEmailConfirmBody'),
      confirmText: t('profile.changeEmailConfirmAction'),
      cancelText: t('staff.cancel'),
      variant: 'warning',
    });
    if (!ok) return;

    mutation.mutate(
      {
        newEmail: data.newEmail,
        currentPassword: data.currentPassword,
      },
      {
        onSuccess: () => {
          toast.success(t('profile.emailChangedToast'));
          // Local cleanup mirrors backend session revoke. We still call
          // /auth/logout on the off chance the JWT is briefly accepted
          // again (rare race) — but it's fire-and-forget; the redirect
          // doesn't wait on it.
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
          if (err instanceof ApiError && err.errorCode === 'EMAIL_EXISTS') {
            form.setError('newEmail', {
              message: t('profile.emailAlreadyInUse'),
            });
            return;
          }
          const msg =
            err instanceof ApiError && err.message
              ? err.message
              : t('profile.changeEmailError');
          toast.error(msg);
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md [&>*]:min-w-0">
        <DialogHeader>
          <DialogTitle>{t('profile.changeEmailTitle')}</DialogTitle>
          <DialogDescription>
            {t('profile.changeEmailSubtitle')}
          </DialogDescription>
        </DialogHeader>

        {/* Amber warning — destructive action heads-up. Same visual
            language as the StaffForm email-edit warning (PO QA #50). */}
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
              htmlFor="changeEmail-current"
              className="text-sm font-medium"
            >
              {t('profile.currentEmail')}
            </Label>
            <Input
              id="changeEmail-current"
              type="email"
              value={currentEmail}
              disabled
              readOnly
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="changeEmail-new" className="text-sm font-medium">
              {t('profile.newEmail')}
            </Label>
            <Input
              id="changeEmail-new"
              type="email"
              autoComplete="off"
              placeholder="you@example.com"
              disabled={mutation.isPending}
              {...form.register('newEmail')}
            />
            {form.formState.errors.newEmail && (
              <p className="text-xs" style={{ color: 'var(--kc-error)' }}>
                {form.formState.errors.newEmail.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label
              htmlFor="changeEmail-currentPw"
              className="text-sm font-medium"
            >
              {t('profile.currentPassword')}
            </Label>
            <Input
              id="changeEmail-currentPw"
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
              {t('profile.changeEmail')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
