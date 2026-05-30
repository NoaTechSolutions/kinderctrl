'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Building2, Sparkles } from 'lucide-react';
import { toast } from '@/lib/toast';

import { Button } from '@/components/ui/button';
import { useCenters, useCreateCenter } from '@/lib/hooks/use-centers';
import { useAuthStore } from '@/store/auth';
import { useTranslation } from '@/lib/i18n';
import { CenterForm } from '@/components/centers/center-form';
import type { CenterFormData } from '@/lib/schemas/center';
import { parsePhoneDigits } from '@/lib/utils/phone';

export default function NewCenterPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const mutation = useCreateCenter();
  const user = useAuthStore((s) => s.user);
  const { data: centers } = useCenters();

  // First-time DIRECTOR with zero centers has nowhere safe to cancel to —
  // dashboard would just bounce them back via the BUG-001 redirect. We hide
  // the Cancel button + the ArrowLeft back-link, and surface a welcome
  // banner explaining the gate. Sign out is still available in the topbar.
  const isFirstTimeOnboarding =
    user?.role === 'DIRECTOR' && centers?.pagination.total === 0;

  const handleSubmit = (data: CenterFormData) => {
    // Strip phone display formatting before hitting the backend.
    const payload = { ...data, phone: parsePhoneDigits(data.phone) };
    mutation.mutate(payload, {
      onSuccess: (created) => {
        toast.success(t('centers.createdToast'));
        // SUPER_ADMIN manages multiple centers -> back to list.
        // DIRECTOR (and any other role) continues onboarding -> detail.
        if (user?.role === 'SUPER_ADMIN') {
          router.push('/centers');
        } else {
          router.push(`/centers/${created.id}`);
        }
      },
    });
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="space-y-2">
        {isFirstTimeOnboarding ? (
          <div
            className="inline-flex items-center gap-2 text-sm font-medium"
            style={{ color: 'var(--kc-text-3)' }}
          >
            <Building2 className="h-4 w-4" aria-hidden />
            <span>{t('centers.create')}</span>
          </div>
        ) : (
          <Button asChild variant="ghost" size="sm" className="-ml-2">
            <Link href="/centers">
              <ArrowLeft className="mr-1 h-4 w-4" />
              {t('centers.title')}
            </Link>
          </Button>
        )}
        <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight">
          {t('centers.create')}
        </h1>
      </div>

      {isFirstTimeOnboarding && (
        <div
          role="status"
          className="rounded-lg border p-4 flex items-start gap-3"
          style={{
            background:
              'color-mix(in oklch, var(--kc-p-100), transparent 30%)',
            borderColor:
              'color-mix(in oklch, var(--kc-p-500), transparent 70%)',
          }}
        >
          <Sparkles
            className="h-5 w-5 flex-none mt-0.5"
            style={{ color: 'var(--kc-p-600)' }}
            aria-hidden
          />
          <div className="min-w-0">
            <h3
              className="font-medium text-sm"
              style={{ color: 'var(--kc-p-700)' }}
            >
              {t('setup.welcomeTitle')}
            </h3>
            <p
              className="mt-1 text-sm"
              style={{ color: 'var(--kc-text-2)' }}
            >
              {t('setup.welcomeDescription')}
            </p>
          </div>
        </div>
      )}

      <CenterForm
        mode="create"
        isSubmitting={mutation.isPending}
        serverError={mutation.error}
        onSubmit={handleSubmit}
        hideCancel={isFirstTimeOnboarding}
      />
    </div>
  );
}
