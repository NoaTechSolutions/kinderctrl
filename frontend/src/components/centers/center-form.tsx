'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Building2, Loader2, MapPin, Phone as PhoneIcon } from 'lucide-react';

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
import { centerSchema, type CenterFormData } from '@/lib/schemas/center';
import { VALID_TIMEZONES, type Center } from '@/lib/types/center';
import { formatPhoneUS } from '@/lib/utils/phone';
import { lookupTimezoneByZip } from '@/lib/utils/zip-timezone';
import { useUnsavedChangesPrompt } from '@/lib/hooks/use-unsaved-changes-prompt';

export type CenterFormMode = 'create' | 'edit';

interface CenterFormProps {
  mode: CenterFormMode;
  initialData?: Center;
  isSubmitting: boolean;
  serverError?: Error | null;
  onSubmit: (data: CenterFormData) => void;
  onCancel?: () => void;
  /**
   * When true, the Cancel button is not rendered at all. Used during the
   * first-time DIRECTOR onboarding flow where there is no safe destination
   * to cancel to — leaving Cancel visible creates a confusing redirect
   * loop (dashboard -> /centers/new) that looks like the button is broken.
   */
  hideCancel?: boolean;
}

const DEFAULT_VALUES: CenterFormData = {
  name: '',
  street: '',
  city: '',
  state: '',
  zipCode: '',
  phone: '',
  email: '',
  website: '',
  capacity: 30,
  timezone: 'America/Los_Angeles',
  licenseNumber: '',
};

// Single source of truth for required-field markers: a field is required
// iff its Zod schema rejects `undefined`. Handles `.optional()`, `.default()`,
// and `.or(z.literal(''))` correctly without manual sync.
const REQUIRED_FIELDS: ReadonlySet<keyof CenterFormData> = new Set(
  (Object.keys(centerSchema.shape) as Array<keyof CenterFormData>).filter(
    (key) =>
      !(
        centerSchema.shape[key] as { safeParse: (v: unknown) => { success: boolean } }
      ).safeParse(undefined).success,
  ),
);

