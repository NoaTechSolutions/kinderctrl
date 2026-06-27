'use client';

import { useEffect, useState } from 'react';
import { Controller, useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  Briefcase,
  Building2,
  Cake,
  Calendar,
  CalendarClock,
  DollarSign,
  FileText,
  Hash,
  HeartPulse,
  Home,
  Link2,
  Loader2,
  Mail,
  Map,
  MapPin,
  Phone,
  PhoneCall,
  ShieldCheck,
  Tag,
  ToggleLeft,
  User as UserIcon,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { ReadCard } from '@/components/ui/section-frame';
import { Checkbox } from '@/components/ui/checkbox';
import { DateField } from '@/components/ui/date-field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NameInput } from '@/components/ui/name-input';
import { NumericInput } from '@/components/ui/numeric-input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FilterTabs } from '@/components/ui/filter-tabs';
import { useTranslation } from '@/lib/i18n';
import { ApiError } from '@/lib/api/client';
import { CenterCombobox } from './center-combobox';
import {
  EMPLOYMENT_TYPES,
  STAFF_STATUSES,
  staffCreateSchema,
  type StaffFormData,
} from '@/lib/schemas/staff';
import type { Staff, StaffStatus } from '@/lib/types/staff';
import { formatPhoneUS, parsePhoneDigits } from '@/lib/utils/phone';
import { useAuthStore } from '@/store/auth';
import { useUnsavedChangesPrompt } from '@/lib/hooks/use-unsaved-changes-prompt';
import { useConfirm } from '@/lib/toast';

export type StaffFormMode = 'create' | 'edit';

// PO QA #36 (Opción C hybrid): the form can render the full set of
// sections (default — used by /staff/new and /staff/[id]/edit) OR a
// filtered subset for in-dialog card edits on /staff/[id]. Section keys
// match the visual cards on the detail page so the wiring stays
// one-to-one. Compliance + status sections are kept out of the
// filterable set — compliance has dedicated forms (BackgroundCheckForm
// + CprCertificationForm) and status lives in the full edit page only.
export type StaffFormSectionKey =
  | 'personal'
  | 'address'
  | 'emergency'
  | 'employment'
  | 'status'
  | 'notes';

interface StaffFormProps {
  mode: StaffFormMode;
  initialData?: Staff;
  isSubmitting: boolean;
  serverError?: Error | null;
  onSubmit: (data: StaffFormData & { status?: StaffStatus }) => void;
  onCancel?: () => void;
  // PO QA #36 — when undefined, all sections render (legacy behavior).
  // When provided, only those sections render. Compliance + status
  // sections are unaffected by this filter (see comment above the type).
  sections?: ReadonlyArray<StaffFormSectionKey>;
  // In-tab dialog mode: when set, the center is pre-selected and the
  // CenterCombobox is hidden. The locked value is always sent in the
  // payload (SUPER_ADMIN path). Backward-compatible — existing page
  // callers that omit this prop behave exactly as before.
  lockedCenterId?: string;
  // Bubbles the form's `isDirty` flag so a wrapping dialog can intercept
  // X / ESC / outside-click closes and show the branded discard-changes
  // ConfirmDialog — same pattern as StaffInvitationForm / Issue #5.
  // Omitting this prop has no effect on existing behavior.
  onDirtyChange?: (isDirty: boolean) => void;
}

// Role is locked to TEACHER per PO post-QA-2 decision (CAMBIO 2). The
// schema still accepts the full enum so the field is forward-compatible
// when the lock is lifted; the form just disables the select and forces
// the value at submit time.
const DEFAULT_VALUES: StaffFormData = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  role: 'TEACHER',
  hireDate: new Date().toISOString().split('T')[0],
  dateOfBirth: '',
  employmentType: 'full_time',
  hourlyRate: undefined,
  notes: '',
  centerId: undefined,
  // PO QA #31 — address + emergency contacts default to empty strings
  // (the API strips blanks before submitting so the DTO sees undefined).
  street: '',
  city: '',
  state: '',
  zipCode: '',
  emergencyContactName: '',
  emergencyContactPhone: '',
  emergencyContactRelationship: '',
  emergencyContact2Name: '',
  emergencyContact2Phone: '',
  emergencyContact2Relationship: '',
  backgroundCheckCompleted: false,
  cprCertified: false,
  // PO QA #46/#49 — Both BG and CPR now carry an explicit status field
  // for the EDIT flow (ComplianceEditBlock) plus the legacy boolean
  // shortcut (backgroundCheckCompleted / cprCertified) for the CREATE
  // flow's compliance shortcuts. The /edit page strips both before
  // forwarding to dedicated /background-check + /cpr endpoints.
  backgroundCheckApproved: false,
  cprStatus: 'PENDING',
  cprCertificationDate: '',
  cprExpiryDate: '',
  cprNotes: '',
};

