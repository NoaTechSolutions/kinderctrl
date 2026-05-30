'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useMediaQuery } from '@/lib/hooks/use-media-query';
import {
  AlertTriangle,
  ArrowLeft,
  Briefcase,
  Edit,
  KeyRound,
  Loader2,
  MapPin,
  PhoneCall,
  StickyNote,
  User as UserIcon,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { CardWithHeader } from '@/components/ui/card-with-header';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useSendStaffPasswordReset,
  useStaffMember,
} from '@/lib/hooks/use-staff';
import { toast } from '@/lib/toast';
import { ApiError } from '@/lib/api/client';
import { useTranslation } from '@/lib/i18n';
import { useAuthStore } from '@/store/auth';
import { StaffStatusBadge } from '@/components/staff/staff-status-badge';
import { EditStaffSectionsDialog } from '@/components/staff/edit-staff-sections-dialog';
import type { StaffFormSectionKey } from '@/components/staff/staff-form';
import {
  BackgroundCheckBadge,
  CprStatusBadge,
} from '@/components/staff/staff-compliance-status';
import { FilterTabs } from '@/components/ui/filter-tabs';
import { formatPhoneUS } from '@/lib/utils/phone';
import type { Staff } from '@/lib/types/staff';

const ROLE_LABEL_KEY: Record<Staff['role'], string> = {
  TEACHER: 'staff.roleTeacher',
  ASSISTANT: 'staff.roleAssistant',
  ADMIN: 'staff.roleAdmin',
};

const EMPLOYMENT_LABEL_KEY: Record<string, string> = {
  full_time: 'staff.employmentFullTime',
  part_time: 'staff.employmentPartTime',
};

// PO QA #36 Opción C — wiring map between a card's Edit button and the
// EditStaffSectionsDialog. Each entry pairs a section key with:
//   - sections[]: which staff-form sections to render (1 per card)
//   - titleKey:   i18n key for the dialog title
// Centralizing here keeps the page render tight (one dialog instance).
const editDialogConfig: Record<
  StaffFormSectionKey,
  { sections: ReadonlyArray<StaffFormSectionKey>; titleKey: string }
> = {
  // Personal Info modal also carries Status — per PO QA #36 bugfix,
  // status is a personal/identity field, not an employment field.
  personal: {
    sections: ['personal', 'status'],
    titleKey: 'staff.editPersonal',
  },
  address: { sections: ['address'], titleKey: 'staff.editAddress' },
  emergency: { sections: ['emergency'], titleKey: 'staff.editEmergency' },
  employment: { sections: ['employment'], titleKey: 'staff.editEmployment' },
  // 'status' alone isn't a card surface — it tags along with Personal.
  // Included in the union so the SectionKey type stays exhaustive.
  status: { sections: ['status'], titleKey: 'staff.status' },
  // Notes isn't surfaced as its own card on /staff/[id]; reuse the
  // generic edit if/when it gets one.
  notes: { sections: ['notes'], titleKey: 'staff.notes' },
};

