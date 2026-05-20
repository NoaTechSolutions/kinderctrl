'use client';

import { useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import {
  Briefcase,
  Check,
  Loader2,
  Search,
  ShieldCheck,
  User as UserIcon,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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
import { cn } from '@/lib/utils';
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

export type StaffFormMode = 'create' | 'edit';

interface StaffFormProps {
  mode: StaffFormMode;
  initialData?: Staff;
  isSubmitting: boolean;
  serverError?: Error | null;
  onSubmit: (data: StaffFormData & { status?: StaffStatus }) => void;
  onCancel?: () => void;
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
  backgroundCheckCompleted: false,
  cprCertified: false,
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
    // Compliance checkboxes are CREATE-only (in edit mode they don't
    // render). Defaulting to false is harmless because the edit submit
    // strips them out (see onValid below).
    backgroundCheckCompleted: false,
    cprCertified: false,
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
}: StaffFormProps) {
  const { t } = useTranslation();
  const router = useRouter();

  const form = useForm<StaffFormData>({
    resolver: zodResolver(staffCreateSchema),
    defaultValues: toFormDefaults(initialData),
  });

  const { rootMessage, fieldMessages } = extractFieldErrors(serverError);
  const requiredLabel = t('staff.fieldRequired');
  const unsavedMessage = t('staff.unsavedChangesPrompt');

  useUnsavedChangesPrompt(
    form.formState.isDirty && !isSubmitting,
    unsavedMessage,
  );

  const handleCancel = () => {
    if (form.formState.isDirty && !window.confirm(unsavedMessage)) {
      return;
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
  const showCenterSelect = mode === 'create' && isSuperAdmin;
  const showComplianceSection = mode === 'create';

  // Centers list for SUPER_ADMIN's Center picker (CAMBIO 6 Opción Y —
  // director is shown via center.owner.email, no denormalized directorId).
  // useCenters returns PaginatedCenters; unwrap .data.data for the array.
  //
  // ERROR-1 fix (PO QA #4): only fire the query when the Center select is
  // actually rendered — DIRECTOR's session would otherwise hit /centers
  // unnecessarily and surface a 401 in the console during the initial
  // accessToken-null-then-refresh window (token isn't persisted across
  // reloads, only refreshToken is).
  const centersQuery = useCenters(
    {},
    { enabled: showCenterSelect },
  );
  const centers = centersQuery.data?.data ?? [];

  // PO QA #3 CAMBIO 8: searchable combobox (Center name OR director email).
  // Inline implementation — no cmdk/Popover deps needed at this scale.
  const [centerSearch, setCenterSearch] = useState('');
  const filteredCenters = useMemo(() => {
    const q = centerSearch.trim().toLowerCase();
    if (!q) return centers;
    return centers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.owner?.email ?? '').toLowerCase().includes(q),
    );
  }, [centers, centerSearch]);

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

    // Compliance checkboxes only meaningful on create — strip in edit so
    // we don't accidentally re-stamp an already-verified record's date.
    if (mode === 'edit') {
      delete payload.backgroundCheckCompleted;
      delete payload.cprCertified;
    }

    // For DIRECTOR, centerId must not be sent (backend derives from User).
    // For SUPER_ADMIN in create mode, centerId comes from the select.
    // In edit mode, never send centerId — moving staff between centers
    // isn't a supported operation through this form.
    if (mode === 'edit' || !isSuperAdmin) {
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
      <Section icon={UserIcon} title={t('staff.titleSingular')}>
        <Field
          id="firstName"
          label={t('staff.firstName')}
          error={form.formState.errors.firstName?.message}
          required
          requiredLabel={requiredLabel}
        >
          <Input
            id="firstName"
            placeholder={t('staff.firstNamePlaceholder')}
            disabled={isSubmitting}
            {...form.register('firstName')}
          />
        </Field>

        <Field
          id="lastName"
          label={t('staff.lastName')}
          error={form.formState.errors.lastName?.message}
          required
          requiredLabel={requiredLabel}
        >
          <Input
            id="lastName"
            placeholder={t('staff.lastNamePlaceholder')}
            disabled={isSubmitting}
            {...form.register('lastName')}
          />
        </Field>

        <Field
          id="email"
          label={t('staff.email')}
          error={form.formState.errors.email?.message}
          required
          requiredLabel={requiredLabel}
          full
          hint={mode === 'edit' ? 'Email cannot be changed' : undefined}
        >
          <Input
            id="email"
            type="email"
            placeholder={t('staff.emailPlaceholder')}
            disabled={isSubmitting || mode === 'edit'}
            {...form.register('email')}
          />
        </Field>

        <Field
          id="phone"
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
          label={t('staff.dateOfBirth')}
          error={form.formState.errors.dateOfBirth?.message}
        >
          <Input
            id="dateOfBirth"
            type="date"
            disabled={isSubmitting}
            {...form.register('dateOfBirth')}
          />
        </Field>
      </Section>

      <Section icon={Briefcase} title={t('staff.employmentType')}>
        {/* CAMBIO 2: Role locked to TEACHER. Select stays visible (so the
            user understands what role the new hire gets) but disabled. The
            hint below reinforces the temporary nature of the lock. */}
        <Field
          id="role"
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

        {/* CAMBIO 6 Opción Y + PO QA #3 CAMBIO 8: SUPER_ADMIN Center
            picker with always-visible search (filters by center name OR
            director email). Director derived from center.owner — no
            denormalized directorId per spec D-5. */}
        {showCenterSelect && (
          <Field
            id="centerId"
            label={t('staff.assignToCenter')}
            error={form.formState.errors.centerId?.message}
            required
            requiredLabel={requiredLabel}
            full
          >
            <Controller
              control={form.control}
              name="centerId"
              render={({ field }) => {
                return (
                  <div className="space-y-2">
                    <div className="relative">
                      <Search
                        className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none"
                        style={{ color: 'var(--kc-text-3)' }}
                        aria-hidden
                      />
                      <Input
                        type="text"
                        value={centerSearch}
                        onChange={(e) => setCenterSearch(e.target.value)}
                        placeholder={t('staff.centerSearchPlaceholder')}
                        disabled={isSubmitting || centersQuery.isLoading}
                        className="pl-9"
                        aria-label={t('staff.centerSearchPlaceholder')}
                      />
                    </div>
                    <div
                      role="listbox"
                      aria-label={t('staff.assignToCenter')}
                      className="rounded-md border max-h-56 overflow-y-auto"
                      style={{
                        background: 'var(--kc-surface)',
                        borderColor: 'var(--kc-border)',
                      }}
                    >
                      {centersQuery.isLoading && (
                        <div
                          className="px-3 py-4 text-sm"
                          style={{ color: 'var(--kc-text-3)' }}
                        >
                          {t('staff.complianceLoading')}
                        </div>
                      )}
                      {!centersQuery.isLoading && filteredCenters.length === 0 && (
                        <div
                          className="px-3 py-4 text-sm"
                          style={{ color: 'var(--kc-text-3)' }}
                        >
                          {t('staff.centerSearchEmpty')}
                        </div>
                      )}
                      {filteredCenters.map((c) => {
                        const isSelected = c.id === field.value;
                        return (
                          <button
                            key={c.id}
                            type="button"
                            role="option"
                            aria-selected={isSelected}
                            onClick={() => field.onChange(c.id)}
                            disabled={isSubmitting}
                            className={cn(
                              'w-full text-left px-3 py-2 flex items-start gap-2 transition-colors focus-visible:outline-none',
                              isSelected
                                ? 'bg-primary/10 border-l-2 border-primary'
                                : 'hover:bg-secondary focus-visible:bg-secondary',
                            )}
                          >
                            <span className="flex-1 min-w-0">
                              <span className="block font-medium text-sm truncate">
                                {c.name}
                              </span>
                              <span
                                className="block text-xs truncate"
                                style={{ color: 'var(--kc-text-3)' }}
                              >
                                Director: {c.owner?.email ?? '(no owner)'}
                              </span>
                            </span>
                            {isSelected && (
                              <Check
                                className="h-5 w-5 flex-none mt-0.5 text-green-600"
                                strokeWidth={3}
                                aria-hidden
                              />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              }}
            />
          </Field>
        )}

        <Field
          id="employmentType"
          label={t('staff.employmentType')}
          error={form.formState.errors.employmentType?.message}
          required
          requiredLabel={requiredLabel}
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
          label={t('staff.hireDate')}
          error={form.formState.errors.hireDate?.message}
          required
          requiredLabel={requiredLabel}
        >
          <Input
            id="hireDate"
            type="date"
            disabled={isSubmitting}
            {...form.register('hireDate')}
          />
        </Field>

        <Field
          id="hourlyRate"
          label={t('staff.hourlyRate')}
          error={form.formState.errors.hourlyRate?.message}
        >
          <Input
            id="hourlyRate"
            type="number"
            step="0.01"
            min="0"
            placeholder={t('staff.hourlyRatePlaceholder')}
            disabled={isSubmitting}
            {...form.register('hourlyRate', {
              setValueAs: (v) =>
                v === '' || v == null ? undefined : Number(v),
            })}
          />
        </Field>
      </Section>

      {/* CAMBIO 4 + 5: Compliance shortcuts on create only. Edit mode uses
          the Compliance Card on /staff/[id] (richer: status enum, dates,
          notes, provider). Checking either box stamps date=today and
          verifier=current user server-side. */}
      {showComplianceSection && (
        <Section icon={ShieldCheck} title={t('staff.complianceTitle')}>
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
        </Section>
      )}

      {mode === 'edit' && (
        <Section icon={Briefcase} title={t('staff.status')}>
          <Controller
            control={form.control}
            name={'status' as never}
            defaultValue={initialData?.status as never}
            render={({ field }) => (
              <Field id="status" label={t('staff.status')} full>
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
              </Field>
            )}
          />
        </Section>
      )}

      <Section icon={UserIcon} title={t('staff.notes')}>
        <Field id="notes" label={t('staff.notes')} full>
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
  icon: typeof UserIcon;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset
      className="rounded-lg border p-5"
      style={{
        background: 'var(--kc-surface)',
        borderColor:
          'color-mix(in oklch, var(--kc-border), transparent 30%)',
      }}
    >
      <legend className="px-2 flex items-center gap-2">
        <Icon
          className="h-4 w-4"
          style={{ color: 'var(--kc-p-600)' }}
          aria-hidden
        />
        <span
          className="text-sm font-semibold"
          style={{ color: 'var(--kc-text-1)' }}
        >
          {title}
        </span>
      </legend>
      <div className="grid gap-4 sm:grid-cols-2 mt-3">{children}</div>
    </fieldset>
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
  children,
}: {
  id: string;
  label: string;
  error?: string;
  full?: boolean;
  required?: boolean;
  requiredLabel?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  return (
    <div className={full ? 'sm:col-span-2 space-y-1.5' : 'space-y-1.5'}>
      <Label
        htmlFor={id}
        className="text-sm font-medium inline-flex items-center gap-1"
      >
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
          className="text-xs"
          style={{ color: 'var(--kc-text-3)' }}
        >
          {hint}
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