function toFormDefaults(staff?: Staff): StaffFormData {
  if (!staff) return DEFAULT_VALUES;
  return {
    firstName: staff.firstName,
    lastName: staff.lastName,
    email: staff.email,
    phone: staff.phone ? formatPhoneUS(staff.phone) : '',
    role: staff.role,
    hireDate: staff.hireDate.split('T')[0], // ISO → yyyy-mm-dd
    dateOfBirth: staff.dateOfBirth ? staff.dateOfBirth.split('T')[0] : '',
    employmentType: EMPLOYMENT_TYPES.includes(
      staff.employmentType as (typeof EMPLOYMENT_TYPES)[number],
    )
      ? (staff.employmentType as StaffFormData['employmentType'])
      : 'full_time',
    hourlyRate: staff.hourlyRate ?? undefined,
    notes: staff.notes ?? '',
    centerId: staff.centerId,
    // PO QA #31 — repopulate address + emergency contacts when editing.
    street: staff.street ?? '',
    city: staff.city ?? '',
    state: staff.state ?? '',
    zipCode: staff.zipCode ?? '',
    emergencyContactName: staff.emergencyContactName ?? '',
    emergencyContactPhone: staff.emergencyContactPhone
      ? formatPhoneUS(staff.emergencyContactPhone)
      : '',
    emergencyContactRelationship:
      (staff.emergencyContactRelationship as
        | StaffFormData['emergencyContactRelationship']
        | null) ?? '',
    emergencyContact2Name: staff.emergencyContact2Name ?? '',
    emergencyContact2Phone: staff.emergencyContact2Phone
      ? formatPhoneUS(staff.emergencyContact2Phone)
      : '',
    emergencyContact2Relationship:
      (staff.emergencyContact2Relationship as
        | StaffFormData['emergencyContact2Relationship']
        | null) ?? '',
    // PO QA #46/#49: BG and CPR statuses populate from the staff row.
    // The legacy *_Certified booleans are CREATE-only — defaulted to
    // false here, ignored in the edit flow (which reads *_status).
    backgroundCheckCompleted: staff.backgroundCheckStatus === 'COMPLETED',
    backgroundCheckApproved: staff.backgroundCheckApproved === true,
    cprCertified: false,
    cprStatus: staff.cprStatus,
    cprCertificationDate: staff.cprCertificationDate
      ? staff.cprCertificationDate.split('T')[0]
      : '',
    cprExpiryDate: staff.cprExpiryDate ? staff.cprExpiryDate.split('T')[0] : '',
    cprNotes: staff.cprNotes ?? '',
  };
}

function extractFieldErrors(error: Error | null | undefined): {
  rootMessage?: string;
  fieldMessages: string[];
} {
  if (!error) return { fieldMessages: [] };
  if (!(error instanceof ApiError)) {
    return { rootMessage: error.message, fieldMessages: [] };
  }
  const body = error.body as { message?: string | string[] } | null;
  const msg = body?.message;
  if (Array.isArray(msg)) {
    return { fieldMessages: msg.map(String) };
  }
  return {
    rootMessage:
      typeof msg === 'string' && msg ? msg : `HTTP ${error.status}`,
    fieldMessages: [],
  };
}

