'use client';

import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
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
import { FilterTabs } from '@/components/ui/filter-tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NameInput } from '@/components/ui/name-input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTranslation } from '@/lib/i18n';
import { ApiError } from '@/lib/api/client';
import { useUpdateMyEmergencyContact } from '@/lib/hooks/use-profile';
import { useUnsavedChangesPrompt } from '@/lib/hooks/use-unsaved-changes-prompt';
import { formatPhoneUS, parsePhoneDigits } from '@/lib/utils/phone';
import type { MyProfile } from '@/lib/api/auth';

// Profile v6 — primary + secondary emergency contacts editor. Single
// form with 6 fields (name/phone/relationship × 2) presented across
// two tabs. ONE submit button fires up to two PATCH calls (one per
// dirty contact) in parallel — last-write-wins per contact. The
// modal-wrapping dialog owns the unsaved-changes ConfirmDialog flow
// (X / ESC / outside-click / Cancel all route through handleOpenChange).
//
// `initialTab` lets the parent card deep-link the user onto whichever
// tab they were viewing when they clicked Edit/Add.
interface EmergencyContactModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: MyProfile;
  initialTab?: 1 | 2;
}

type ContactSlot = 1 | 2;

const RELATIONSHIP_VALUES = [
  'father',
  'mother',
  'spouse',
  'partner',
  'sibling',
  'friend',
  'other',
] as const;

// Shared shape per contact. Reused twice in the form schema so changes
// here automatically apply to both.
const contactShape = {
  name: z
    .string()
    .trim()
    .max(100, 'Name is too long')
    .optional()
    .or(z.literal('')),
  phone: z
    .string()
    .trim()
    .refine(
      (v) => v === '' || /^\+?1?\d{10,14}$/.test(parsePhoneDigits(v)),
      { message: 'Phone must be a valid US phone number' },
    )
    .optional()
    .or(z.literal('')),
  relationship: z
    .union([z.enum(RELATIONSHIP_VALUES), z.literal('')])
    .optional(),
};

const formSchema = z.object({
  c1Name: contactShape.name,
  c1Phone: contactShape.phone,
  c1Relationship: contactShape.relationship,
  c2Name: contactShape.name,
  c2Phone: contactShape.phone,
  c2Relationship: contactShape.relationship,
});

type FormValues = z.infer<typeof formSchema>;

function buildDefaults(profile: MyProfile): FormValues {
  return {
    c1Name: profile.emergencyContact1?.name ?? '',
    c1Phone: profile.emergencyContact1?.phone
      ? formatPhoneUS(profile.emergencyContact1.phone)
      : '',
    c1Relationship:
      (profile.emergencyContact1?.relationship as FormValues['c1Relationship']) ??
      '',
    c2Name: profile.emergencyContact2?.name ?? '',
    c2Phone: profile.emergencyContact2?.phone
      ? formatPhoneUS(profile.emergencyContact2.phone)
      : '',
    c2Relationship:
      (profile.emergencyContact2?.relationship as FormValues['c2Relationship']) ??
      '',
  };
}

