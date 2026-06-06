'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Baby,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  HeartPulse,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { CardWithHeader } from '@/components/ui/card-with-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NameInput } from '@/components/ui/name-input';
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
import { useCenterChildren, useCreateChild } from '@/lib/hooks/use-children';
import { useUnsavedChangesPrompt } from '@/lib/hooks/use-unsaved-changes-prompt';
import { relationshipLabel } from '@/lib/format-child';
import {
  AddressFields,
  EditableList,
  Field,
  emptyAddr,
} from './child-form-fields';
import type { Addr } from './child-form-fields';
import type {
  ChildParentPayload,
  CreateChildPayload,
  MedicalInfoPayload,
} from '@/lib/api/children';
import { ApiError } from '@/lib/api/client';

const STEP_TITLES = ['Child', 'Parents', 'Medical', 'Review'];
const MAX_PARENTS = 3;
const GENDERS = [
  { value: 'MALE', label: 'Male' },
  { value: 'FEMALE', label: 'Female' },
  { value: 'OTHER', label: 'Other' },
];
const RELATIONSHIPS = [
  { value: 'MOTHER', label: 'Mother' },
  { value: 'FATHER', label: 'Father' },
  { value: 'GUARDIAN', label: 'Guardian' },
  { value: 'OTHER', label: 'Other' },
];

// Addr / emptyAddr / Field / AddressFields / EditableList now live in
// ./child-form-fields (shared with the edit form).

interface ParentDraft {
  mode: 'new' | 'existing';
  parentId: string;
  fullName: string;
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
  doctorName: string;
  doctorPhone: string;
  doctorAddress: Addr;
  allergies: string[];
  medicationAllergies: string[];
  medications: string[];
  medicalPlan: string;
  hasSpecialNeeds: boolean;
}

function newParent(isPrimary = false): ParentDraft {
  return {
    mode: 'new',
    parentId: '',
    fullName: '',
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
    doctorName: '',
    doctorPhone: '',
    doctorAddress: emptyAddr(),
    allergies: [],
    medicationAllergies: [],
    medications: [],
    medicalPlan: '',
    hasSpecialNeeds: false,
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
    p.fullName ||
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
    f.doctorName ||
    f.doctorPhone ||
    addrFilled(f.doctorAddress) ||
    f.allergies.length ||
    f.medicationAllergies.length ||
    f.medications.length ||
    f.medicalPlan ||
    f.hasSpecialNeeds ||
    f.parents.some(parentHasData)
  );
}