export function StaffForm({
  mode,
  initialData,
  isSubmitting,
  serverError,
  onSubmit,
  onCancel,
  sections,
  lockedCenterId,
  onDirtyChange,
}: StaffFormProps) {
  // PO QA #36 — section filter helper. Undefined sections means show
  // everything (preserves /staff/new + /staff/[id]/edit page behavior).
  // Explicit list means render only the matching <Section> blocks.
  const showSection = (key: StaffFormSectionKey) =>
    sections === undefined || sections.includes(key);

  // PO QA #38 — Emergency Contacts tab state. Primary is the default;
  // user can toggle to Secondary. Tab state is local to this form
  // instance — when a modal closes & reopens, it resets to Primary.
  // Form FIELD values (firstName, emergencyContact2Phone, etc.) persist
  // across tab switches because they live in the form state, not the
  // DOM — only the visual presentation switches.
  const [emergencyTab, setEmergencyTab] = useState<'primary' | 'secondary'>(
    'primary',
  );
  const { t } = useTranslation();
  const router = useRouter();

  const form = useForm<StaffFormData>({
    // zod v4 + @hookform/resolvers v5 infer the schema INPUT type for the
    // resolver, and hourlyRate's z.preprocess makes that input `unknown`
    // (≠ the number output). Cast to the output-typed Resolver — the form
    // works on StaffFormData (output) everywhere; types only, no behavior change.
    resolver: zodResolver(staffCreateSchema) as Resolver<StaffFormData>,
    defaultValues: {
      ...toFormDefaults(initialData),
      // lockedCenterId overrides any value from initialData — the dialog
      // always binds to the center it was opened from.
      ...(lockedCenterId !== undefined ? { centerId: lockedCenterId } : {}),
    },
  });

  const { rootMessage, fieldMessages } = extractFieldErrors(serverError);
  const requiredLabel = t('staff.fieldRequired');
  const unsavedMessage = t('staff.unsavedChangesPrompt');

  // Bubble dirty flag to wrapping dialog (if any) so it can intercept
  // X / ESC / outside-click closes with the same branded confirm flow
  // as SendInvitationDialog (Issue #5 pattern).
  const isDirty = form.formState.isDirty;
  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  useUnsavedChangesPrompt(
    form.formState.isDirty && !isSubmitting,
    unsavedMessage,
  );

  // PO QA #51: branded ConfirmDialog replaces window.confirm() for the
  // unsaved-changes prompt. Async because confirm() returns a Promise
  // that resolves on Confirm / Cancel / Escape / backdrop dismiss.
  const confirm = useConfirm();
  const handleCancel = async () => {
    if (form.formState.isDirty) {
      const ok = await confirm({
        title: t('staff.discardChangesTitle'),
        description: unsavedMessage,
        confirmText: t('staff.discardChangesAction'),
        cancelText: t('staff.keepEditing'),
        variant: 'warning',
      });
      if (!ok) return;
    }
    if (onCancel) {
      onCancel();
      return;
    }
    if (mode === 'edit' && initialData?.id) {
      router.push(`/staff/${initialData.id}`);
    } else {
      router.push('/staff');
    }
  };

  const user = useAuthStore((s) => s.user);
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const isDirector = user?.role === 'DIRECTOR';
  // PO QA #45: Center is editable in edit mode too — SUPER_ADMIN-only.
  // DIRECTOR can't reassign staff between centers (cross-center op).
  // When lockedCenterId is supplied the picker is intentionally hidden —
  // the center is already fixed to the tab's context.
  const showCenterSelect = isSuperAdmin && lockedCenterId === undefined;
  // PO QA #55 (FEATURE 2): Email is editable by SUPER_ADMIN AND DIRECTOR
  // in edit mode. Both roles trigger the same destructive flow on save
  // (session revoke + setup-email to new address). STAFF/PARENT etc.
  // keep the locked input. Create mode is always editable.
  const canEditEmail = isSuperAdmin || isDirector;
  const isEmailReadOnly = mode === 'edit' && !canEditEmail;
  // PO QA #45: Compliance section now renders in edit mode too — but
  // ONLY in the full /staff/[id]/edit page (sections === undefined). The
  // Employment-card modal uses its own dedicated 3-tab structure (#44)
  // so we keep this section out of any filtered render to avoid
  // surfacing a second editing surface for the same data.
  const showComplianceSection =
    mode === 'create' || (mode === 'edit' && sections === undefined);
  // Center picker logic lives in <CenterCombobox> now (PO QA #8 extraction
  // — shared with /staff/invite). useCenters fires inside the component
  // and is gated by showCenterSelect via React's conditional render.

  // Status select (edit-only). Kept outside the zod schema so the field is
  // truly optional at the form level; the parent merges it into the
  // payload on submit.
  type FormWithStatus = StaffFormData & { status?: StaffStatus };

  const onValid = (data: StaffFormData) => {
    // Strip display formatting from phone before submitting.
    const payload: FormWithStatus = {
      ...data,
      phone: data.phone ? parsePhoneDigits(data.phone) : data.phone,
      // Force role=TEACHER (the select is disabled but defense-in-depth).
      role: 'TEACHER',
    };

    // PO QA #45: in edit mode, compliance fields stay on the payload —
    // the parent (/staff/[id]/edit page) diffs them against initialData
    // and dispatches separate PATCH /staff/:id/background-check + /cpr
    // calls when they're dirty. The basic staff PATCH ignores them
    // (UpdateStaffDto inherits them via PartialType but the service
    // doesn't write to compliance columns — see staff.service.ts).
    //
    // PO QA #56 (BUG 2): in CREATE mode the form's compliance EDIT
    // fields (backgroundCheckApproved, cprStatus, cprCertificationDate,
    // cprExpiryDate, cprNotes) are NOT in CreateStaffDto on the backend.
    // The form state carries them as defaults because the same schema
    // serves both create and edit, but POST /staff with strict
    // ValidationPipe (forbidNonWhitelisted) rejects unknown fields with
    // 400. Strip them on create. The legacy boolean shortcuts
    // (backgroundCheckCompleted, cprCertified) STAY because the service
    // reads them to default-stamp Status + dates on the new row.
    if (mode === 'create') {
      delete payload.backgroundCheckApproved;
      delete payload.cprStatus;
      delete payload.cprCertificationDate;
      delete payload.cprExpiryDate;
      delete payload.cprNotes;
    }

    // For DIRECTOR (non-SUPER_ADMIN), strip centerId on submit so a
    // forged payload can't slip past the form's hidden select. For
    // SUPER_ADMIN, centerId is intentionally sent through.
    if (!isSuperAdmin) {
      delete payload.centerId;
    }

    onSubmit(payload);
  };

  return (
    <form
      onSubmit={form.handleSubmit(onValid)}
      className="space-y-6"
      noValidate
      aria-busy={isSubmitting}
    >
      {showSection('personal') && (
      <Section icon={UserIcon} title={t('staff.titleSingular')}>
        {/* PO QA #55: NameInput auto-capitalizes on blur ("john doe" →
            "John Doe", "mary-anne o'brien" → "Mary-Anne O'Brien"). The
            user can type freely while focused; normalization is purely
            blur-time so we don't fight their keystrokes. */}
        <Field
          id="firstName"
          icon={UserIcon}
          label={t('staff.firstName')}
          error={form.formState.errors.firstName?.message}
          required
          requiredLabel={requiredLabel}
        >
          <Controller
            control={form.control}
            name="firstName"
            render={({ field }) => (
              <NameInput
                id="firstName"
                placeholder={t('staff.firstNamePlaceholder')}
                disabled={isSubmitting}
                value={field.value ?? ''}
                onChange={field.onChange}
                onBlur={field.onBlur}
                ref={field.ref}
                name={field.name}
              />
            )}
          />
        </Field>

        <Field
          id="lastName"
          icon={UserIcon}
          label={t('staff.lastName')}
          error={form.formState.errors.lastName?.message}
          required
          requiredLabel={requiredLabel}
        >
          <Controller
            control={form.control}
            name="lastName"
            render={({ field }) => (
              <NameInput
                id="lastName"
                placeholder={t('staff.lastNamePlaceholder')}
                disabled={isSubmitting}
                value={field.value ?? ''}
                onChange={field.onChange}
                onBlur={field.onBlur}
                ref={field.ref}
                name={field.name}
              />
            )}
          />
        </Field>

        {/* PO QA #45: Email is editable on create (everyone) and on edit
            ONLY for SUPER_ADMIN. The /edit page guards the submit with a
            confirm dialog because changing email is destructive (sessions
            revoked, password nulled, setup email re-issued to the new
            address). DIRECTOR sees a locked input with the legacy
            "Email cannot be changed" hint. */}
        <Field
          id="email"
          icon={Mail}
          label={t('staff.email')}
          error={form.formState.errors.email?.message}
          required
          requiredLabel={requiredLabel}
          full
          hint={
            mode === 'edit'
              ? canEditEmail
                ? t('staff.emailEditWarn')
                : t('staff.emailReadOnly')
              : undefined
          }
          hintTone={
            mode === 'edit' && canEditEmail ? 'warning' : 'default'
          }
        >
          <Input
            id="email"
            type="email"
            placeholder={t('staff.emailPlaceholder')}
            disabled={isSubmitting || isEmailReadOnly}
            {...form.register('email')}
          />
        </Field>

        <Field
          id="phone"
          icon={Phone}
          label={t('staff.phone')}
          error={form.formState.errors.phone?.message}
        >
          <Controller
            control={form.control}
            name="phone"
            render={({ field }) => (
              <Input
                id="phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                maxLength={14}
                placeholder={t('staff.phonePlaceholder')}
                disabled={isSubmitting}
                value={field.value ?? ''}
                onChange={(e) =>
                  field.onChange(formatPhoneUS(e.target.value))
                }
                onBlur={field.onBlur}
                ref={field.ref}
                name={field.name}
              />
            )}
          />
        </Field>

        {/* PO QA #3 CAMBIO 9: optional DOB. <input type="date"> is the
            same pattern used by hireDate + every other date field in the
            app — no DatePicker component needed. */}
        <Field
          id="dateOfBirth"
          icon={Cake}
          label={t('staff.dateOfBirth')}
          error={form.formState.errors.dateOfBirth?.message}
        >
          <DateField
            id="dateOfBirth"
            type="date"
            disabled={isSubmitting}
            {...form.register('dateOfBirth')}
          />
        </Field>
      </Section>
      )}

      {/* PO QA #31: Address section. Same 4-field layout as Center /
          self-service profile. All optional — the admin can leave any
          combination blank and the API strips empties before submit. */}
      {showSection('address') && (
      <Section icon={Home} title={t('staff.addressSection')}>
        <Field
          id="street"
          icon={MapPin}
          label={t('centers.street')}
          error={form.formState.errors.street?.message}
          full
        >
          <Input
            id="street"
            placeholder={t('staff.addressStreetPh')}
            disabled={isSubmitting}
            {...form.register('street')}
          />
        </Field>

        {/* PO QA #37: City gets its own full row (was sharing the right
            half with state+zip and the zip ended up cramped). State and
            Zip share the next row 50/50 inside a sm:col-span-2 wrapper
            so the modal stays balanced. */}
        <Field
          id="city"
          icon={Building2}
          label={t('centers.city')}
          error={form.formState.errors.city?.message}
          full
        >
          <Input
            id="city"
            placeholder={t('staff.addressCityPh')}
            disabled={isSubmitting}
            {...form.register('city')}
          />
        </Field>

        <div className="sm:col-span-2 grid grid-cols-2 gap-3 [&>*]:min-w-0">
          <Field
            id="state"
            icon={Map}
            label={t('centers.state')}
            error={form.formState.errors.state?.message}
          >
            <Input
              id="state"
              placeholder="CA"
              maxLength={2}
              disabled={isSubmitting}
              {...form.register('state', {
                setValueAs: (v: unknown) =>
                  typeof v === 'string' ? v.trim().toUpperCase() : v,
              })}
            />
          </Field>

          <Field
            id="zipCode"
            icon={Hash}
            label={t('centers.zipCode')}
            error={form.formState.errors.zipCode?.message}
          >
            {/* PO QA #50: digits-only NumericInput (no `-` for the +4
                suffix any more — spec says "solo números"). maxLength=5
                caps at the 5-digit ZIP; backend regex still accepts the
                legacy "94102-1234" format for already-stored rows. */}
            <Controller
              control={form.control}
              name="zipCode"
              render={({ field }) => (
                <NumericInput
                  id="zipCode"
                  placeholder="94102"
                  maxLength={5}
                  disabled={isSubmitting}
                  value={field.value ?? ''}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  ref={field.ref}
                  name={field.name}
                />
              )}
            />
          </Field>
        </div>
      </Section>
      )}

      {/* PO QA #32: Emergency Contacts unified into ONE Section with
          Primary + Secondary subsections separated by a hairline. Was
          two separate fieldsets in QA #31. Each subsection has its own
          row of name+phone+relationship fields wrapped in a grid so the
          parent Section's grid-cols-2 layout doesn't fight the inner
          structure. */}
      {showSection('emergency') && (
      <Section icon={PhoneCall} title={t('staff.emergencyContactSection')}>
        {/* PO QA #38: Primary + Secondary in tabs instead of stacked.
            Less scroll, clear separation, encourages focused entry of
            one contact at a time. Form values for the inactive tab
            persist in form state — switching back recovers what was
            typed. */}
        <div className="sm:col-span-2 space-y-4">
          <FilterTabs<'primary' | 'secondary'>
            tabs={[
              {
                value: 'primary',
                label: t('staff.emergencyPrimaryHeading'),
              },
              {
                value: 'secondary',
                label: t('staff.emergencySecondaryHeading'),
              },
            ]}
            value={emergencyTab}
            onChange={setEmergencyTab}
            ariaLabel={t('staff.emergencyContactSection')}
          />
          {emergencyTab === 'primary' ? (
            <EmergencyContactBlock
              namePrefix="emergencyContact"
              isSubmitting={isSubmitting}
              form={form}
              t={t}
            />
          ) : (
            <EmergencyContactBlock
              namePrefix="emergencyContact2"
              isSubmitting={isSubmitting}
              form={form}
              t={t}
            />
          )}
        </div>
      </Section>
      )}

      {showSection('employment') && (
      <Section icon={Briefcase} title={t('staff.employmentType')}>
        {/* CAMBIO 2: Role locked to TEACHER. Select stays visible (so the
            user understands what role the new hire gets) but disabled. The
            hint below reinforces the temporary nature of the lock. */}
        <Field
          id="role"
          icon={Tag}
          label={t('staff.role')}
          error={form.formState.errors.role?.message}
          required
          requiredLabel={requiredLabel}
          hint={t('staff.roleHintFixed')}
        >
          <Select value="TEACHER" disabled>
            <SelectTrigger id="role" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TEACHER">
                {t('staff.roleTeacher')}
              </SelectItem>
            </SelectContent>
          </Select>
        </Field>

        {/* CAMBIO 6 Opción Y + PO QA #3/#8/#45: SUPER_ADMIN Center picker.
            On create it's a required selection (no center → no staff). On
            edit it's optional — the staff already has a center, and the
            picker only enforces a change when the SUPER_ADMIN intentionally
            picks a different one. DIRECTOR doesn't see this field; they
            inherit centerId from their own User row server-side. */}
        {showCenterSelect && (
          <Field
            id="centerId"
            icon={Building2}
            label={
              mode === 'create' ? t('staff.assignToCenter') : t('staff.center')
            }
            error={form.formState.errors.centerId?.message}
            required={mode === 'create'}
            requiredLabel={mode === 'create' ? requiredLabel : undefined}
            full
            hint={
              mode === 'edit' ? t('staff.centerReassignHint') : undefined
            }
          >
            <Controller
              control={form.control}
              name="centerId"
              render={({ field }) => (
                <CenterCombobox
                  id="centerId"
                  value={field.value}
                  onChange={(v) => field.onChange(v)}
                  disabled={isSubmitting}
                />
              )}
            />
          </Field>
        )}

        <Field
          id="employmentType"
          icon={Briefcase}
          label={t('staff.employmentType')}
          error={form.formState.errors.employmentType?.message}
        >
          <Controller
            control={form.control}
            name="employmentType"
            render={({ field }) => (
              <Select
                value={field.value}
                onValueChange={field.onChange}
                disabled={isSubmitting}
              >
                <SelectTrigger id="employmentType" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="full_time">
                    {t('staff.employmentFullTime')}
                  </SelectItem>
                  <SelectItem value="part_time">
                    {t('staff.employmentPartTime')}
                  </SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </Field>

        <Field
          id="hireDate"
          icon={Calendar}
          label={t('staff.hireDate')}
          error={form.formState.errors.hireDate?.message}
        >
          <DateField
            id="hireDate"
            type="date"
            disabled={isSubmitting}
            {...form.register('hireDate')}
          />
        </Field>

        <Field
          id="hourlyRate"
          icon={DollarSign}
          label={t('staff.hourlyRate')}
          error={form.formState.errors.hourlyRate?.message}
        >
          {/* PO QA #50: decimals allowed (25.50), negatives blocked,
              letters blocked — replaces native <input type="number">
              which let scroll-wheel + `e` notation slip through.
              Schema's preprocess converts the string to a number on
              submit; `positive()` enforces > 0. */}
          <Controller
            control={form.control}
            name="hourlyRate"
            render={({ field }) => (
              <NumericInput
                id="hourlyRate"
                allowDecimal
                placeholder={t('staff.hourlyRatePlaceholder')}
                disabled={isSubmitting}
                value={field.value == null ? '' : String(field.value)}
                onChange={field.onChange}
                onBlur={field.onBlur}
                ref={field.ref}
                name={field.name}
              />
            )}
          />
        </Field>
      </Section>
      )}

      {/* PO QA #45: Compliance section now renders in BOTH modes.
          - Create: same 2-checkbox shortcut as before. Server translates
            true → status=APPROVED + date=now + verifier=actor.
          - Edit: extended fields — BG (Completed + Verifier display +
            Date + Notes) and CPR (Certified + Expiry Date + Notes).
            /staff/[id]/edit page diffs these against initialData and
            fires the dedicated /background-check + /cpr endpoints when
            dirty (multi-call), so the basic PATCH /staff/:id stays
            compliance-free. */}
      {showComplianceSection && (
        <Section icon={ShieldCheck} title={t('staff.complianceTitle')}>
          {mode === 'create' ? (
            <div className="sm:col-span-2 space-y-3">
              <Controller
                control={form.control}
                name="backgroundCheckCompleted"
                render={({ field }) => (
                  <label
                    htmlFor="bgCompleted"
                    className="flex items-start gap-3 cursor-pointer"
                  >
                    <Checkbox
                      id="bgCompleted"
                      checked={field.value === true}
                      onCheckedChange={(v) => field.onChange(v === true)}
                      disabled={isSubmitting}
                      className="mt-0.5"
                    />
                    <span className="space-y-0.5 leading-tight">
                      <span className="block text-sm font-medium">
                        {t('staff.bgCompletedLabel')}
                      </span>
                      <span
                        className="block text-xs"
                        style={{ color: 'var(--kc-text-3)' }}
                      >
                        {t('staff.bgCompletedHint')}
                      </span>
                    </span>
                  </label>
                )}
              />
              <Controller
                control={form.control}
                name="cprCertified"
                render={({ field }) => (
                  <label
                    htmlFor="cprCompleted"
                    className="flex items-start gap-3 cursor-pointer"
                  >
                    <Checkbox
                      id="cprCompleted"
                      checked={field.value === true}
                      onCheckedChange={(v) => field.onChange(v === true)}
                      disabled={isSubmitting}
                      className="mt-0.5"
                    />
                    <span className="space-y-0.5 leading-tight">
                      <span className="block text-sm font-medium">
                        {t('staff.cprCompletedLabel')}
                      </span>
                      <span
                        className="block text-xs"
                        style={{ color: 'var(--kc-text-3)' }}
                      >
                        {t('staff.cprCompletedHint')}
                      </span>
                    </span>
                  </label>
                )}
              />
            </div>
          ) : (
            <ComplianceEditBlock
              form={form}
              isSubmitting={isSubmitting}
              t={t}
            />
          )}
        </Section>
      )}

      {/* PO QA #36 bugfix: Status was rendering in every per-card edit
          modal (Personal, Address, Emergency, Employment) because the
          gate was only `mode === 'edit'`. Now it's `'status'` as part
          of the filterable section set — only renders when:
            (a) sections is undefined (full /staff/[id]/edit page), or
            (b) the caller's sections array includes 'status' (Personal
                Info modal does; other card modals don't). */}
      {mode === 'edit' && showSection('status') && (
        <Section icon={ToggleLeft} title={t('staff.status')}>
          {/* PO QA #47 (BUG 2b fix): the Section heading already says
              "Status" — wrapping the Select in a Field with the same
              label rendered "Status" twice (Section title + Field
              label). Render the Select directly with an sr-only Label
              so screen readers still get an accessible name. */}
          <Controller
            control={form.control}
            name={'status' as never}
            defaultValue={initialData?.status as never}
            render={({ field }) => (
              <div className="sm:col-span-2 min-w-0">
                <Label htmlFor="status" className="sr-only">
                  {t('staff.status')}
                </Label>
                <Select
                  value={(field.value as StaffStatus) ?? initialData?.status}
                  onValueChange={field.onChange}
                  disabled={isSubmitting}
                >
                  <SelectTrigger id="status" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STAFF_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {t(`staff.status${capitalize(s)}` as never)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          />
        </Section>
      )}

      {showSection('notes') && (
      <Section icon={UserIcon} title={t('staff.notes')}>
        <Field id="notes" icon={FileText} label={t('staff.notes')} full>
          <textarea
            id="notes"
            placeholder={t('staff.notesPlaceholder')}
            disabled={isSubmitting}
            rows={4}
            className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:border-ring disabled:cursor-not-allowed disabled:opacity-50"
            {...form.register('notes')}
          />
        </Field>
      </Section>
      )}

      {(rootMessage || fieldMessages.length > 0) && (
        <div
          role="alert"
          className="rounded-lg border p-3"
          style={{
            background: 'var(--kc-error-bg)',
            borderColor:
              'color-mix(in oklch, var(--kc-error), transparent 70%)',
          }}
        >
          {rootMessage && (
            <p
              className="text-sm font-medium"
              style={{ color: 'var(--kc-error)' }}
            >
              {rootMessage}
            </p>
          )}
          {fieldMessages.length > 0 && (
            <ul
              className="mt-1 list-disc pl-5 text-sm space-y-0.5"
              style={{ color: 'var(--kc-error)' }}
            >
              {fieldMessages.map((m, i) => (
                <li key={i}>{m}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div
        className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end pt-2 border-t"
        style={{ borderColor: 'var(--kc-border)' }}
      >
        <Button
          type="button"
          variant="outline"
          onClick={handleCancel}
          disabled={isSubmitting}
        >
          {t('staff.cancel')}
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting || !form.formState.isDirty}
          title={
            !form.formState.isDirty && !isSubmitting
              ? t('staff.noChangesHint')
              : undefined
          }
        >
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isSubmitting
            ? t('staff.saving')
            : mode === 'create'
              ? t('staff.create')
              : t('staff.save')}
        </Button>
      </div>
    </form>
  );
}

function capitalize(s: string): string {
  return s.charAt(0) + s.slice(1).toLowerCase();
}

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: LucideIcon;
  title: string;
  children: React.ReactNode;
}) {
  // Card pattern: ReadCard gives the circular purple icon badge + 15px title
  // header (same shell the detail cards + Children wizard steps use). Body is
  // the same 2-col field grid as before.
  return (
    <ReadCard icon={Icon} title={title}>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </ReadCard>
  );
}

function Field({
  id,
  label,
  error,
  full,
  required,
  requiredLabel,
  hint,
  hintTone = 'default',
  icon: Icon,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  full?: boolean;
  required?: boolean;
  requiredLabel?: string;
  hint?: string;
  // PO QA #50: 'warning' renders the hint in amber with an alert icon —
  // used for destructive-action heads-ups (e.g. SUPER_ADMIN editing
  // someone else's email rotates sessions + sends a setup link). The
  // default tone stays subdued gray, same as before.
  hintTone?: 'default' | 'warning';
  // Card-pattern: a semantic Lucide icon beside the label (purple
  // --kc-p-600), matching the Children create wizard / ReadRow.
  icon?: LucideIcon;
  children: React.ReactNode;
}) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  return (
    // min-w-0: the parent layout is CSS Grid, and grid items default to
    // min-width:auto (= min-content). Without min-w-0 here, any field
    // whose children have wide unbreakable content (the CenterCombobox
    // listbox is the canonical offender — long center names + emails)
    // grows its column past the viewport on narrow screens, even though
    // the children themselves are correctly set up to truncate.
    // Same root cause as PO QA #18 on the SendInvitationDialog. PO QA #21.
    <div
      className={
        full
          ? 'sm:col-span-2 space-y-1.5 min-w-0'
          : 'space-y-1.5 min-w-0'
      }
    >
      <Label
        htmlFor={id}
        className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.05em]"
        style={{ color: 'var(--kc-text-3)' }}
      >
        {Icon && (
          <Icon
            className="h-3.5 w-3.5 flex-none"
            style={{ color: 'var(--kc-p-600)' }}
            aria-hidden
          />
        )}
        {label}
        {required && (
          <span
            aria-label={requiredLabel}
            style={{ color: 'var(--kc-error)' }}
          >
            *
          </span>
        )}
      </Label>
      {children}
      {hint && !error && (
        <p
          id={hintId}
          className={
            hintTone === 'warning'
              ? 'text-xs inline-flex items-start gap-1.5'
              : 'text-xs'
          }
          style={{
            color:
              hintTone === 'warning'
                ? 'var(--kc-warning)'
                : 'var(--kc-text-3)',
          }}
        >
          {hintTone === 'warning' && (
            <AlertTriangle
              className="h-3.5 w-3.5 flex-none mt-0.5"
              aria-hidden
            />
          )}
          <span>{hint}</span>
        </p>
      )}
      {error && (
        <p
          id={errorId}
          role="alert"
          className="text-xs"
          style={{ color: 'var(--kc-error)' }}
        >
          {error}
        </p>
      )}
    </div>
  );
}

// PO QA #46: Compliance edit block — only rendered inside the full
// /staff/[id]/edit page (mode === 'edit' && sections === undefined).
// The Employment-card modal on /staff/[id] uses its own dedicated 3-tab
// structure (#44) so this block stays out of any filtered render.
//
// Fields per spec:
//   Background Check: Status (Completed boolean) + Approved (boolean
//                     shown only when Completed=true). All other BG
//                     columns (date / expiry / notes / verifier) were
//                     dropped in #46 and no longer exist server-side.
//   CPR:              Certified (boolean) + Expiry Date + Notes
// `staff` prop is non-null because the caller is the edit page (which
// only renders the form once the staff fetch resolves).
//
// IMPORTANT: this block writes to `form` but does NOT submit. The /edit
// page diffs the dirty fields against `initialData` and dispatches up
// to three PATCH endpoints (basic + bg + cpr) in parallel. The
// "Completed" checkbox is the binary view of backgroundCheckStatus —
// true maps to COMPLETED, false maps to PENDING. The "Approved"
// checkbox carries the outcome (true / false) for COMPLETED rows.
function ComplianceEditBlock({
  form,
  isSubmitting,
  t,
}: {
  form: ReturnType<typeof useForm<StaffFormData>>;
  isSubmitting: boolean;
  t: (key: string) => string;
}) {
  // Watch the Completed flag so the Approved checkbox can toggle into
  // view only when it's relevant (per spec: "Approved visible only when
  // status = Completed"). react-hook-form's `watch` re-renders the
  // block on change so the conditional render lands in the same paint.
  const bgCompleted = form.watch('backgroundCheckCompleted') === true;

  return (
    <div className="sm:col-span-2 space-y-6">
      {/* ─── Background Check ───────────────────────────────────── */}
      <div className="space-y-3">
        <h4
          className="text-sm font-semibold"
          style={{ color: 'var(--kc-text-2)' }}
        >
          {t('staff.detailBgLabel')}
        </h4>
        <Controller
          control={form.control}
          name="backgroundCheckCompleted"
          render={({ field }) => (
            <label
              htmlFor="bgCompletedEdit"
              className="flex items-start gap-3 cursor-pointer"
            >
              <Checkbox
                id="bgCompletedEdit"
                checked={field.value === true}
                onCheckedChange={(v) => {
                  field.onChange(v === true);
                  // PO QA #46: clearing Completed must also clear the
                  // Approved outcome so the form state can't carry a
                  // stale "yes, approved" flag into a pending/cancelled
                  // save. Backend will also null it out, but resetting
                  // here keeps the checkbox visually consistent.
                  if (v !== true) {
                    form.setValue('backgroundCheckApproved', false, {
                      shouldDirty: true,
                    });
                  }
                }}
                disabled={isSubmitting}
                className="mt-0.5"
              />
              <span className="space-y-0.5 leading-tight">
                <span className="block text-sm font-medium">
                  {t('staff.bgCompletedLabel')}
                </span>
                <span
                  className="block text-xs"
                  style={{ color: 'var(--kc-text-3)' }}
                >
                  {t('staff.bgCompletedHintEdit')}
                </span>
              </span>
            </label>
          )}
        />
        {bgCompleted && (
          <Controller
            control={form.control}
            name="backgroundCheckApproved"
            render={({ field }) => (
              <label
                htmlFor="bgApprovedEdit"
                className="flex items-start gap-3 cursor-pointer pl-7"
              >
                <Checkbox
                  id="bgApprovedEdit"
                  checked={field.value === true}
                  onCheckedChange={(v) => field.onChange(v === true)}
                  disabled={isSubmitting}
                  className="mt-0.5"
                />
                <span className="space-y-0.5 leading-tight">
                  <span className="block text-sm font-medium">
                    {t('staff.bgApprovedLabel')}
                  </span>
                  <span
                    className="block text-xs"
                    style={{ color: 'var(--kc-text-3)' }}
                  >
                    {t('staff.bgApprovedHint')}
                  </span>
                </span>
              </label>
            )}
          />
        )}
      </div>

      <div
        className="border-t"
        style={{
          borderColor:
            'color-mix(in oklch, var(--kc-border), transparent 50%)',
        }}
      />

      {/* ─── CPR / First Aid ──────────────────────────────────────
          PO QA #49: mirror of BG above — Status dropdown drives the
          lifecycle, Expiry is conditional (required when ACTIVE/EXPIRED
          per validator). The cprCertified shortcut stays the CREATE-only
          flag (handled in the create-mode branch above this helper). */}
      <div className="space-y-3">
        <h4
          className="text-sm font-semibold"
          style={{ color: 'var(--kc-text-2)' }}
        >
          {t('staff.detailCprLabel')}
        </h4>
        <Controller
          control={form.control}
          name="cprStatus"
          render={({ field }) => {
            const cprStatusValue = (field.value as CprStatusValue) ?? 'PENDING';
            const expiryRequired =
              cprStatusValue === 'ACTIVE' || cprStatusValue === 'EXPIRED';
            return (
              <>
                <div className="space-y-1.5">
                  <Label
                    htmlFor="cprStatusEdit"
                    className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.05em]"
                    style={{ color: 'var(--kc-text-3)' }}
                  >
                    <HeartPulse
                      className="h-3.5 w-3.5 flex-none"
                      style={{ color: 'var(--kc-p-600)' }}
                      aria-hidden
                    />
                    {t('staff.cprStatus')}
                  </Label>
                  <Select
                    value={cprStatusValue}
                    onValueChange={(v) =>
                      field.onChange(v as CprStatusValue)
                    }
                    disabled={isSubmitting}
                  >
                    <SelectTrigger id="cprStatusEdit" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PENDING">
                        {t('staff.cprStatusPending')}
                      </SelectItem>
                      <SelectItem value="ACTIVE">
                        {t('staff.cprStatusActive')}
                      </SelectItem>
                      <SelectItem value="EXPIRED">
                        {t('staff.cprStatusExpired')}
                      </SelectItem>
                      <SelectItem value="CANCELLED">
                        {t('staff.cprStatusCancelled')}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Field
                  id="cprExpiryDate"
                  icon={CalendarClock}
                  label={
                    expiryRequired
                      ? `${t('staff.cprExpiryDate')} *`
                      : t('staff.cprExpiryDate')
                  }
                  error={form.formState.errors.cprExpiryDate?.message}
                  hint={
                    expiryRequired
                      ? cprStatusValue === 'ACTIVE'
                        ? t('staff.cprExpiryHintActive')
                        : t('staff.cprExpiryHintExpired')
                      : undefined
                  }
                >
                  <DateField
                    id="cprExpiryDate"
                    type="date"
                    disabled={isSubmitting}
                    {...form.register('cprExpiryDate')}
                  />
                </Field>
                <Field
                  id="cprNotes"
                  icon={FileText}
                  label={t('staff.cprNotes')}
                  error={form.formState.errors.cprNotes?.message}
                  full
                >
                  <textarea
                    id="cprNotes"
                    placeholder={t('staff.cprNotesPh')}
                    disabled={isSubmitting}
                    rows={3}
                    className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:border-ring disabled:cursor-not-allowed disabled:opacity-50"
                    {...form.register('cprNotes')}
                  />
                </Field>
              </>
            );
          }}
        />
      </div>
    </div>
  );
}

// PO QA #49 — local alias so the Controller's render callback above
// can type the value without importing the union from types/. Kept
// inline to avoid widening the public type surface.
type CprStatusValue = 'PENDING' | 'ACTIVE' | 'EXPIRED' | 'CANCELLED';

// Shared subsection for Primary + Secondary emergency contacts (PO QA
// #32, restructured in #38 to be tab-content rather than stacked). The
// caller now provides the visual heading (was: inline <p>); this block
// just renders the 3 fields. The namePrefix template-literal types keep
// `form.register()` typecheck-safe.
function EmergencyContactBlock({
  namePrefix,
  isSubmitting,
  form,
  t,
}: {
  namePrefix: 'emergencyContact' | 'emergencyContact2';
  isSubmitting: boolean;
  form: ReturnType<typeof useForm<StaffFormData>>;
  t: (key: string) => string;
}) {
  const nameField = `${namePrefix}Name` as const;
  const phoneField = `${namePrefix}Phone` as const;
  const relField = `${namePrefix}Relationship` as const;
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 [&>*]:min-w-0">
        <Field
          id={nameField}
          icon={UserIcon}
          label={t('staff.emergencyName')}
          error={form.formState.errors[nameField]?.message as string | undefined}
        >
          <Input
            id={nameField}
            placeholder={t('staff.emergencyNamePh')}
            disabled={isSubmitting}
            {...form.register(nameField)}
          />
        </Field>

        <Field
          id={phoneField}
          icon={Phone}
          label={t('staff.emergencyPhone')}
          error={form.formState.errors[phoneField]?.message as string | undefined}
        >
          <Controller
            control={form.control}
            name={phoneField}
            render={({ field }) => (
              <Input
                id={phoneField}
                type="tel"
                inputMode="tel"
                maxLength={14}
                placeholder={t('staff.phonePlaceholder')}
                disabled={isSubmitting}
                value={field.value ?? ''}
                onChange={(e) =>
                  field.onChange(formatPhoneUS(e.target.value))
                }
                onBlur={field.onBlur}
                ref={field.ref}
                name={field.name}
              />
            )}
          />
        </Field>

        <div className="sm:col-span-2 min-w-0">
          <Field
            id={relField}
            icon={Link2}
            label={t('staff.emergencyRelationship')}
            error={form.formState.errors[relField]?.message as string | undefined}
            full
          >
            <Controller
              control={form.control}
              name={relField}
              render={({ field }) => (
                <Select
                  value={field.value ?? ''}
                  onValueChange={(v) => field.onChange(v)}
                  disabled={isSubmitting}
                >
                  <SelectTrigger id={relField} className="w-full">
                    <SelectValue
                      placeholder={t('staff.emergencyRelationshipPh')}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="father">{t('staff.relFather')}</SelectItem>
                    <SelectItem value="mother">{t('staff.relMother')}</SelectItem>
                    <SelectItem value="spouse">{t('staff.relSpouse')}</SelectItem>
                    <SelectItem value="partner">{t('staff.relPartner')}</SelectItem>
                    <SelectItem value="sibling">{t('staff.relSibling')}</SelectItem>
                    <SelectItem value="friend">{t('staff.relFriend')}</SelectItem>
                    <SelectItem value="other">{t('staff.relOther')}</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </Field>
        </div>
      </div>
    </div>
  );
}
