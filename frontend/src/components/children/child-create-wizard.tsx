'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Baby,
  Briefcase,
  Cake,
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Home,
  Link2,
  Loader2,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Plus,
  Star,
  Tag,
  Trash2,
  User,
  Users,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { ReadCard } from '@/components/ui/section-frame';
import { ReadGrid, ReadRow } from '@/components/ui/read-view';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NameInput } from '@/components/ui/name-input';
import { NumericInput } from '@/components/ui/numeric-input';
import { PhoneInput } from '@/components/ui/phone-input';
import { SearchInput } from '@/components/ui/search-input';
import { Checkbox } from '@/components/ui/checkbox';
import { DateField } from '@/components/ui/date-field';
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { parsePhoneDigits } from '@/lib/utils/phone';
import { useCenterParents, useCreateChild } from '@/lib/hooks/use-children';
import { useUnsavedChangesPrompt } from '@/lib/hooks/use-unsaved-changes-prompt';
import { useTranslation } from '@/lib/i18n';
import { genderLabel, relationshipLabel } from '@/lib/format-child';
import { AddressFields, Field, emptyAddr } from './child-form-fields';
import type { Addr } from './child-form-fields';
import type {
  ChildParentPayload,
  CreateChildPayload,
} from '@/lib/api/children';
import { ApiError } from '@/lib/api/client';

const STEP_TITLE_KEYS = [
  'children.stepChild',
  'children.stepParents',
  'children.stepReview',
];
const STEP_COUNT = STEP_TITLE_KEYS.length;
const MAX_PARENTS = 3;
const GENDERS = [
  { value: 'MALE', labelKey: 'children.genderMale' },
  { value: 'FEMALE', labelKey: 'children.genderFemale' },
  { value: 'OTHER', labelKey: 'children.genderOther' },
];
const RELATIONSHIPS = [
  { value: 'MOTHER', labelKey: 'children.relMother' },
  { value: 'FATHER', labelKey: 'children.relFather' },
  { value: 'GUARDIAN', labelKey: 'children.relGuardian' },
  { value: 'OTHER', labelKey: 'children.relOther' },
];

// Addr / emptyAddr / Field / AddressFields / EditableList now live in
// ./child-form-fields (shared with the edit form).

interface ParentDraft {
  mode: 'new' | 'existing';
  parentId: string;
  firstName: string;
  middleName: string;
  lastName: string;
  email: string;
  phone: string;
  relationship: string;
  isPrimary: boolean;
  livesWithChild: boolean;
  sameAddressAsChild: boolean;
  home: Addr;
  showWork: boolean;
  workPhone: string;
  workEmployer: string;
  work: Addr;
}

interface ChildForm {
  firstName: string;
  middleName: string;
  lastName: string;
  birthDate: string;
  gender: string;
  address: Addr;
  admissionDate: string;
  firstCareDay: string;
  parents: ParentDraft[];
}

function newParent(isPrimary = false): ParentDraft {
  return {
    mode: 'new',
    parentId: '',
    firstName: '',
    middleName: '',
    lastName: '',
    email: '',
    phone: '',
    relationship: '',
    isPrimary,
    livesWithChild: true,
    sameAddressAsChild: true,
    home: emptyAddr(),
    showWork: false,
    workPhone: '',
    workEmployer: '',
    work: emptyAddr(),
  };
}