export default function StaffDetailPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const user = useAuthStore((s) => s.user);

  const { data: staff, isLoading, error } = useStaffMember(id);

  // PO QA #54: a DIRECTOR who lands on the detail page of a staff from
  // another center hits the backend's assertCanAccess → 403. Show a
  // toast + redirect back to /staff rather than render the raw error.
  // SUPER_ADMIN never hits this branch (they can read any staff), so
  // the redirect is a no-op for them. 404 (genuinely missing staff)
  // and any other error code still render the in-page error message.
  const isForbidden = error instanceof ApiError && error.status === 403;
  useEffect(() => {
    if (!isForbidden) return;
    toast.error(t('staff.accessDeniedToast'));
    router.replace('/staff');
  }, [isForbidden, router, t]);

  const canManage =
    user?.role === 'DIRECTOR' || user?.role === 'SUPER_ADMIN';

  // PO QA #28 Opción F: admin-triggered password reset.
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const resetMutation = useSendStaffPasswordReset();
  // PO QA #36 Opción C: which card section is currently being edited.
  // Null = no edit modal open. Single state for all 4 section dialogs
  // (Personal / Address / Emergency / Employment).
  const [editSection, setEditSection] = useState<StaffFormSectionKey | null>(
    null,
  );
  // PO QA #44: when the Employment dialog opens, which of the 3 tabs is
  // active. Header [✏️] → 'employment', inline [✏️] next to BG status →
  // 'bg', inline [✏️] next to CPR status → 'cpr'. Resets to 'employment'
  // each time the dialog closes so the next opener sees a clean default.
  const [employmentInitialTab, setEmploymentInitialTab] = useState<
    'employment' | 'bg' | 'cpr'
  >('employment');

  const openEmploymentEdit = (tab: 'employment' | 'bg' | 'cpr') => {
    setEmploymentInitialTab(tab);
    setEditSection('employment');
  };

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-4xl">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error) {
    // PO QA #54: 403 = staff from another center for a DIRECTOR. The
    // useEffect above is already redirecting; render nothing on this
    // frame to avoid a flash of the generic loadError message before
    // the route change lands.
    if (isForbidden) return null;
    const isNotFound = error instanceof ApiError && error.status === 404;
    return (
      <div className="space-y-4 max-w-4xl">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link href="/staff">
            <ArrowLeft className="mr-1 h-4 w-4" />
            {t('staff.title')}
          </Link>
        </Button>
        <div
          role="alert"
          className="rounded-lg border p-4"
          style={{
            background: 'var(--kc-error-bg)',
            borderColor:
              'color-mix(in oklch, var(--kc-error), transparent 70%)',
          }}
        >
          <p className="text-sm" style={{ color: 'var(--kc-error)' }}>
            {isNotFound ? t('staff.notFound') : t('staff.loadError')}
          </p>
        </div>
      </div>
    );
  }

  if (!staff) return null;

  const fullName = `${staff.firstName} ${staff.lastName}`;
  const employmentKey = EMPLOYMENT_LABEL_KEY[staff.employmentType];
  const isTerminated = staff.status === 'TERMINATED';

  return (
    <div className="space-y-6 max-w-4xl">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link href="/staff">
          <ArrowLeft className="mr-1 h-4 w-4" />
          {t('staff.title')}
        </Link>
      </Button>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div
            className="flex h-12 w-12 flex-none items-center justify-center rounded-xl"
            style={{
              background:
                'color-mix(in oklch, var(--kc-p-100), transparent 30%)',
              color: 'var(--kc-p-600)',
            }}
          >
            <UserIcon className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <h1
              className="font-display text-3xl sm:text-4xl font-semibold tracking-tight line-clamp-1 md:line-clamp-2"
              title={fullName}
            >
              {fullName}
            </h1>
            <div className="mt-2 flex items-center gap-2 flex-wrap">
              <StaffStatusBadge status={staff.status} />
              <span
                className="text-sm"
                style={{ color: 'var(--kc-text-3)' }}
              >
                {t(ROLE_LABEL_KEY[staff.role])}
              </span>
              {staff.centerName && (
                <span
                  className="text-xs"
                  style={{ color: 'var(--kc-text-3)' }}
                >
                  · {staff.centerName}
                </span>
              )}
            </div>
          </div>
        </div>

        {canManage && (
          <div className="flex gap-2 flex-none flex-wrap">
            <Button asChild variant="outline" disabled={isTerminated}>
              <Link
                href={isTerminated ? '#' : `/staff/${staff.id}/edit`}
                aria-disabled={isTerminated}
                tabIndex={isTerminated ? -1 : 0}
                onClick={(e) => {
                  if (isTerminated) e.preventDefault();
                }}
              >
                <Edit className="mr-2 h-4 w-4" />
                {t('staff.edit')}
              </Link>
            </Button>
            {/* PO QA #28 Opción F: send password reset email. The button
                is disabled when there's no linked User (staff hasn't
                accepted their invitation yet) — the backend would 400
                with the same message but we save the roundtrip. */}
            <Button
              variant="outline"
              disabled={isTerminated || !staff.email || resetMutation.isPending}
              onClick={() => setResetConfirmOpen(true)}
            >
              {resetMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <KeyRound className="mr-2 h-4 w-4" />
              )}
              {t('staff.sendResetButton')}
            </Button>
          </div>
        )}
      </div>

      {/* PO QA #26: split into 5 dedicated sections. Each section is a
          card with a `<dl>` of label/value rows. 2-col grid on md+; the
          Compliance card spans both columns. Optional sections (Address,
          Emergency Contact) render an empty-state when their fields are
          null instead of just hiding — visibility-by-omission is too
          easy to miss when QA-ing a profile.
          PO QA #62 PART 1: `[&>*]:min-w-0` on the grid prevents grid
          items from inheriting CSS Grid's default min-width:auto
          (=min-content), which was letting long emails / centerNames
          push cards past the viewport on small phones (320×568,
          375×812). Same root-cause pattern as QA #18 / #21 / #33. */}
      <div className="grid gap-6 md:grid-cols-2 [&>*]:min-w-0">
        <CardWithHeader
          icon={UserIcon}
          title={t('staff.detailPersonal')}
          action={
            canManage && !isTerminated ? (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setEditSection('personal')}
                aria-label={t('staff.editPersonal')}
              >
                <Edit className="h-3.5 w-3.5" />
              </Button>
            ) : undefined
          }
        >
          <dl className="space-y-3">
            <DetailRow label={t('staff.detailFullName')}>
              {fullName}
            </DetailRow>
            <DetailRow label={t('staff.email')}>
              <span className="break-all">{staff.email}</span>
            </DetailRow>
            <DetailRow label={t('staff.phone')}>
              {staff.phone ? (
                <span className="font-mono">
                  {formatPhoneUS(staff.phone)}
                </span>
              ) : (
                '—'
              )}
            </DetailRow>
            <DetailRow label={t('staff.dateOfBirth')}>
              {staff.dateOfBirth
                ? new Date(staff.dateOfBirth).toLocaleDateString()
                : '—'}
            </DetailRow>
            <DetailRow label={t('staff.status')}>
              <StaffStatusBadge status={staff.status} />
            </DetailRow>
          </dl>
        </CardWithHeader>

        <CardWithHeader
          icon={MapPin}
          title={t('staff.detailAddress')}
          action={
            canManage && !isTerminated ? (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setEditSection('address')}
                aria-label={t('staff.editAddress')}
              >
                <Edit className="h-3.5 w-3.5" />
              </Button>
            ) : undefined
          }
        >
          {staff.street || staff.city || staff.state || staff.zipCode ? (
            <dl className="space-y-3">
              <DetailRow label={t('staff.detailStreet')}>
                {staff.street ?? '—'}
              </DetailRow>
              <DetailRow label={t('staff.detailCity')}>
                {staff.city ?? '—'}
              </DetailRow>
              <DetailRow label={t('staff.detailState')}>
                {staff.state ?? '—'}
              </DetailRow>
              <DetailRow label={t('staff.detailZip')}>
                {staff.zipCode ?? '—'}
              </DetailRow>
            </dl>
          ) : (
            <EmptyMessage>{t('staff.detailNoAddress')}</EmptyMessage>
          )}
        </CardWithHeader>

        <CardWithHeader
          icon={PhoneCall}
          title={t('staff.detailEmergency')}
          action={
            canManage && !isTerminated ? (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setEditSection('emergency')}
                aria-label={t('staff.editEmergency')}
              >
                <Edit className="h-3.5 w-3.5" />
              </Button>
            ) : undefined
          }
        >
          {/* PO QA #39: tabs on the view (display) card to mirror the
              edit modal's tab layout. */}
          <EmergencyContactsDisplay staff={staff} t={t} />
        </CardWithHeader>

        <CardWithHeader
          icon={Briefcase}
          title={t('staff.detailEmployment')}
          action={
            canManage && !isTerminated ? (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => openEmploymentEdit('employment')}
                aria-label={t('staff.editEmployment')}
              >
                <Edit className="h-3.5 w-3.5" />
              </Button>
            ) : undefined
          }
        >
          {/* PO QA #44: 3 tabs — Employment / Background Check / CPR. */}
          <EmploymentDetailTabs
            staff={staff}
            canManage={canManage}
            isTerminated={isTerminated}
            onEditBg={() => openEmploymentEdit('bg')}
            onEditCpr={() => openEmploymentEdit('cpr')}
            employmentKey={employmentKey}
            t={t}
          />
        </CardWithHeader>

        {staff.notes && (
          <CardWithHeader icon={StickyNote} title={t('staff.notes')} className="md:col-span-2">
            <p className="text-sm whitespace-pre-wrap">{staff.notes}</p>
          </CardWithHeader>
        )}
      </div>

      {/* PO QA #36 Opción C + #44: single dialog instance for all 4
          card sections. For Personal/Address/Emergency it renders a
          plain StaffForm. For Employment it renders 3 tabs (Employment
          / Background / CPR) opened on `employmentInitialTab`. The BG
          and CPR forms live INSIDE this dialog now — no separate
          compliance dialogs. */}
      {editSection && (
        <EditStaffSectionsDialog
          open={true}
          onOpenChange={(o) => {
            if (!o) {
              setEditSection(null);
              setEmploymentInitialTab('employment');
            }
          }}
          staff={staff}
          sections={editDialogConfig[editSection].sections}
          title={t(editDialogConfig[editSection].titleKey)}
          initialTab={
            editSection === 'employment' ? employmentInitialTab : undefined
          }
        />
      )}

      {/* PO QA #28 Opción F: confirm before triggering the admin-side
          password reset. The actor never sees the new password — the
          staff receives the standard reset email. */}
      <AlertDialog
        open={resetConfirmOpen}
        onOpenChange={(o) => {
          if (!resetMutation.isPending) setResetConfirmOpen(o);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('staff.sendResetConfirmTitle')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('staff.sendResetConfirmBody').replace(
                '{email}',
                staff.email,
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={resetMutation.isPending}>
              {t('staff.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={resetMutation.isPending}
              onClick={(e) => {
                e.preventDefault();
                resetMutation.mutate(staff.id, {
                  onSuccess: (res) => {
                    toast.success(
                      t('staff.sendResetSuccess').replace(
                        '{email}',
                        res.email,
                      ),
                    );
                    setResetConfirmOpen(false);
                  },
                  onError: (err) => {
                    const msg =
                      err instanceof ApiError && err.message
                        ? err.message
                        : t('staff.sendResetError');
                    toast.error(msg);
                  },
                });
              }}
            >
              {resetMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {t('staff.sendResetButton')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Label-on-left, value-on-right row used by every detail section card.
// Definition-list semantics (<dt>/<dd>) preserved for screen readers.
function DetailRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex justify-between items-start gap-3 text-sm min-w-0">
      <dt
        className="flex-none"
        style={{ color: 'var(--kc-text-3)' }}
      >
        {label}
      </dt>
      <dd className="font-medium text-right min-w-0 break-words">
        {children}
      </dd>
    </div>
  );
}

// Empty state for optional sections (Address, Emergency Contact). Visible
// "missing" is better than hiding the card outright — a reviewer scanning
// a profile can't tell whether "no address" means absent or just hidden.
function EmptyMessage({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex items-center gap-2 text-sm"
      style={{ color: 'var(--kc-text-3)' }}
    >
      <AlertTriangle
        className="h-4 w-4 flex-none"
        style={{ color: 'var(--kc-warning, var(--kc-text-3))' }}
        aria-hidden
      />
      <span>{children}</span>
    </div>
  );
}

// Relationship comes from the API as lowercase ('father', 'mother', …);
// the i18n keys are PascalCase (`staff.relFather`). One-line helper to
// bridge the two so the DetailRow render stays compact (PO QA #31).
function capitalizeRel(rel: string): string {
  return rel.charAt(0).toUpperCase() + rel.slice(1).toLowerCase();
}

// PO QA #39: Emergency Contacts display in tabs (Primary / Secondary)
// to mirror the edit modal's tab layout from QA #38. When neither
// contact is set, the EmptyMessage handles it before this component
// renders. When only one is set, both tabs show but the empty one
// renders an inline empty hint.
function EmergencyContactsDisplay({
  staff,
  t,
}: {
  staff: Staff;
  t: (key: string) => string;
}) {
  const hasPrimary = !!(
    staff.emergencyContactName || staff.emergencyContactPhone
  );
  const hasSecondary = !!(
    staff.emergencyContact2Name || staff.emergencyContact2Phone
  );

  // Neither set — show the unified empty state.
  if (!hasPrimary && !hasSecondary) {
    return <EmptyMessage>{t('staff.detailNoEmergency')}</EmptyMessage>;
  }

  // At least one is set — render the tabs and start on whichever has
  // data (so a single-Secondary staff doesn't open on an empty Primary).
  return (
    <EmergencyContactsTabs
      staff={staff}
      t={t}
      defaultTab={hasPrimary ? 'primary' : 'secondary'}
    />
  );
}

// PO QA #44 + #62 PART 2: three card-level tabs on desktop (Employment,
// Background Check, CPR). On mobile (≤640px) the tab strip overflowed
// the viewport, so we render the same three sections stacked as separate
// blocks with section headings — same content, no tab navigation. The
// breakpoint matches Tailwind's `sm:` (640px), where the staff detail
// card itself starts having room for a row of tabs.
//
// Tab Employment is pure read-only (header [✏️] is the only affordance
// for editing employment fields). BG and CPR show their rows with an
// inline [✏️] next to the status that opens the unified 3-tab modal
// pre-focused on the matching tab.
function EmploymentDetailTabs({
  staff,
  canManage,
  isTerminated,
  onEditBg,
  onEditCpr,
  employmentKey,
  t,
}: {
  staff: Staff;
  canManage: boolean;
  isTerminated: boolean;
  onEditBg: () => void;
  onEditCpr: () => void;
  employmentKey: string | undefined;
  t: (key: string) => string;
}) {
  const isMobile = useMediaQuery('(max-width: 640px)');
  const [activeTab, setActiveTab] = useState<'employment' | 'bg' | 'cpr'>(
    'employment',
  );
  // PO QA #46/#49: BG and CPR both stored as explicit lifecycle status.
  // The card surfaces the badge plus conditional aux rows only when the
  // status implies the aux data is meaningful (ACTIVE / EXPIRED show
  // dates; PENDING / CANCELLED don't).
  const cprHasRecord =
    staff.cprStatus === 'ACTIVE' || staff.cprStatus === 'EXPIRED';
  const showEditAction = canManage && !isTerminated;

  const formatDate = (iso: string | null) =>
    iso ? new Date(iso).toLocaleDateString() : '—';

  // Section bodies extracted as plain JSX values so the desktop tab
  // branch and the mobile stacked branch can share them verbatim. No
  // sub-components — they would just add ceremony without adding any
  // reuse outside this function.
  const employmentBody = (
    <dl className="space-y-3">
      <DetailRow label={t('staff.center')}>
        {staff.centerName ?? '—'}
      </DetailRow>
      <DetailRow label={t('staff.role')}>
        {t(ROLE_LABEL_KEY[staff.role])}
      </DetailRow>
      <DetailRow label={t('staff.employmentType')}>
        {employmentKey ? t(employmentKey) : staff.employmentType}
      </DetailRow>
      <DetailRow label={t('staff.hireDate')}>
        {new Date(staff.hireDate).toLocaleDateString()}
      </DetailRow>
      <DetailRow label={t('staff.hourlyRate')}>
        {staff.hourlyRate != null
          ? `$${staff.hourlyRate.toFixed(2)}/hr`
          : '—'}
      </DetailRow>
    </dl>
  );

  const bgBody = (
    <dl className="space-y-3">
      <DetailRow label={t('staff.bgStatus')}>
        <span className="inline-flex items-center gap-2">
          <BackgroundCheckBadge
            status={staff.backgroundCheckStatus}
            approved={staff.backgroundCheckApproved}
            variant="full"
          />
          {showEditAction && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onEditBg}
              aria-label={t('staff.bgEditTitle')}
            >
              <Edit className="h-3.5 w-3.5" />
            </Button>
          )}
        </span>
      </DetailRow>
    </dl>
  );

  const cprBody = (
    <dl className="space-y-3">
      <DetailRow label={t('staff.status')}>
        <span className="inline-flex items-center gap-2">
          <CprStatusBadge status={staff.cprStatus} variant="full" />
          {showEditAction && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onEditCpr}
              aria-label={t('staff.cprEditTitle')}
            >
              <Edit className="h-3.5 w-3.5" />
            </Button>
          )}
        </span>
      </DetailRow>
      {cprHasRecord && staff.cprCertificationDate && (
        <DetailRow label={t('staff.cprCertificationDate')}>
          {formatDate(staff.cprCertificationDate)}
        </DetailRow>
      )}
      {cprHasRecord && staff.cprExpiryDate && (
        <DetailRow label={t('staff.cprExpiryDate')}>
          {formatDate(staff.cprExpiryDate)}
        </DetailRow>
      )}
      {cprHasRecord && staff.cprCertificationProvider && (
        <DetailRow label={t('staff.cprProvider')}>
          {staff.cprCertificationProvider}
        </DetailRow>
      )}
    </dl>
  );

  // Mobile: stacked sections with their own headings — no tab strip
  // (tab overflow was the original bug). Separators visually mimic the
  // tab grouping without forcing horizontal layout.
  if (isMobile) {
    return (
      <div className="space-y-5">
        <div>
          <h4
            className="text-xs font-semibold uppercase tracking-wider mb-2"
            style={{ color: 'var(--kc-text-3)' }}
          >
            {t('staff.detailEmploymentTabShort')}
          </h4>
          {employmentBody}
        </div>
        <div
          className="border-t pt-4"
          style={{ borderColor: 'var(--kc-border)' }}
        >
          <h4
            className="text-xs font-semibold uppercase tracking-wider mb-2"
            style={{ color: 'var(--kc-text-3)' }}
          >
            {t('staff.detailBgLabel')}
          </h4>
          {bgBody}
        </div>
        <div
          className="border-t pt-4"
          style={{ borderColor: 'var(--kc-border)' }}
        >
          <h4
            className="text-xs font-semibold uppercase tracking-wider mb-2"
            style={{ color: 'var(--kc-text-3)' }}
          >
            {t('staff.detailCprTabShort')}
          </h4>
          {cprBody}
        </div>
      </div>
    );
  }

  // Desktop: original tab strip behavior.
  return (
    <div className="space-y-4">
      <FilterTabs<'employment' | 'bg' | 'cpr'>
        tabs={[
          {
            value: 'employment',
            label: t('staff.detailEmploymentTabShort'),
          },
          { value: 'bg', label: t('staff.detailBgLabel') },
          { value: 'cpr', label: t('staff.detailCprTabShort') },
        ]}
        value={activeTab}
        onChange={setActiveTab}
        ariaLabel={t('staff.detailEmployment')}
      />

      {activeTab === 'employment' && employmentBody}
      {activeTab === 'bg' && bgBody}
      {activeTab === 'cpr' && cprBody}
    </div>
  );
}

function EmergencyContactsTabs({
  staff,
  t,
  defaultTab,
}: {
  staff: Staff;
  t: (key: string) => string;
  defaultTab: 'primary' | 'secondary';
}) {
  const [activeTab, setActiveTab] = useState<'primary' | 'secondary'>(
    defaultTab,
  );

  const renderContact = (
    name: string | null,
    phone: string | null,
    relationship: string | null,
  ) => {
    if (!name && !phone && !relationship) {
      return (
        <p
          className="text-sm"
          style={{ color: 'var(--kc-text-3)' }}
        >
          —
        </p>
      );
    }
    return (
      <dl className="space-y-3">
        <DetailRow label={t('staff.detailContactName')}>
          {name ?? '—'}
        </DetailRow>
        <DetailRow label={t('staff.detailContactPhone')}>
          {phone ? (
            <span className="font-mono">{formatPhoneUS(phone)}</span>
          ) : (
            '—'
          )}
        </DetailRow>
        {relationship && (
          <DetailRow label={t('staff.emergencyRelationship')}>
            {t(`staff.rel${capitalizeRel(relationship)}`)}
          </DetailRow>
        )}
      </dl>
    );
  };

  return (
    <div className="space-y-4">
      <FilterTabs<'primary' | 'secondary'>
        tabs={[
          { value: 'primary', label: t('staff.emergencyPrimaryHeading') },
          { value: 'secondary', label: t('staff.emergencySecondaryHeading') },
        ]}
        value={activeTab}
        onChange={setActiveTab}
        ariaLabel={t('staff.detailEmergency')}
      />
      {activeTab === 'primary'
        ? renderContact(
            staff.emergencyContactName,
            staff.emergencyContactPhone,
            staff.emergencyContactRelationship,
          )
        : renderContact(
            staff.emergencyContact2Name,
            staff.emergencyContact2Phone,
            staff.emergencyContact2Relationship,
          )}
    </div>
  );
}
