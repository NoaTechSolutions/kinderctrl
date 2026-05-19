'use client';

import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { Briefcase, Loader2, User as UserIcon } from 'lucide-react';

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
import {
  EMPLOYMENT_TYPES,
  STAFF_ROLES,
  STAFF_STATUSES,
  staffCreateSchema,
  type StaffFormData,
} from '@/lib/schemas/staff';
import type { Staff, StaffStatus } from '@/lib/types/staff';
import { formatPhoneUS, parsePhoneDigits } from '@/lib/utils/phone';
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

const DEFAULT_VALUES: StaffFormData = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  role: 'TEACHER',
  hireDate: new Date().toISOString().split('T')[0],
  employmentType: 'full_time',
  hourlyRate: undefined,
  notes: '',
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
    employmentType: EMPLOYMENT_TYPES.includes(
      staff.employmentType as (typeof EMPLOYMENT_TYPES)[number],
    )
      ? (staff.employmentType as StaffFormData['employmentType'])
      : 'full_time',
    hourlyRate: staff.hourlyRate ?? undefined,
    notes: staff.notes ?? '',
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

  // Status select (edit-only). Kept outside the zod schema so the field is
  // truly optional at the form level; the parent merges it into the
  // payload on submit.
  type FormWithStatus = StaffFormData & { status?: StaffStatus };

  const onValid = (data: StaffFormData) => {
    // Strip display formatting from phone before submitting.
    const payload: FormWithStatus = {
      ...data,
      phone: data.phone ? parsePhoneDigits(data.phone) : data.phone,
    };
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
      </Section>

      <Section icon={Briefcase} title={t('staff.employmentType')}>
        <Field
          id="role"
          label={t('staff.role')}
          error={form.formState.errors.role?.message}
          required
          requiredLabel={requiredLabel}
        >
          <Controller
            control={form.control}
            name="role"
            render={({ field }) => (
              <Select
                value={field.value}
                onValueChange={field.onChange}
                disabled={isSubmitting}
              >
                <SelectTrigger id="role" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TEACHER">
                    {t('staff.roleTeacher')}
                  </SelectItem>
                  <SelectItem value="ASSISTANT">
                    {t('staff.roleAssistant')}
                  </SelectItem>
                  <SelectItem value="ADMIN">
                    {t('staff.roleAdmin')}
                  </SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </Field>

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
