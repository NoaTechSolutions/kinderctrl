'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  Baby,
  Cake,
  Edit,
  HeartPulse,
  Home,
  Mail,
  MapPin,
  Phone,
  Stethoscope,
  Users,
} from 'lucide-react';
import { CardWithHeader } from '@/components/ui/card-with-header';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useRequireRole } from '@/lib/hooks/use-require-role';
import { useAuthStore } from '@/store/auth';
import { useChild } from '@/lib/hooks/use-children';
import { ChildStatusBadge } from '@/components/children/child-status-badge';
import {
  childFullName,
  formatAge,
  parentFullName,
  relationshipLabel,
  sortedParents,
} from '@/lib/format-child';
import type { ChildParentLink } from '@/lib/types/child';

function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function joinAddress(parts: Array<string | null>): string | null {
  const a = parts.filter(Boolean).join(' ');
  return a.trim() || null;
}

export default function ChildDetailPage() {
  const { ready, allowed } = useRequireRole([
    'DIRECTOR',
    'SUPER_ADMIN',
    'PARENT',
  ]);
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const { data: child, isLoading, error } = useChild(id);
  const role = useAuthStore((s) => s.user?.role);
  const canManage = role === 'DIRECTOR' || role === 'SUPER_ADMIN';

  if (!ready || !allowed) return null;

  if (isLoading) {
    return (
      <div className="max-w-4xl space-y-6">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (error || !child) {
    return (
      <div className="max-w-4xl space-y-4">
        <BackLink />
        <div
          role="alert"
          className="rounded-lg border p-4"
          style={{
            background: 'var(--kc-error-bg)',
            borderColor: 'color-mix(in oklch, var(--kc-error), transparent 70%)',
          }}
        >
          <p className="text-sm" style={{ color: 'var(--kc-error)' }}>
            Child not found, or you don&apos;t have access to it.
          </p>
        </div>
      </div>
    );
  }

  const parents = sortedParents(child);
  const med = child.medicalInfo;
  const childAddress = joinAddress([
    child.addressNumber,
    child.addressStreet,
    child.addressCity,
    child.addressState,
    child.addressZip,
  ]);

  return (
    <div className="max-w-4xl space-y-6">
      <BackLink />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3 min-w-0">
          <div
            className="flex h-12 w-12 flex-none items-center justify-center rounded-xl"
            style={{
              background: 'color-mix(in oklch, var(--kc-p-100), transparent 30%)',
              color: 'var(--kc-p-600)',
            }}
          >
            <Baby className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight">
              {childFullName(child)}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <ChildStatusBadge status={child.enrollmentStatus} />
              <span className="text-sm" style={{ color: 'var(--kc-text-3)' }}>
                {formatAge(child.dateOfBirth)}
              </span>
            </div>
          </div>
        </div>

        {canManage && (
          <Button asChild variant="outline" className="self-start">
            <Link href={`/children/${child.id}/edit`}>
              <Edit className="mr-1.5 h-3.5 w-3.5" />
              Edit
            </Link>
          </Button>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Child info */}
        <CardWithHeader icon={Baby} title="Child Information">
          <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
            <InfoRow icon={Cake} label="Date of birth">
              {fmtDate(child.dateOfBirth)}
            </InfoRow>
            <InfoRow icon={Baby} label="Gender">
              {relationshipLabel(child.gender)}
            </InfoRow>
            <InfoRow icon={MapPin} label="Address">
              {childAddress ?? '—'}
            </InfoRow>
            <InfoRow icon={Phone} label="Phone">
              {child.phone ?? '—'}
            </InfoRow>
            <InfoRow icon={Cake} label="Admission date">
              {fmtDate(child.admissionDate)}
            </InfoRow>
            <InfoRow icon={Cake} label="First day of care">
              {fmtDate(child.firstCareDay)}
            </InfoRow>
          </dl>
        </CardWithHeader>

        {/* Medical */}
        <CardWithHeader icon={HeartPulse} title="Medical">
          {!med ? (
            <p className="text-sm" style={{ color: 'var(--kc-text-3)' }}>
              No medical info on file.
            </p>
          ) : (
            <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
              <InfoRow icon={Stethoscope} label="Doctor">
                {med.doctorName ?? '—'}
              </InfoRow>
              <InfoRow icon={Phone} label="Doctor phone">
                {med.doctorPhone ?? '—'}
              </InfoRow>
              <InfoRow icon={HeartPulse} label="Special needs">
                {med.hasSpecialNeeds ? 'Yes' : 'No'}
              </InfoRow>
              <InfoRow icon={HeartPulse} label="Medication allergies">
                {med.medicationAllergies ?? '—'}
              </InfoRow>
              <div className="sm:col-span-2">
                <InfoRow icon={HeartPulse} label="Medical plan">
                  {med.medicalPlan ?? '—'}
                </InfoRow>
              </div>
            </dl>
          )}
        </CardWithHeader>
      </div>

      {/* Parents */}
      <CardWithHeader icon={Users} title="Parents & Guardians">
        {parents.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--kc-text-3)' }}>
            No parents linked.
          </p>
        ) : (
          <div className="space-y-3">
            {parents.map((link) => (
              <ParentRow key={link.id} link={link} />
            ))}
          </div>
        )}
      </CardWithHeader>
    </div>
  );
}

function ParentRow({ link }: { link: ChildParentLink }) {
  const homeAddr = joinAddress([
    link.parent.homeAddressNumber,
    link.parent.homeAddressStreet,
    link.parent.homeAddressCity,
    link.parent.homeAddressState,
    link.parent.homeAddressZip,
  ]);
  return (
    <div
      className="rounded-lg border p-3"
      style={{ borderColor: 'var(--kc-border)' }}
    >
      {/* Name on its own line; relationship · Primary · Lives-with on a
          separate line below, with "·" separators so nothing runs together. */}
      <p className="text-sm font-medium" style={{ color: 'var(--kc-text-1)' }}>
        {parentFullName(link)}
      </p>
      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs" style={{ color: 'var(--kc-text-3)' }}>
        <span>{relationshipLabel(link.relationship)}</span>
        {link.isPrimary && (
          <>
            <span aria-hidden>·</span>
            <span
              className="rounded px-1.5 py-0.5 font-semibold"
              style={{
                background: 'color-mix(in oklch, var(--kc-p-100), transparent 30%)',
                color: 'var(--kc-p-700)',
              }}
            >
              Primary
            </span>
          </>
        )}
        {link.livesWithChild && (
          <>
            <span aria-hidden>·</span>
            <span className="inline-flex items-center gap-1">
              <Home className="h-3 w-3" /> Lives with child
            </span>
          </>
        )}
      </div>
      <div className="mt-1.5 flex flex-col gap-1 sm:flex-row sm:flex-wrap sm:gap-x-4 text-sm" style={{ color: 'var(--kc-text-2)' }}>
        <span className="inline-flex items-center gap-1.5 break-all">
          <Mail className="h-3.5 w-3.5 flex-none" style={{ color: 'var(--kc-text-3)' }} />
          {link.parent.email}
        </span>
        {link.parent.homePhone && (
          <span className="inline-flex items-center gap-1.5">
            <Phone className="h-3.5 w-3.5 flex-none" style={{ color: 'var(--kc-text-3)' }} />
            {link.parent.homePhone}
          </span>
        )}
        {homeAddr && (
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 flex-none" style={{ color: 'var(--kc-text-3)' }} />
            {homeAddr}
          </span>
        )}
      </div>
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof MapPin;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-3">
      <Icon className="h-4 w-4 mt-1 flex-none" style={{ color: 'var(--kc-text-3)' }} aria-hidden />
      <div className="min-w-0">
        <dt className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--kc-text-3)' }}>
          {label}
        </dt>
        <dd className="mt-0.5 text-sm break-words" style={{ color: 'var(--kc-text-1)' }}>
          {children}
        </dd>
      </div>
    </div>
  );
}

function BackLink() {
  return (
    <Button asChild variant="ghost" size="sm" className="-ml-2">
      <Link href="/children">
        <ArrowLeft className="mr-1 h-4 w-4" />
        Children
      </Link>
    </Button>
  );
}
