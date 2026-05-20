'use client';

import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Mail } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTranslation } from '@/lib/i18n';
import { ApiError } from '@/lib/api/client';
import { useCenters } from '@/lib/hooks/use-centers';
import { useInviteStaff } from '@/lib/hooks/use-staff';
import { useAuthStore } from '@/store/auth';
import {
  inviteStaffSchema,
  type InviteStaffFormData,
} from '@/lib/schemas/staff';

export function StaffInvitationForm() {
  const { t } = useTranslation();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  // Center dropdown is only relevant for SUPER_ADMIN. DIRECTOR's centerId
  // is auto-derived server-side from their User row.
  // useCenters returns PaginatedCenters; unwrap .data.data for the array.
  const centersQuery = useCenters({});
  const centers = centersQuery.data?.data ?? [];

  const mutation = useInviteStaff();

  const form = useForm<InviteStaffFormData>({
    resolver: zodResolver(inviteStaffSchema),
    defaultValues: { email: '', centerId: undefined },
  });

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
        router.push('/staff');
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
      className="space-y-5 max-w-lg"
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
          <Select
            value={form.watch('centerId') ?? ''}
            onValueChange={(v) =>
              form.setValue('centerId', v, {
                shouldDirty: true,
                shouldValidate: true,
              })
            }
          >
            <SelectTrigger id="invite-center" className="h-11">
              <SelectValue placeholder={t('staff.inviteCenterPlaceholder')} />
            </SelectTrigger>
            <SelectContent>
              {centers.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
          onClick={() => router.push('/staff')}
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