function toFormDefaults(center?: Center): CenterFormData {
  if (!center) return DEFAULT_VALUES;
  return {
    name: center.name,
    street: center.street,
    city: center.city,
    state: center.state,
    zipCode: center.zipCode,
    // Pre-format stored digits (or legacy E.164 strings) into the display
    // pattern the form now expects.
    phone: formatPhoneUS(center.phone),
    email: center.email,
    website: center.website ?? '',
    capacity: center.capacity,
    timezone: (VALID_TIMEZONES as readonly string[]).includes(center.timezone)
      ? (center.timezone as CenterFormData['timezone'])
      : 'America/Los_Angeles',
    licenseNumber: center.licenseNumber ?? '',
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

export function CenterForm({
  mode,
  initialData,
  isSubmitting,
  serverError,
  onSubmit,
  onCancel,
  hideCancel = false,
}: CenterFormProps) {
  const { t } = useTranslation();
  const router = useRouter();

  const form = useForm<CenterFormData>({
    resolver: zodResolver(centerSchema),
    defaultValues: toFormDefaults(initialData),
  });

  // Has the user manually picked a timezone? In edit mode we treat the
  // initial value as "user choice" so we don't surprise them by replacing
  // an explicit timezone with a ZIP-derived guess.
  const manualTimezonePick = useRef<boolean>(!!initialData);
  const [autoTimezone, setAutoTimezone] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      form.reset(toFormDefaults(initialData));
      manualTimezonePick.current = true;
      setAutoTimezone(null);
    }
  }, [initialData, form]);

  // Watch ZIP changes and suggest a timezone if the user hasn't picked one.
  const watchedZip = form.watch('zipCode');
  useEffect(() => {
    if (manualTimezonePick.current) return;
    if (!watchedZip || watchedZip.length < 5) {
      setAutoTimezone(null);
      return;
    }
    const tz = lookupTimezoneByZip(watchedZip);
    if (tz && tz !== form.getValues('timezone')) {
      form.setValue('timezone', tz, { shouldValidate: false });
      setAutoTimezone(tz);
    } else if (!tz) {
      setAutoTimezone(null);
    }
  }, [watchedZip, form]);

  const { rootMessage, fieldMessages } = extractFieldErrors(serverError);
  const requiredLabel = t('centers.fieldRequired');
  const unsavedMessage = t('centers.unsavedChangesPrompt');

  // Guard against accidental leaves while the form has unsaved edits.
  // Suspended during submit so programmatic navigation after save isn't
  // intercepted on its way out.
  useUnsavedChangesPrompt(
    form.formState.isDirty && !isSubmitting,
    unsavedMessage,
  );

  const handleCancel = () => {
    // The global hook only intercepts <a> clicks and tab close; the
    // Cancel button is a <button> so we confirm here explicitly.
    if (form.formState.isDirty && !window.confirm(unsavedMessage)) {
      return;
    }
    if (onCancel) {
      onCancel();
      return;
    }
    if (mode === 'edit' && initialData?.id) {
      router.push(`/centers/${initialData.id}`);
    } else {
      router.push('/centers');
    }
  };

  const isRequired = (key: keyof CenterFormData) => REQUIRED_FIELDS.has(key);

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="space-y-6"
      noValidate
      aria-busy={isSubmitting}
    >
      {/* Section: Identity */}
      <Section icon={Building2} title={t('centers.titleSingular')}>
        <Field
          id="name"
          label={t('centers.name')}
          error={form.formState.errors.name?.message}
          required={isRequired('name')}
          requiredLabel={requiredLabel}
          full
        >
          <Input
            id="name"
            placeholder={t('centers.namePlaceholder')}
            disabled={isSubmitting}
            {...form.register('name')}
          />
        </Field>

        <Field
          id="licenseNumber"
          label={t('centers.licenseNumber')}
          error={form.formState.errors.licenseNumber?.message}
          required={isRequired('licenseNumber')}
          requiredLabel={requiredLabel}
        >
          <Input
            id="licenseNumber"
            placeholder={t('centers.licenseNumberPlaceholder')}
            disabled={isSubmitting}
            {...form.register('licenseNumber')}
          />
        </Field>

        <Field
          id="capacity"
          label={t('centers.capacity')}
          error={form.formState.errors.capacity?.message}
          required={isRequired('capacity')}
          requiredLabel={requiredLabel}
        >
          <Input
            id="capacity"
            type="number"
            min={1}
            max={1000}
            placeholder={t('centers.capacityPlaceholder')}
            disabled={isSubmitting}
            {...form.register('capacity', { valueAsNumber: true })}
          />
        </Field>
      </Section>

      {/* Section: Address */}
      <Section icon={MapPin} title="Address">
        <Field
          id="street"
          label={t('centers.street')}
          error={form.formState.errors.street?.message}
          required={isRequired('street')}
          requiredLabel={requiredLabel}
          full
        >
          <Input
            id="street"
            placeholder={t('centers.streetPlaceholder')}
            disabled={isSubmitting}
            {...form.register('street')}
          />
        </Field>

        <Field
          id="city"
          label={t('centers.city')}
          error={form.formState.errors.city?.message}
          required={isRequired('city')}
          requiredLabel={requiredLabel}
        >
          <Input
            id="city"
            placeholder={t('centers.cityPlaceholder')}
            disabled={isSubmitting}
            {...form.register('city')}
          />
        </Field>

        <Field
          id="state"
          label={t('centers.state')}
          error={form.formState.errors.state?.message}
          required={isRequired('state')}
          requiredLabel={requiredLabel}
        >
          <Input
            id="state"
            maxLength={2}
            placeholder={t('centers.statePlaceholder')}
            disabled={isSubmitting}
            {...form.register('state', {
              setValueAs: (v: string) => (v ? v.toUpperCase() : v),
            })}
          />
        </Field>

        <Field
          id="zipCode"
          label={t('centers.zipCode')}
          error={form.formState.errors.zipCode?.message}
          required={isRequired('zipCode')}
          requiredLabel={requiredLabel}
        >
          <Input
            id="zipCode"
            placeholder={t('centers.zipCodePlaceholder')}
            disabled={isSubmitting}
            {...form.register('zipCode')}
          />
        </Field>

        <Field
          id="timezone"
          label={t('centers.timezone')}
          error={form.formState.errors.timezone?.message}
          required={isRequired('timezone')}
          requiredLabel={requiredLabel}
          hint={
            autoTimezone && autoTimezone === form.getValues('timezone')
              ? t('centers.timezoneAutoDetected')
              : undefined
          }
        >
          <Controller
            control={form.control}
            name="timezone"
            render={({ field }) => (
              <Select
                value={field.value ?? 'America/Los_Angeles'}
                onValueChange={(v) => {
                  manualTimezonePick.current = true;
                  setAutoTimezone(null);
                  field.onChange(v);
                }}
                disabled={isSubmitting}
              >
                <SelectTrigger id="timezone" className="w-full">
                  <SelectValue placeholder={t('centers.timezone')} />
                </SelectTrigger>
                <SelectContent>
                  {VALID_TIMEZONES.map((tz) => (
                    <SelectItem key={tz} value={tz}>
                      {tz.replace('_', ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </Field>
      </Section>

      {/* Section: Contact */}
      <Section icon={PhoneIcon} title="Contact">
        <Field
          id="phone"
          label={t('centers.phone')}
          error={form.formState.errors.phone?.message}
          required={isRequired('phone')}
          requiredLabel={requiredLabel}
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
                placeholder={t('centers.phonePlaceholder')}
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

        <Field
          id="email"
          label={t('centers.email')}
          error={form.formState.errors.email?.message}
          required={isRequired('email')}
          requiredLabel={requiredLabel}
        >
          <Input
            id="email"
            type="email"
            placeholder={t('centers.emailPlaceholder')}
            disabled={isSubmitting}
            {...form.register('email')}
          />
        </Field>

        <Field
          id="website"
          label={t('centers.website')}
          error={form.formState.errors.website?.message}
          required={isRequired('website')}
          requiredLabel={requiredLabel}
          full
        >
          <Input
            id="website"
            type="url"
            placeholder={t('centers.websitePlaceholder')}
            disabled={isSubmitting}
            {...form.register('website')}
          />
        </Field>
      </Section>

      {/* Server error (non-field) */}
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

      {/* Actions */}
      <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end pt-2 border-t" style={{ borderColor: 'var(--kc-border)' }}>
        {!hideCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={isSubmitting}
          >
            {t('centers.cancel')}
          </Button>
        )}
        <Button
          type="submit"
          disabled={isSubmitting || !form.formState.isDirty}
          title={
            !form.formState.isDirty && !isSubmitting
              ? t('centers.noChangesHint')
              : undefined
          }
        >
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isSubmitting
            ? t('centers.saving')
            : mode === 'create'
              ? t('centers.create')
              : t('centers.save')}
        </Button>
      </div>
    </form>
  );
}

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof Building2;
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