export function ChildCreateWizard({ centerId }: { centerId: string }) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<ChildForm>(emptyForm);
  const [touched, setTouched] = useState(false);
  const [removeIndex, setRemoveIndex] = useState<number | null>(null);
  const [confirmCreateOpen, setConfirmCreateOpen] = useState(false);
  const createMutation = useCreateChild();

  // Leave guard — covers sidebar links, the page back link, and browser
  // refresh/close (the canonical SAAS hook). Only active when there's data.
  const isDirty = useMemo(() => isFormDirty(form), [form]);
  useUnsavedChangesPrompt(
    isDirty,
    'You have unsaved changes. Leaving will discard the information entered.',
  );

  // Jump straight to a step from the Review edit buttons.
  const goToStep = (s: number) => {
    setTouched(false);
    setStep(s);
  };

  // Today (local YYYY-MM-DD) — the latest valid / selectable birth date.
  const todayStr = new Date().toLocaleDateString('en-CA');

  // Existing parents to link = unique parents already on this center's roster
  // (no dedicated parent-search endpoint in Fase 1).
  const { data: roster } = useCenterChildren(centerId);
  const existingParents = useMemo(() => {
    const map = new Map<string, { id: string; name: string; email: string }>();
    for (const child of roster ?? []) {
      for (const link of child.childParents ?? []) {
        if (!map.has(link.parent.id)) {
          map.set(link.parent.id, {
            id: link.parent.id,
            name: `${link.parent.firstName} ${link.parent.lastName}`,
            email: link.parent.email,
          });
        }
      }
    }
    return [...map.values()];
  }, [roster]);

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
      if (!form.firstName.trim()) errs.push('First name is required.');
      if (!form.lastName.trim()) errs.push('Last name is required.');
      if (!form.birthDate) errs.push('Birth date is required.');
      else if (form.birthDate > todayStr) errs.push('Birth date cannot be in the future.');
      if (!form.gender) errs.push('Gender is required.');
    }
    if (s === 2) {
      if (form.parents.length === 0) errs.push('At least one parent is required.');
      form.parents.forEach((p, idx) => {
        const tag = `Parent ${idx + 1}`;
        if (!p.relationship) errs.push(`${tag}: relationship is required.`);
        if (p.mode === 'existing') {
          if (!p.parentId) errs.push(`${tag}: pick an existing parent.`);
        } else {
          const parts = p.fullName.trim().split(/\s+/).filter(Boolean);
          if (parts.length < 2) errs.push(`${tag}: full name (first and last) is required.`);
          if (!EMAIL_RE.test(p.email.trim())) errs.push(`${tag}: a valid email is required.`);
        }
      });
      if (form.parents.length > 0 && !form.parents.some((p) => p.isPrimary)) {
        errs.push('Mark one parent as primary.');
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
    setStep((s) => Math.min(4, s + 1));
  };
  const prev = () => {
    setTouched(false);
    setStep((s) => Math.max(1, s - 1));
  };

  const buildPayload = (): { payload: CreateChildPayload; medical: MedicalInfoPayload } => {
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
      // Single "Full name" field → split into first / last for the backend
      // (validated to have >= 2 words in stepErrors).
      const nameParts = p.fullName.trim().split(/\s+/).filter(Boolean);
      return {
        ...base,
        firstName: nameParts[0] ?? '',
        lastName: nameParts.slice(1).join(' '),
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

    const medical: MedicalInfoPayload = {
      allergies: form.allergies,
      medications: form.medications,
      doctorName: undef(form.doctorName),
      doctorPhone: phoneDigits(form.doctorPhone),
      doctorAddress: undef(
        [form.doctorAddress.street, form.doctorAddress.city, form.doctorAddress.state, form.doctorAddress.zip]
          .filter(Boolean)
          .join(' '),
      ),
      medicationAllergies: form.medicationAllergies.length
        ? form.medicationAllergies.join(', ')
        : undefined,
      medicalPlan: undef(form.medicalPlan),
      hasSpecialNeeds: form.hasSpecialNeeds,
    };
    return { payload, medical };
  };

  const submit = async () => {
    const blocking = [...stepErrors(1), ...stepErrors(2)];
    if (blocking.length > 0) {
      toast.error(blocking[0]);
      return;
    }
    const { payload, medical } = buildPayload();
    try {
      const child = await createMutation.mutateAsync({ centerId, payload, medical });
      toast.success('Child created');
      router.push(`/children/${child.id}`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to create child');
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
      {step === 3 && <StepMedical form={form} set={set} />}
      {step === 4 && <StepReview form={form} existingParents={existingParents} goToStep={goToStep} />}

      <div className="flex items-center justify-between gap-2">
        {/* Cancel is a Link → the unsaved-changes hook intercepts it when the
            form is dirty (branded confirm); clean form navigates straight. */}
        <Button asChild variant="ghost">
          <Link href="/children">Cancel</Link>
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={prev} disabled={step === 1}>
            <ChevronLeft className="mr-1.5 h-4 w-4" />
            Previous
          </Button>
          {step < 4 ? (
            <Button onClick={next}>
              Next
              <ChevronRight className="ml-1.5 h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={() => setConfirmCreateOpen(true)} disabled={createMutation.isPending}>
              {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create child
            </Button>
          )}
        </div>
      </div>

      {/* Remove-parent confirmation (only for cards with data). */}
      <AlertDialog open={removeIndex !== null} onOpenChange={(o) => !o && setRemoveIndex(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this parent?</AlertDialogTitle>
            <AlertDialogDescription>
              This parent has details entered. Removing the card discards them.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                if (removeIndex !== null) doRemoveParent(removeIndex);
                setRemoveIndex(null);
              }}
              style={{ background: 'var(--kc-error)', color: 'white' }}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirm before creating the child. */}
      <AlertDialog open={confirmCreateOpen} onOpenChange={setConfirmCreateOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Create this child?</AlertDialogTitle>
            <AlertDialogDescription>
              Create this child with the information you entered?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={createMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                setConfirmCreateOpen(false);
                void submit();
              }}
            >
              Create
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ───────────────────────────────────────────── progress + shared bits

function ProgressBar({ step }: { step: number }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium" style={{ color: 'var(--kc-text-1)' }}>
          Step {step} of 4
        </span>
        <span style={{ color: 'var(--kc-text-3)' }}>{STEP_TITLES[step - 1]}</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full" style={{ background: 'var(--kc-surface-2)' }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${(step / 4) * 100}%`, background: 'var(--kc-p-600)' }} />
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
  return (
    <CardWithHeader title="Child details">
      <div className="space-y-4">
        <ErrorList errors={errors} show={showErrors} />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="First name" required>
            <NameInput value={form.firstName} onChange={(v) => set('firstName', v)} />
          </Field>
          <Field label="Middle name">
            <NameInput value={form.middleName} onChange={(v) => set('middleName', v)} />
          </Field>
          <Field label="Last name" required>
            <NameInput value={form.lastName} onChange={(v) => set('lastName', v)} />
          </Field>
          <Field label="Birth date" required>
            <DateField value={form.birthDate} onChange={(e) => set('birthDate', e.target.value)} max={today} />
          </Field>
          <Field label="Gender" required>
            <Select value={form.gender} onValueChange={(v) => set('gender', v)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select…" />
              </SelectTrigger>
              <SelectContent>
                {GENDERS.map((g) => (
                  <SelectItem key={g.value} value={g.value}>
                    {g.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>

        {/* Child's address — visually grouped sub-block (the base address). */}
        <div className="rounded-lg p-4 space-y-4" style={{ background: 'var(--kc-surface-2)' }}>
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--kc-text-3)' }}>
            Child&apos;s address
          </p>
          <AddressFields value={form.address} onChange={(field, v) => set('address', { ...form.address, [field]: v })} />
        </div>

        {/* The two care dates share one row (stacked on mobile). */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Admission date">
            <DateField value={form.admissionDate} onChange={(e) => set('admissionDate', e.target.value)} />
          </Field>
          <Field label="First day of care">
            <DateField value={form.firstCareDay} onChange={(e) => set('firstCareDay', e.target.value)} />
          </Field>
        </div>
        <p className="text-xs" style={{ color: 'var(--kc-text-3)' }}>
          Enrollment status starts as <strong>Pending</strong>.
        </p>
      </div>
    </CardWithHeader>
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
  return (
    <CardWithHeader title="Parents & guardians">
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
            Add another parent
          </Button>
        )}
      </div>
    </CardWithHeader>
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
          Parent {index + 1}
        </span>
        {canRemove && (
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onRemove} aria-label="Remove parent">
            <Trash2 className="h-3.5 w-3.5" style={{ color: 'var(--kc-error)' }} />
          </Button>
        )}
      </div>

      <div className="flex gap-2">
        <Button variant={parent.mode === 'new' ? 'default' : 'outline'} size="sm" onClick={() => onChange({ mode: 'new' })}>
          New parent
        </Button>
        <Button
          variant={parent.mode === 'existing' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onChange({ mode: 'existing' })}
          disabled={existingParents.length === 0}
        >
          Link existing
        </Button>
      </div>

      {parent.mode === 'existing' ? (
        <Field label="Existing parent" required>
          {selected ? (
            <div className="flex items-center justify-between gap-3 rounded-md border p-2.5" style={{ borderColor: 'var(--kc-border)' }}>
              <span className="min-w-0 text-sm">
                <span className="font-medium" style={{ color: 'var(--kc-text-1)' }}>{selected.name}</span>
                <span className="ml-1 break-all" style={{ color: 'var(--kc-text-3)' }}>· {selected.email}</span>
              </span>
              <Button variant="ghost" size="sm" onClick={() => onChange({ parentId: '' })}>Change</Button>
            </div>
          ) : (
            <div className="space-y-2">
              <SearchInput value={exSearch} onChange={setExSearch} placeholder="Search by name or email…" ariaLabel="Search existing parents" />
              <div className="rounded-md border divide-y" style={{ borderColor: 'var(--kc-border)' }}>
                {filtered.length === 0 ? (
                  <p className="p-3 text-sm" style={{ color: 'var(--kc-text-3)' }}>No matching parents.</p>
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
            <Field label="Full name" required className="sm:col-span-2">
              <NameInput
                value={parent.fullName}
                onChange={(v) => onChange({ fullName: v })}
                placeholder="First and last name"
              />
            </Field>
            <Field label="Email" required>
              <Input type="email" value={parent.email} onChange={(e) => onChange({ email: e.target.value })} />
            </Field>
            <Field label="Phone">
              <PhoneInput value={parent.phone} onChange={(v) => onChange({ phone: v })} />
            </Field>
          </div>
          {/* Primary-contact toggle sits with the phone — it's the single
              control that sets ChildParent.isPrimary (radio across parents). */}
          <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: 'var(--kc-text-2)' }}>
            <Checkbox checked={parent.isPrimary} onCheckedChange={() => onPrimary()} />
            Primary contact
          </label>
          <p className="text-xs" style={{ color: 'var(--kc-text-3)' }}>
            A welcome email is sent so the parent can set their password.
          </p>
        </>
      )}

      <Field label="Relationship" required className="sm:max-w-xs">
        <Select value={parent.relationship} onValueChange={(v) => onChange({ relationship: v })}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select…" />
          </SelectTrigger>
          <SelectContent>
            {RELATIONSHIPS.map((r) => (
              <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
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
            Primary contact
          </label>
        )}
        <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: 'var(--kc-text-2)' }}>
          <Checkbox checked={parent.livesWithChild} onCheckedChange={(c) => onChange({ livesWithChild: c === true })} />
          Lives with child
        </label>
      </div>

      {parent.mode === 'new' && (
        <>
          <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: 'var(--kc-text-2)' }}>
            <Checkbox checked={parent.sameAddressAsChild} onCheckedChange={(c) => onChange({ sameAddressAsChild: c === true })} />
            Same address as the child
          </label>

          {!parent.sameAddressAsChild && (
            <div className="rounded-lg p-4" style={{ background: 'var(--kc-surface-2)' }}>
              <AddressFields value={parent.home} onChange={(field, v) => onChange({ home: { ...parent.home, [field]: v } })} />
            </div>
          )}

          <Collapsible open={parent.showWork} onOpenChange={(o) => onChange({ showWork: o })}>
            <CollapsibleTrigger className="flex items-center gap-1.5 text-sm font-medium" style={{ color: 'var(--kc-p-600)' }}>
              <ChevronDown className={cn('h-4 w-4 transition-transform', parent.showWork && 'rotate-180')} />
              Work details (optional)
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 pt-3">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Employer">
                  <NameInput value={parent.workEmployer} onChange={(v) => onChange({ workEmployer: v })} />
                </Field>
                <Field label="Work phone">
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

// ───────────────────────────────────────────── Step 3: Medical

function StepMedical({
  form,
  set,
}: {
  form: ChildForm;
  set: <K extends keyof ChildForm>(k: K, v: ChildForm[K]) => void;
}) {
  const textareaCls = 'w-full min-h-[72px] rounded-md border px-3 py-2 text-sm';
  const textareaStyle = { borderColor: 'var(--kc-border)', background: 'var(--kc-bg)', color: 'var(--kc-text-1)' } as const;
  return (
    <CardWithHeader title="Medical (optional)">
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Doctor name">
            <NameInput value={form.doctorName} onChange={(v) => set('doctorName', v)} />
          </Field>
          <Field label="Doctor phone">
            <PhoneInput value={form.doctorPhone} onChange={(v) => set('doctorPhone', v)} />
          </Field>
        </div>
        <div className="rounded-lg p-4 space-y-4" style={{ background: 'var(--kc-surface-2)' }}>
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--kc-text-3)' }}>
            Doctor address
          </p>
          <AddressFields value={form.doctorAddress} onChange={(field, v) => set('doctorAddress', { ...form.doctorAddress, [field]: v })} />
        </div>

        <EditableList label="Allergies" items={form.allergies} onChange={(v) => set('allergies', v)} placeholder="Add an allergy…" />
        <EditableList label="Medication allergies" items={form.medicationAllergies} onChange={(v) => set('medicationAllergies', v)} placeholder="Add a medication allergy…" />
        <EditableList label="Medications" items={form.medications} onChange={(v) => set('medications', v)} placeholder="Add a medication…" />

        <Field label="Medical plan">
          <textarea className={textareaCls} style={textareaStyle} value={form.medicalPlan} onChange={(e) => set('medicalPlan', e.target.value)} />
        </Field>
        <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: 'var(--kc-text-2)' }}>
          <Checkbox checked={form.hasSpecialNeeds} onCheckedChange={(c) => set('hasSpecialNeeds', c === true)} />
          Has special needs
        </label>
      </div>
    </CardWithHeader>
  );
}

// ───────────────────────────────────────────── Step 4: Review

const dash = (v?: string | null) => (v && v.trim() ? v : '—');
const addrStr = (a: Addr) => [a.street, a.city, a.state, a.zip].filter(Boolean).join(', ') || '—';
const listOr = (items: string[]) => (items.length ? items.join(', ') : '—');

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
  const childName = [form.firstName, form.middleName, form.lastName].filter(Boolean).join(' ');

  return (
    <div className="space-y-4">
      <CardWithHeader icon={Baby} title="Child" action={<EditButton label="Edit child" onClick={() => goToStep(1)} />}>
        <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
          <ReviewRow label="Name" value={dash(childName)} />
          <ReviewRow label="Birth date" value={dash(form.birthDate)} />
          <ReviewRow label="Gender" value={dash(form.gender)} />
          <ReviewRow label="Enrollment status" value="Pending" />
          <ReviewRow label="Address" value={addrStr(form.address)} full />
          <ReviewRow label="Admission date" value={dash(form.admissionDate)} />
          <ReviewRow label="First day of care" value={dash(form.firstCareDay)} />
        </dl>
      </CardWithHeader>

      <CardWithHeader icon={Users} title={`Parents (${form.parents.length})`}>
        <div className="space-y-4">
          {form.parents.map((p, i) => {
            const existing = p.mode === 'existing' ? existingParents.find((e) => e.id === p.parentId) : undefined;
            const rawName = p.mode === 'existing' ? existing?.name ?? '' : p.fullName.trim();
            return (
              <div key={i} className="rounded-lg border p-4" style={{ borderColor: 'var(--kc-border)' }}>
                {/* Header = just the "Parent N" index + edit. Name is a labeled
                    FULL NAME row below (consistent with the other fields). */}
                <div className="mb-3 flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--kc-text-3)' }}>
                    Parent {i + 1}
                  </span>
                  <EditButton label="Edit parents" onClick={() => goToStep(2)} />
                </div>
                <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
                  <ReviewRow label="Full name" value={dash(rawName)} full />
                  <ReviewRow label="Type" value={p.mode === 'existing' ? 'Existing parent' : 'New parent'} />
                  <ReviewRow label="Relationship" value={p.relationship ? relationshipLabel(p.relationship) : '—'} />
                  <ReviewRow label="Primary contact" value={p.isPrimary ? 'Yes' : 'No'} />
                  <ReviewRow label="Lives with child" value={p.livesWithChild ? 'Yes' : 'No'} />
                  {p.mode === 'existing' ? (
                    <ReviewRow label="Email" value={dash(existing?.email)} full />
                  ) : (
                    <>
                      <ReviewRow label="Email" value={dash(p.email)} />
                      <ReviewRow label="Phone" value={dash(p.phone)} />
                      <ReviewRow
                        label="Home address"
                        value={p.sameAddressAsChild ? 'Same as child' : addrStr(p.home)}
                        full
                      />
                      <ReviewRow label="Employer" value={dash(p.workEmployer)} />
                      <ReviewRow label="Work phone" value={dash(p.workPhone)} />
                      <ReviewRow label="Work address" value={addrStr(p.work)} full />
                    </>
                  )}
                </dl>
              </div>
            );
          })}
        </div>
      </CardWithHeader>

      <CardWithHeader icon={HeartPulse} title="Medical" action={<EditButton label="Edit medical" onClick={() => goToStep(3)} />}>
        <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
          <ReviewRow label="Doctor name" value={dash(form.doctorName)} />
          <ReviewRow label="Doctor phone" value={dash(form.doctorPhone)} />
          <ReviewRow label="Doctor address" value={addrStr(form.doctorAddress)} full />
          <ReviewRow label="Allergies" value={listOr(form.allergies)} full />
          <ReviewRow label="Medication allergies" value={listOr(form.medicationAllergies)} full />
          <ReviewRow label="Medications" value={listOr(form.medications)} full />
          <ReviewRow label="Medical plan" value={dash(form.medicalPlan)} full />
          <ReviewRow label="Special needs" value={form.hasSpecialNeeds ? 'Yes' : 'No'} />
        </dl>
      </CardWithHeader>
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

function ReviewRow({ label, value, full }: { label: string; value: string; full?: boolean }) {
  return (
    <div className={full ? 'sm:col-span-2' : undefined}>
      <dt className="text-xs uppercase tracking-wider" style={{ color: 'var(--kc-text-3)' }}>
        {label}
      </dt>
      <dd className="mt-0.5 text-sm break-words" style={{ color: 'var(--kc-text-1)' }}>
        {value}
      </dd>
    </div>
  );
}