function emptyForm(): ChildForm {
  return {
    firstName: '',
    middleName: '',
    lastName: '',
    birthDate: '',
    gender: '',
    address: emptyAddr(),
    admissionDate: '',
    firstCareDay: '',
    parents: [newParent(true)],
  };
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phoneDigits = (v: string): string | undefined => parsePhoneDigits(v) || undefined;
const undef = (v: string): string | undefined => (v.trim() ? v.trim() : undefined);
const homeAddr = (a: Addr): Partial<ChildParentPayload> => ({
  homeAddressStreet: undef(a.street),
  homeAddressCity: undef(a.city),
  homeAddressState: undef(a.state),
  homeAddressZip: undef(a.zip),
});
const workAddr = (a: Addr): Partial<ChildParentPayload> => ({
  workAddressStreet: undef(a.street),
  workAddressCity: undef(a.city),
  workAddressState: undef(a.state),
  workAddressZip: undef(a.zip),
});

function parentHasData(p: ParentDraft): boolean {
  const addrFilled = (a: Addr) => !!(a.street || a.city || a.state || a.zip);
  return !!(
    p.firstName ||
    p.middleName ||
    p.lastName ||
    p.email ||
    p.phone ||
    p.relationship ||
    p.parentId ||
    p.workEmployer ||
    p.workPhone ||
    addrFilled(p.home) ||
    addrFilled(p.work)
  );
}

// Any meaningful field entered? The lone empty starter parent doesn't count —
// drives the unsaved-changes leave guard.
function isFormDirty(f: ChildForm): boolean {
  const addrFilled = (a: Addr) => !!(a.street || a.city || a.state || a.zip);
  return !!(
    f.firstName ||
    f.middleName ||
    f.lastName ||
    f.birthDate ||
    f.gender ||
    addrFilled(f.address) ||
    f.admissionDate ||
    f.firstCareDay ||
    f.parents.some(parentHasData)
  );
}

export function ChildCreateWizard({ centerId }: { centerId: string }) {
  const router = useRouter();
  const { t } = useTranslation();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<ChildForm>(emptyForm);
  const [touched, setTouched] = useState(false);
  const [removeIndex, setRemoveIndex] = useState<number | null>(null);
  const [confirmCreateOpen, setConfirmCreateOpen] = useState(false);
  const createMutation = useCreateChild();

  // Leave guard — covers sidebar links, the page back link, and browser
  // refresh/close (the canonical SAAS hook). Only active when there's data.
  const isDirty = useMemo(() => isFormDirty(form), [form]);
  useUnsavedChangesPrompt(isDirty, t('children.unsavedLeaveWizard'));

  // Jump straight to a step from the Review edit buttons.
  const goToStep = (s: number) => {
    setTouched(false);
    setStep(s);
  };

  // Today (local YYYY-MM-DD) — the latest valid / selectable birth date.
  const todayStr = new Date().toLocaleDateString('en-CA');

  // Existing parents to link = distinct parents already on this center
  // (dedicated endpoint; replaces the old full-roster harvest).
  const { data: existingParents = [] } = useCenterParents(centerId);

  const set = <K extends keyof ChildForm>(key: K, value: ChildForm[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const setParent = (i: number, patch: Partial<ParentDraft>) =>
    setForm((f) => ({
      ...f,
      parents: f.parents.map((p, idx) => (idx === i ? { ...p, ...patch } : p)),
    }));

  const setPrimary = (i: number) =>
    setForm((f) => ({
      ...f,
      parents: f.parents.map((p, idx) => ({ ...p, isPrimary: idx === i })),
    }));

  const addParent = () => {
    if (form.parents.length >= MAX_PARENTS) return;
    setForm((f) => ({ ...f, parents: [...f.parents, newParent(false)] }));
  };

  const doRemoveParent = (i: number) =>
    setForm((f) => {
      const next = f.parents.filter((_, idx) => idx !== i);
      if (!next.some((p) => p.isPrimary) && next[0]) next[0].isPrimary = true;
      return { ...f, parents: next };
    });

  // Confirm before removing a parent card that already has data; remove empty
  // cards directly (same AlertDialog pattern as DeleteStaffDialog).
  const requestRemoveParent = (i: number) => {
    if (parentHasData(form.parents[i])) setRemoveIndex(i);
    else doRemoveParent(i);
  };

  const stepErrors = (s: number): string[] => {
    const errs: string[] = [];
    if (s === 1) {
      if (!form.firstName.trim()) errs.push(t('children.errFirstNameRequired'));
      if (!form.lastName.trim()) errs.push(t('children.errLastNameRequired'));
      if (!form.birthDate) errs.push(t('children.errBirthDateRequired'));
      else if (form.birthDate > todayStr) errs.push(t('children.errBirthDateFuture'));
      if (!form.gender) errs.push(t('children.errGenderRequired'));
    }
    if (s === 2) {
      if (form.parents.length === 0) errs.push(t('children.errAtLeastOneParent'));
      form.parents.forEach((p, idx) => {
        const tag = `${t('children.parentWord')} ${idx + 1}`;
        if (!p.relationship) errs.push(`${tag}: ${t('children.errRelationshipRequired')}`);
        if (p.mode === 'existing') {
          if (!p.parentId) errs.push(`${tag}: ${t('children.errPickExisting')}`);
        } else {
          if (!p.firstName.trim()) errs.push(`${tag}: ${t('children.errFirstNameRequired')}`);
          if (!p.lastName.trim()) errs.push(`${tag}: ${t('children.errLastNameRequired')}`);
          if (!EMAIL_RE.test(p.email.trim())) errs.push(`${tag}: ${t('children.errEmailRequired')}`);
          if (!parsePhoneDigits(p.phone)) errs.push(`${tag}: ${t('children.errPhoneRequired')}`);
        }
      });
      if (form.parents.length > 0 && !form.parents.some((p) => p.isPrimary)) {
        errs.push(t('children.errMarkPrimary'));
      }
    }
    return errs;
  };

  const currentErrors = stepErrors(step);

  const next = () => {
    if (currentErrors.length > 0) {
      setTouched(true);
      return;
    }
    setTouched(false);
    setStep((s) => Math.min(STEP_COUNT, s + 1));
  };
  const prev = () => {
    setTouched(false);
    setStep((s) => Math.max(1, s - 1));
  };

  const buildPayload = (): CreateChildPayload => {
    const parents: ChildParentPayload[] = form.parents.map((p) => {
      const base: ChildParentPayload = {
        relationship: p.relationship,
        isPrimary: p.isPrimary,
        livesWithChild: p.livesWithChild,
      };
      if (p.mode === 'existing') return { ...base, parentId: p.parentId };
      const home = p.sameAddressAsChild ? homeAddr(form.address) : homeAddr(p.home);
      const work = p.showWork
        ? { workPhone: phoneDigits(p.workPhone), workEmployer: undef(p.workEmployer), ...workAddr(p.work) }
        : {};
      return {
        ...base,
        firstName: p.firstName.trim(),
        middleName: undef(p.middleName),
        lastName: p.lastName.trim(),
        email: p.email.trim(),
        homePhone: phoneDigits(p.phone),
        ...home,
        ...work,
      };
    });

    const payload: CreateChildPayload = {
      firstName: form.firstName.trim(),
      middleName: undef(form.middleName),
      lastName: form.lastName.trim(),
      dateOfBirth: form.birthDate,
      gender: form.gender,
      addressStreet: undef(form.address.street),
      addressCity: undef(form.address.city),
      addressState: undef(form.address.state),
      addressZip: undef(form.address.zip),
      admissionDate: form.admissionDate || undefined,
      firstCareDay: form.firstCareDay || undefined,
      parents,
    };

    // Medical is no longer collected in the wizard — it's filled later from the
    // edit form's Medical tab. The create endpoint makes an empty record.
    return payload;
  };

  const submit = async () => {
    const blocking = [...stepErrors(1), ...stepErrors(2)];
    if (blocking.length > 0) {
      toast.error(blocking[0]);
      return;
    }
    const payload = buildPayload();
    try {
      const child = await createMutation.mutateAsync({ centerId, payload });
      toast.success(t('children.toastCreated'));
      router.push(`/children/${child.id}`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t('children.toastCreateFailed'));
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <ProgressBar step={step} />

      {step === 1 && <StepChild form={form} set={set} showErrors={touched} errors={currentErrors} today={todayStr} />}
      {step === 2 && (
        <StepParents
          form={form}
          setParent={setParent}
          setPrimary={setPrimary}
          addParent={addParent}
          requestRemoveParent={requestRemoveParent}
          existingParents={existingParents}
          showErrors={touched}
          errors={currentErrors}
        />
      )}
      {step === 3 && <StepReview form={form} existingParents={existingParents} goToStep={goToStep} />}

      <div className="flex items-center justify-between gap-2">
        {/* Cancel is a Link → the unsaved-changes hook intercepts it when the
            form is dirty (branded confirm); clean form navigates straight. */}
        <Button asChild variant="ghost">
          <Link href="/children">{t('children.cancel')}</Link>
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={prev} disabled={step === 1}>
            <ChevronLeft className="mr-1.5 h-4 w-4" />
            {t('children.previous')}
          </Button>
          {step < STEP_COUNT ? (
            <Button onClick={next}>
              {t('children.next')}
              <ChevronRight className="ml-1.5 h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={() => setConfirmCreateOpen(true)} disabled={createMutation.isPending}>
              {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('children.createChild')}
            </Button>
          )}
        </div>
      </div>

      {/* Remove-parent confirmation (only for cards with data). */}
      <AlertDialog open={removeIndex !== null} onOpenChange={(o) => !o && setRemoveIndex(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('children.removeParentTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('children.removeParentDescWizard')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('children.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                if (removeIndex !== null) doRemoveParent(removeIndex);
                setRemoveIndex(null);
              }}
              style={{ background: 'var(--kc-error)', color: 'white' }}
            >
              {t('children.remove')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirm before creating the child. */}
      <AlertDialog open={confirmCreateOpen} onOpenChange={setConfirmCreateOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('children.createTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('children.createDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={createMutation.isPending}>
              {t('children.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                setConfirmCreateOpen(false);
                void submit();
              }}
            >
              {t('children.create')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ───────────────────────────────────────────── progress + shared bits

function ProgressBar({ step }: { step: number }) {
  const { t } = useTranslation();
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium" style={{ color: 'var(--kc-text-1)' }}>
          {t('children.stepXofY').replace('{n}', String(step))}
        </span>
        <span style={{ color: 'var(--kc-text-3)' }}>{t(STEP_TITLE_KEYS[step - 1])}</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full" style={{ background: 'var(--kc-surface-2)' }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${(step / STEP_COUNT) * 100}%`, background: 'var(--kc-p-600)' }} />
      </div>
    </div>
  );
}

function ErrorList({ errors, show }: { errors: string[]; show: boolean }) {
  if (!show || errors.length === 0) return null;
  return (
    <ul
      className="rounded-lg border p-3 text-sm"
      style={{
        background: 'var(--kc-error-bg)',
        borderColor: 'color-mix(in oklch, var(--kc-error), transparent 70%)',
        color: 'var(--kc-error)',
      }}
    >
      {errors.map((e) => (
        <li key={e}>• {e}</li>
      ))}
    </ul>
  );
}

// ───────────────────────────────────────────── Step 1: Child

// Wizard-only Step-1 address: Street (full row) + City / State / ZIP on ONE row
// (3 cols on sm+, stacked on mobile). The shared AddressFields keeps the global
// Street / City / State+ZIP layout untouched (parent home/work + edit form).
function ChildStep1Address({
  value,
  onChange,
}: {
  value: Addr;
  onChange: (field: keyof Addr, v: string) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="space-y-4">
      <Field icon={MapPin} label={t('centers.street')}>
        <Input
          value={value.street}
          onChange={(e) => onChange('street', e.target.value)}
          placeholder="123 Main St"
        />
      </Field>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field icon={MapPin} label={t('centers.city')}>
          <NameInput value={value.city} onChange={(v) => onChange('city', v)} placeholder="San Francisco" />
        </Field>
        <Field icon={MapPin} label={t('centers.state')}>
          <Input
            value={value.state}
            onChange={(e) => onChange('state', e.target.value.toUpperCase())}
            maxLength={2}
            placeholder="CA"
          />
        </Field>
        <Field icon={MapPin} label={t('centers.zipCode')}>
          <NumericInput value={value.zip} onChange={(v) => onChange('zip', v)} maxLength={5} placeholder="94102" />
        </Field>
      </div>
    </div>
  );
}

function StepChild({
  form,
  set,
  showErrors,
  errors,
  today,
}: {
  form: ChildForm;
  set: <K extends keyof ChildForm>(k: K, v: ChildForm[K]) => void;
  showErrors: boolean;
  errors: string[];
  today: string;
}) {
  const { t } = useTranslation();
  return (
    <ReadCard icon={Baby} title={t('children.childDetails')}>
      <div className="space-y-4">
        <ErrorList errors={errors} show={showErrors} />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field icon={User} label={t('children.firstName')} required>
            <NameInput value={form.firstName} onChange={(v) => set('firstName', v)} />
          </Field>
          <Field icon={User} label={t('children.middleName')}>
            <NameInput value={form.middleName} onChange={(v) => set('middleName', v)} />
          </Field>
          <Field icon={User} label={t('children.lastName')} required>
            <NameInput value={form.lastName} onChange={(v) => set('lastName', v)} />
          </Field>
          <Field icon={Cake} label={t('children.birthDate')} required>
            <DateField value={form.birthDate} onChange={(e) => set('birthDate', e.target.value)} max={today} />
          </Field>
          <Field icon={Users} label={t('children.gender')} required>
            <Select value={form.gender} onValueChange={(v) => set('gender', v)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t('children.selectPlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                {GENDERS.map((g) => (
                  <SelectItem key={g.value} value={g.value}>
                    {t(g.labelKey)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>

        {/* Child's address — visually grouped sub-block (the base address). */}
        <div className="rounded-lg p-4 space-y-4" style={{ background: 'var(--kc-surface-2)' }}>
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--kc-text-3)' }}>
            {t('children.childsAddress')}
          </p>
          <ChildStep1Address value={form.address} onChange={(field, v) => set('address', { ...form.address, [field]: v })} />
        </div>

        {/* The two care dates share one row (stacked on mobile). */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field icon={Calendar} label={t('children.admissionDate')}>
            <DateField value={form.admissionDate} onChange={(e) => set('admissionDate', e.target.value)} />
          </Field>
          <Field icon={Clock} label={t('children.firstDayOfCare')}>
            <DateField value={form.firstCareDay} onChange={(e) => set('firstCareDay', e.target.value)} />
          </Field>
        </div>
        <p className="text-xs" style={{ color: 'var(--kc-text-3)' }}>
          {t('children.enrollmentStartsAs')}{' '}
          <strong>{t('children.statusPending')}</strong>.
        </p>
      </div>
    </ReadCard>
  );
}

// ───────────────────────────────────────────── Step 2: Parents

function StepParents({
  form,
  setParent,
  setPrimary,
  addParent,
  requestRemoveParent,
  existingParents,
  showErrors,
  errors,
}: {
  form: ChildForm;
  setParent: (i: number, patch: Partial<ParentDraft>) => void;
  setPrimary: (i: number) => void;
  addParent: () => void;
  requestRemoveParent: (i: number) => void;
  existingParents: Array<{ id: string; name: string; email: string }>;
  showErrors: boolean;
  errors: string[];
}) {
  const { t } = useTranslation();
  return (
    <ReadCard icon={Users} title={t('children.parentsGuardians')}>
      <div className="space-y-4">
        <ErrorList errors={errors} show={showErrors} />
        {form.parents.map((p, i) => (
          <ParentCard
            key={i}
            index={i}
            parent={p}
            existingParents={existingParents}
            canRemove={form.parents.length > 1}
            onChange={(patch) => setParent(i, patch)}
            onPrimary={() => setPrimary(i)}
            onRemove={() => requestRemoveParent(i)}
          />
        ))}
        {form.parents.length < MAX_PARENTS && (
          <Button variant="outline" onClick={addParent} className="w-full">
            <Plus className="mr-1.5 h-4 w-4" />
            {t('children.addAnotherParent')}
          </Button>
        )}
      </div>
    </ReadCard>
  );
}

function ParentCard({
  index,
  parent,
  existingParents,
  canRemove,
  onChange,
  onPrimary,
  onRemove,
}: {
  index: number;
  parent: ParentDraft;
  existingParents: Array<{ id: string; name: string; email: string }>;
  canRemove: boolean;
  onChange: (patch: Partial<ParentDraft>) => void;
  onPrimary: () => void;
  onRemove: () => void;
}) {
  const { t } = useTranslation();
  const [exSearch, setExSearch] = useState('');
  const selected = existingParents.find((e) => e.id === parent.parentId);
  const filtered = useMemo(() => {
    const q = exSearch.trim().toLowerCase();
    const list = q
      ? existingParents.filter((e) => `${e.name} ${e.email}`.toLowerCase().includes(q))
      : existingParents;
    return list.slice(0, 6);
  }, [exSearch, existingParents]);

  return (
    <div className="rounded-lg border p-4 space-y-4" style={{ borderColor: 'var(--kc-border)' }}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold" style={{ color: 'var(--kc-text-1)' }}>
          {t('children.parentWord')} {index + 1}
        </span>
        {canRemove && (
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onRemove} aria-label={t('children.removeParentAria')}>
            <Trash2 className="h-3.5 w-3.5" style={{ color: 'var(--kc-error)' }} />
          </Button>
        )}
      </div>

      <div className="flex gap-2">
        <Button variant={parent.mode === 'new' ? 'default' : 'outline'} size="sm" onClick={() => onChange({ mode: 'new' })}>
          {t('children.newParentBtn')}
        </Button>
        <Button
          variant={parent.mode === 'existing' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onChange({ mode: 'existing' })}
          disabled={existingParents.length === 0}
        >
          {t('children.linkExisting')}
        </Button>
      </div>

      {parent.mode === 'existing' ? (
        <Field icon={User} label={t('children.existingParent')} required>
          {selected ? (
            <div className="flex items-center justify-between gap-3 rounded-md border p-2.5" style={{ borderColor: 'var(--kc-border)' }}>
              <span className="min-w-0 text-sm">
                <span className="font-medium" style={{ color: 'var(--kc-text-1)' }}>{selected.name}</span>
                <span className="ml-1 break-all" style={{ color: 'var(--kc-text-3)' }}>· {selected.email}</span>
              </span>
              <Button variant="ghost" size="sm" onClick={() => onChange({ parentId: '' })}>{t('children.change')}</Button>
            </div>
          ) : (
            <div className="space-y-2">
              <SearchInput value={exSearch} onChange={setExSearch} placeholder={t('children.searchByNameOrEmail')} ariaLabel={t('children.searchExistingParentsAria')} />
              <div className="rounded-md border divide-y" style={{ borderColor: 'var(--kc-border)' }}>
                {filtered.length === 0 ? (
                  <p className="p-3 text-sm" style={{ color: 'var(--kc-text-3)' }}>{t('children.noMatchingParents')}</p>
                ) : (
                  filtered.map((ep) => (
                    <button
                      key={ep.id}
                      type="button"
                      onClick={() => onChange({ parentId: ep.id })}
                      className="block w-full px-3 py-2 text-left text-sm transition-colors hover:bg-[var(--kc-surface-2)]"
                    >
                      <span className="font-medium" style={{ color: 'var(--kc-text-1)' }}>{ep.name}</span>
                      <span className="ml-1 break-all" style={{ color: 'var(--kc-text-3)' }}>· {ep.email}</span>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </Field>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field icon={User} label={t('children.firstName')} required>
              <NameInput value={parent.firstName} onChange={(v) => onChange({ firstName: v })} />
            </Field>
            <Field icon={User} label={t('children.middleName')}>
              <NameInput value={parent.middleName} onChange={(v) => onChange({ middleName: v })} />
            </Field>
            <Field icon={User} label={t('children.lastName')} required>
              <NameInput value={parent.lastName} onChange={(v) => onChange({ lastName: v })} />
            </Field>
            <Field icon={Phone} label={t('children.phone')} required>
              <PhoneInput value={parent.phone} onChange={(v) => onChange({ phone: v })} />
            </Field>
            <Field icon={Mail} label={t('children.email')} required className="sm:col-span-2">
              <Input type="email" value={parent.email} onChange={(e) => onChange({ email: e.target.value })} />
            </Field>
          </div>
          {/* Primary-contact toggle sits with the phone — it's the single
              control that sets ChildParent.isPrimary (radio across parents). */}
          <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: 'var(--kc-text-2)' }}>
            <Checkbox checked={parent.isPrimary} onCheckedChange={() => onPrimary()} />
            {t('children.primaryContact')}
          </label>
          <p className="text-xs" style={{ color: 'var(--kc-text-3)' }}>
            {t('children.welcomeEmailHint')}
          </p>
        </>
      )}

      <Field icon={Link2} label={t('children.relationship')} required className="sm:max-w-xs">
        <Select value={parent.relationship} onValueChange={(v) => onChange({ relationship: v })}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder={t('children.selectPlaceholder')} />
          </SelectTrigger>
          <SelectContent>
            {RELATIONSHIPS.map((r) => (
              <SelectItem key={r.value} value={r.value}>{t(r.labelKey)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <div className="flex flex-wrap gap-4">
        {/* Existing-parent mode has no phone field, so the primary-contact
            toggle lives here instead (still the same single control). */}
        {parent.mode === 'existing' && (
          <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: 'var(--kc-text-2)' }}>
            <Checkbox checked={parent.isPrimary} onCheckedChange={() => onPrimary()} />
            {t('children.primaryContact')}
          </label>
        )}
        <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: 'var(--kc-text-2)' }}>
          <Checkbox checked={parent.livesWithChild} onCheckedChange={(c) => onChange({ livesWithChild: c === true })} />
          {t('children.livesWithChild')}
        </label>
      </div>

      {parent.mode === 'new' && (
        <>
          <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: 'var(--kc-text-2)' }}>
            <Checkbox checked={parent.sameAddressAsChild} onCheckedChange={(c) => onChange({ sameAddressAsChild: c === true })} />
            {t('children.sameAddressAsChild')}
          </label>

          {!parent.sameAddressAsChild && (
            <div className="rounded-lg p-4" style={{ background: 'var(--kc-surface-2)' }}>
              <AddressFields value={parent.home} onChange={(field, v) => onChange({ home: { ...parent.home, [field]: v } })} />
            </div>
          )}

          <Collapsible open={parent.showWork} onOpenChange={(o) => onChange({ showWork: o })}>
            <CollapsibleTrigger className="flex items-center gap-1.5 text-sm font-medium" style={{ color: 'var(--kc-p-600)' }}>
              <ChevronDown className={cn('h-4 w-4 transition-transform', parent.showWork && 'rotate-180')} />
              {t('children.workDetailsOptional')}
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 pt-3">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field icon={Briefcase} label={t('children.employer')}>
                  <NameInput value={parent.workEmployer} onChange={(v) => onChange({ workEmployer: v })} />
                </Field>
                <Field icon={Briefcase} label={t('children.workPhone')}>
                  <PhoneInput value={parent.workPhone} onChange={(v) => onChange({ workPhone: v })} />
                </Field>
              </div>
              <AddressFields value={parent.work} onChange={(field, v) => onChange({ work: { ...parent.work, [field]: v } })} />
            </CollapsibleContent>
          </Collapsible>
        </>
      )}
    </div>
  );
}

// ───────────────────────────────────────────── Step 3: Review

// Empty = empty (global rule) — no placeholder dash for unfilled review fields.
const dash = (v?: string | null) => (v && v.trim() ? v : '');
const addrStr = (a: Addr) => [a.street, a.city, a.state, a.zip].filter(Boolean).join(', ');

// Full review — every field, filled OR empty (empty shows "—"), grouped into
// Child / Parents / Medical sections so the user sees everything before saving.
function StepReview({
  form,
  existingParents,
  goToStep,
}: {
  form: ChildForm;
  existingParents: Array<{ id: string; name: string; email: string }>;
  goToStep: (step: number) => void;
}) {
  const { t } = useTranslation();
  const childName = [form.firstName, form.middleName, form.lastName].filter(Boolean).join(' ');

  return (
    <div className="space-y-4">
      <ReadCard icon={Baby} title={t('children.stepChild')} action={<EditButton label={t('children.editChildAria')} onClick={() => goToStep(1)} />}>
        <ReadGrid>
          <ReadRow icon={User} label={t('children.colName')} value={dash(childName)} />
          <ReadRow icon={Cake} label={t('children.birthDate')} value={dash(form.birthDate)} />
          <ReadRow icon={Users} label={t('children.gender')} value={form.gender ? genderLabel(form.gender, t) : ''} />
          <ReadRow icon={Tag} label={t('children.enrollmentStatus')} value={t('children.statusPending')} />
          <ReadRow icon={MapPin} label={t('children.address')} value={addrStr(form.address)} full />
          <ReadRow icon={Calendar} label={t('children.admissionDate')} value={dash(form.admissionDate)} />
          <ReadRow icon={Clock} label={t('children.firstDayOfCare')} value={dash(form.firstCareDay)} />
        </ReadGrid>
      </ReadCard>

      <ReadCard icon={Users} title={`${t('children.colParents')} (${form.parents.length})`}>
        <div className="space-y-4">
          {form.parents.map((p, i) => {
            const existing = p.mode === 'existing' ? existingParents.find((e) => e.id === p.parentId) : undefined;
            const rawName =
              p.mode === 'existing'
                ? existing?.name ?? ''
                : [p.firstName, p.middleName, p.lastName].filter(Boolean).join(' ').trim();
            return (
              <div key={i} className="rounded-lg border p-4" style={{ borderColor: 'var(--kc-border)' }}>
                {/* Header = just the "Parent N" index + edit. Name is a labeled
                    FULL NAME row below (consistent with the other fields). */}
                <div className="mb-3 flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--kc-text-3)' }}>
                    {t('children.parentWord')} {i + 1}
                  </span>
                  <EditButton label={t('children.editParentsAria')} onClick={() => goToStep(2)} />
                </div>
                <ReadGrid>
                  <ReadRow icon={User} label={t('children.fullName')} value={dash(rawName)} full />
                  <ReadRow icon={Tag} label={t('children.type')} value={p.mode === 'existing' ? t('children.existingParent') : t('children.newParentBtn')} />
                  <ReadRow icon={Link2} label={t('children.relationship')} value={p.relationship ? relationshipLabel(p.relationship, t) : ''} />
                  <ReadRow icon={Star} label={t('children.primaryContact')} value={p.isPrimary ? t('children.yes') : t('children.no')} />
                  <ReadRow icon={Home} label={t('children.livesWithChild')} value={p.livesWithChild ? t('children.yes') : t('children.no')} />
                  {p.mode === 'existing' ? (
                    <ReadRow icon={Mail} label={t('children.email')} value={dash(existing?.email)} full />
                  ) : (
                    <>
                      <ReadRow icon={Mail} label={t('children.email')} value={dash(p.email)} />
                      <ReadRow icon={Phone} label={t('children.phone')} value={dash(p.phone)} />
                      <ReadRow
                        icon={MapPin}
                        label={t('children.homeAddress')}
                        value={p.sameAddressAsChild ? t('children.sameAsChild') : addrStr(p.home)}
                        full
                      />
                      <ReadRow icon={Briefcase} label={t('children.employer')} value={dash(p.workEmployer)} />
                      <ReadRow icon={Briefcase} label={t('children.workPhone')} value={dash(p.workPhone)} />
                      <ReadRow icon={MapPin} label={t('children.workAddress')} value={addrStr(p.work)} full />
                    </>
                  )}
                </ReadGrid>
              </div>
            );
          })}
        </div>
      </ReadCard>
    </div>
  );
}

function EditButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClick} aria-label={label}>
      <Pencil className="h-3.5 w-3.5" />
    </Button>
  );
}
