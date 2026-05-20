'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useTranslation } from '@/lib/i18n';
import { useInvitation } from '@/lib/hooks/use-staff';
import { AcceptInvitationForm } from '@/components/staff/accept-invitation-form';

function AcceptInvitationInner() {
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const token = searchParams?.get('token') ?? undefined;
  const { data, isLoading, error } = useInvitation(token);

  // Missing or invalid token → friendly error page (same shape as reset-password
  // when its token fails). Don't leak whether the token existed (per PO Q3).
  if (!token) {
    return (
      <InvalidInvitationView title={t('staff.acceptInvalidTitle')} body={t('staff.acceptInvalidBody')} />
    );
  }

  if (isLoading) {
    return (
      <div className="w-full flex items-center gap-3 py-12" style={{ color: 'var(--kc-text-3)' }}>
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-sm">{t('staff.complianceLoading')}</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <InvalidInvitationView title={t('staff.acceptInvalidTitle')} body={t('staff.acceptInvalidBody')} />
    );
  }

  return <AcceptInvitationForm token={token} invitation={data} />;
}

export default function AcceptInvitationPage() {
  // useSearchParams() requires Suspense boundary in Next 15 App Router.
  return (
    <Suspense fallback={null}>
      <AcceptInvitationInner />
    </Suspense>
  );
}

function InvalidInvitationView({ title, body }: { title: string; body: string }) {
  const { t } = useTranslation();
  return (
    <div className="w-full">
      <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight mb-2">
        {title}
      </h1>
      <p className="text-sm mb-8" style={{ color: 'var(--kc-text-3)' }}>
        {body}
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