export function EmergencyContactModal({
  open,
  onOpenChange,
  profile,
  initialTab = 1,
}: EmergencyContactModalProps) {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const mutation = useUpdateMyEmergencyContact();
  const [activeTab, setActiveTab] = useState<ContactSlot>(initialTab);
  const [isFormDirty, setIsFormDirty] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: buildDefaults(profile),
  });

  useEffect(() => {
    if (open) {
      form.reset(buildDefaults(profile));
      setActiveTab(initialTab);
    }
  }, [open, profile, form, initialTab]);

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

  // Submit strategy: compare each contact's form values against the
  // current profile snapshot and PATCH only the dirty contacts. If
  // both are dirty, both calls fire concurrently (Promise.all) for
  // speed; the backend writes atomically per slot. A successful run
  // closes the modal; a partial failure surfaces the error and leaves
  // the modal open so the user can retry.
  const onSubmit = async (data: FormValues) => {
    const c1Changed =
      data.c1Name !== (profile.emergencyContact1?.name ?? '') ||
      parsePhoneDigits(data.c1Phone ?? '') !==
        (profile.emergencyContact1?.phone ?? '') ||
      (data.c1Relationship ?? '') !==
        (profile.emergencyContact1?.relationship ?? '');
    const c2Changed =
      data.c2Name !== (profile.emergencyContact2?.name ?? '') ||
      parsePhoneDigits(data.c2Phone ?? '') !==
        (profile.emergencyContact2?.phone ?? '') ||
      (data.c2Relationship ?? '') !==
        (profile.emergencyContact2?.relationship ?? '');

    if (!c1Changed && !c2Changed) {
      // Nothing dirty after normalization — close cleanly.
      setIsFormDirty(false);
      onOpenChange(false);
      return;
    }

    const calls: Array<Promise<unknown>> = [];
    if (c1Changed) {
      calls.push(
        mutation.mutateAsync({
          slot: 1,
          name: data.c1Name ?? '',
          phone:
            data.c1Phone === undefined || data.c1Phone === ''
              ? ''
              : parsePhoneDigits(data.c1Phone),
          relationship: data.c1Relationship ?? '',
        }),
      );
    }
    if (c2Changed) {
      calls.push(
        mutation.mutateAsync({
          slot: 2,
          name: data.c2Name ?? '',
          phone:
            data.c2Phone === undefined || data.c2Phone === ''
              ? ''
              : parsePhoneDigits(data.c2Phone),
          relationship: data.c2Relationship ?? '',
        }),
      );
    }

    try {
      await Promise.all(calls);
      toast.success(t('profile.emergencyContactSavedToast'));
      setIsFormDirty(false);
      onOpenChange(false);
    } catch (err) {
      const msg =
        err instanceof ApiError && err.message
          ? err.message
          : t('profile.emergencyContactSaveError');
      toast.error(msg);
    }
  };

  const tabs: ReadonlyArray<{ value: ContactSlot; label: string }> = [
    { value: 1, label: t('profile.emergencyContact1Tab') },
    { value: 2, label: t('profile.emergencyContact2Tab') },
  ];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md [&>*]:min-w-0">
        <DialogHeader>
          <DialogTitle>{t('profile.emergencyContactEditTitle')}</DialogTitle>
          <DialogDescription>
            {t('profile.emergencyContactEditSubtitle')}
          </DialogDescription>
        </DialogHeader>

        <FilterTabs<ContactSlot>
          tabs={tabs}
          value={activeTab}
          onChange={setActiveTab}
          ariaLabel={t('profile.emergencyContactTitle')}
        />

        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-4"
          noValidate
          aria-busy={mutation.isPending}
        >
          {/* Both tab contents render conditionally — hiding the
              inactive tab keeps the DOM smaller and the focus order
              clean for keyboard users. Form state for the hidden tab
              still lives in the form so switching tabs preserves
              edits. */}
          {activeTab === 1 ? (
            <ContactFields prefix="c1" form={form} disabled={mutation.isPending} t={t} />
          ) : (
            <ContactFields prefix="c2" form={form} disabled={mutation.isPending} t={t} />
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={mutation.isPending}
            >
              {t('staff.cancel')}
            </Button>
            <Button type="submit" disabled={mutation.isPending || !isDirty}>
              {mutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {mutation.isPending ? t('staff.saving') : t('profile.save')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Per-tab field block. Generic over prefix so c1Name/c2Name etc.
// stay typed against the form schema. The `as const` template gives
// react-hook-form's `name` prop the exact union it needs.
function ContactFields({
  prefix,
  form,
  disabled,
  t,
}: {
  prefix: 'c1' | 'c2';
  form: ReturnType<typeof useForm<FormValues>>;
  disabled: boolean;
  t: (key: string) => string;
}) {
  const nameField = `${prefix}Name` as const;
  const phoneField = `${prefix}Phone` as const;
  const relField = `${prefix}Relationship` as const;
  const errors = form.formState.errors;
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor={nameField} className="text-sm font-medium">
          {t('staff.emergencyName')}
        </Label>
        <Controller
          control={form.control}
          name={nameField}
          render={({ field }) => (
            <NameInput
              id={nameField}
              placeholder={t('staff.emergencyNamePh')}
              disabled={disabled}
              value={field.value ?? ''}
              onChange={field.onChange}
              onBlur={field.onBlur}
              ref={field.ref}
              name={field.name}
            />
          )}
        />
        {errors[nameField] && (
          <p className="text-xs" style={{ color: 'var(--kc-error)' }}>
            {errors[nameField]?.message as string}
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={phoneField} className="text-sm font-medium">
          {t('staff.emergencyPhone')}
        </Label>
        <Controller
          control={form.control}
          name={phoneField}
          render={({ field }) => (
            <Input
              id={phoneField}
              type="tel"
              inputMode="tel"
              maxLength={14}
              placeholder="(415) 555-1234"
              disabled={disabled}
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
        {errors[phoneField] && (
          <p className="text-xs" style={{ color: 'var(--kc-error)' }}>
            {errors[phoneField]?.message as string}
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={relField} className="text-sm font-medium">
          {t('staff.emergencyRelationship')}
        </Label>
        <Controller
          control={form.control}
          name={relField}
          render={({ field }) => (
            <Select
              value={field.value ?? ''}
              onValueChange={(v) =>
                field.onChange(v as FormValues['c1Relationship'])
              }
              disabled={disabled}
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
      </div>
    </div>
  );
}
