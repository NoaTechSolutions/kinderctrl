'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronDown, Loader2, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { CardWithHeader } from '@/components/ui/card-with-header';
import { FilterTabs, type FilterTab } from '@/components/ui/filter-tabs';
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
import { formatPhoneUS, parsePhoneDigits } from '@/lib/utils/phone';
import {
  useCenterChildren,
  useUpdateChildDetails,
  useUpdateChildMedicalInfo,
  useUpdateChildParents,
  type ParentOps,
} from '@/lib/hooks/use-children';
import { useUnsavedChangesPrompt } from '@/lib/hooks/use-unsaved-changes-prompt';
import {
  AddressFields,
  EditableList,
  Field,
  emptyAddr,
  splitName,
  type Addr,
} from './child-form-fields';
import { ApiError } from '@/lib/api/client';
import type {
  ChildParentPayload,
  MedicalInfoPayload,
  UpdateChildPayload,
} from '@/lib/api/children';
import type { Child } from '@/lib/types/child';

type EditTab = 'child' | 'parents' | 'medical';
const EDIT_TABS: ReadonlyArray<FilterTab<EditTab>> = [
  { value: 'child', label: 'Child details' },
  { value: 'parents', label: 'Parents' },
  { value: 'medical', label: 'Medical' },
];

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
const ENROLLMENT_STATUSES = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INACTIVE', label: 'Inactive' },
  { value: 'WITHDRAWN', label: 'Withdrawn' },
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const undef = (v: string): string | undefined => (v.trim() ? v.trim() : undefined);
const phoneDigits = (v: string): string | undefined => parsePhoneDigits(v) || undefined;
const toStrArray = (v: unknown): string[] =>
  Array.isArray(v) ? v.map((x) => String(x)).filter(Boolean) : [];
const splitCsv = (v: string | null | undefined): string[] =>
  v ? v.split(',').map((s) => s.trim()).filter(Boolean) : [];

interface ChildState {
  firstName: string;
  middleName: string;
  lastName: string;
  birthDate: string;
  gender: string;
  address: Addr;
  admissionDate: string;
  firstCareDay: string;
  enrollmentStatus: string;
}

interface MedicalState {
  doctorName: string;
  doctorPhone: string;
  doctorAddress: string;
  allergies: string[];
  medicationAllergies: string[];
  medications: string[];
  medicalPlan: string;
  hasSpecialNeeds: boolean;
}

// One parent row. `linked` rows came from the loaded child (name/email
// read-only, only the link metadata is editable). Non-linked rows are
// additions: link an existing roster parent (mode 'existing') or create new.
interface ParentRow {
  rowKey: string;
  linked: boolean;
  parentId: string;
  displayName: string;
  displayEmail: string;
  mode: 'existing' | 'new';
  fullName: string;
  email: string;
  phone: string;
  sameAddressAsChild: boolean;
  home: Addr;
  showWork: boolean;
  workPhone: string;
  workEmployer: string;
  work: Addr;
  relationship: string;
  isPrimary: boolean;
  livesWithChild: boolean;
  origRelationship: string;
  origIsPrimary: boolean;
  origLivesWithChild: boolean;
}

function emptyNewRow(key: string): ParentRow {
  return {
    rowKey: key,
    linked: false,
    parentId: '',
    displayName: '',
    displayEmail: '',
    mode: 'new',
    fullName: '',
    email: '',
    phone: '',
    sameAddressAsChild: true,
    home: emptyAddr(),
    showWork: false,
    workPhone: '',
    workEmployer: '',
    work: emptyAddr(),
    relationship: '',
    isPrimary: false,
    livesWithChild: true,
    origRelationship: '',
    origIsPrimary: false,
    origLivesWithChild: false,
  };
}

function seed(child: Child) {
  const med = child.medicalInfo ?? null;
  const childState: ChildState = {
    firstName: child.firstName,
    middleName: child.middleName ?? '',
    lastName: child.lastName,
    birthDate: child.dateOfBirth ? child.dateOfBirth.slice(0, 10) : '',
    gender: child.gender,
    address: {
      street: child.addressStreet ?? '',
      city: child.addressCity ?? '',
      state: child.addressState ?? '',
      zip: child.addressZip ?? '',
    },
    admissionDate: child.admissionDate ? child.admissionDate.slice(0, 10) : '',
    firstCareDay: child.firstCareDay ? child.firstCareDay.slice(0, 10) : '',
    enrollmentStatus: child.enrollmentStatus,
  };
  const medical: MedicalState = {
    doctorName: med?.doctorName ?? '',
    doctorPhone: med?.doctorPhone ? formatPhoneUS(med.doctorPhone) : '',
    doctorAddress: med?.doctorAddress ?? '',
    allergies: toStrArray(med?.allergies),
    medicationAllergies: splitCsv(med?.medicationAllergies),
    medications: toStrArray(med?.medications),
    medicalPlan: med?.medicalPlan ?? '',
    hasSpecialNeeds: med?.hasSpecialNeeds ?? false,
  };
  const parents: ParentRow[] = (child.childParents ?? []).map((link, i) => ({
    ...emptyNewRow(`linked-${link.parentId}-${i}`),
    linked: true,
    parentId: link.parentId,
    displayName: `${link.parent.firstName} ${link.parent.lastName}`.trim(),
    displayEmail: link.parent.email,
    relationship: link.relationship,
    isPrimary: link.isPrimary,
    livesWithChild: link.livesWithChild,
    origRelationship: link.relationship,
    origIsPrimary: link.isPrimary,
    origLivesWithChild: link.livesWithChild,
  }));
  return { childState, medical, parents };
}

export function ChildEditForm({ child }: { child: Child }) {
  const router = useRouter();
  const seeded = useMemo(() => seed(child), [child]);

  const [tab, setTab] = useState<EditTab>('child');

  const [childState, setChildState] = useState<ChildState>(seeded.childState);
  const [childBaseline, setChildBaseline] = useState(() => JSON.stringify(seeded.childState));
  const [medical, setMedical] = useState<MedicalState>(seeded.medical);
  const [medicalBaseline, setMedicalBaseline] = useState(() => JSON.stringify(seeded.medical));
  const [parents, setParents] = useState<ParentRow[]>(seeded.parents);
  const [removedLinkedIds, setRemovedLinkedIds] = useState<string[]>([]);
  const [parentsBaseline, setParentsBaseline] = useState(() =>
    JSON.stringify({ p: seeded.parents, r: [] as string[] }),
  );
  const [rowSeq, setRowSeq] = useState(0);

  const [touched, setTouched] = useState(false);
  const [confirmSaveOpen, setConfirmSaveOpen] = useState(false);
  const [removeRow, setRemoveRow] = useState<ParentRow | null>(null);
  const [pendingTab, setPendingTab] = useState<EditTab | null>(null);

  const detailsMut = useUpdateChildDetails();
  const medicalMut = useUpdateChildMedicalInfo();
  const parentsMut = useUpdateChildParents();
  const saving = detailsMut.isPending || medicalMut.isPending || parentsMut.isPending;
  const todayStr = new Date().toLocaleDateString('en-CA');

  const { data: roster } = useCenterChildren(child.centerId);
  const linkableParents = useMemo(() => {
    const onChild = new Set(parents.map((p) => p.parentId).filter(Boolean));
    const map = new Map<string, { id: string; name: string; email: string }>();
    for (const c of roster ?? []) {
      for (const l of c.childParents ?? []) {
        if (!onChild.has(l.parent.id) && !map.has(l.parent.id)) {
          map.set(l.parent.id, {
            id: l.parent.id,
            name: `${l.parent.firstName} ${l.parent.lastName}`,
            email: l.parent.email,
          });
        }
      }
    }
    return [...map.values()];
  }, [roster, parents]);

  // Per-tab dirty (serialized state vs the tab's baseline).
  const childDirty = JSON.stringify(childState) !== childBaseline;
  const medicalDirty = JSON.stringify(medical) !== medicalBaseline;
  const parentsDirty = JSON.stringify({ p: parents, r: removedLinkedIds }) !== parentsBaseline;
  const anyDirty = childDirty || medicalDirty || parentsDirty;
  const currentDirty = tab === 'child' ? childDirty : tab === 'parents' ? parentsDirty : medicalDirty;

  // Module-exit guard (sidebar / back / refresh) — active if ANY tab is dirty.
  useUnsavedChangesPrompt(anyDirty, 'You have unsaved changes. Leaving will discard them.');

  const setC = <K extends keyof ChildState>(k: K, v: ChildState[K]) =>
    setChildState((s) => ({ ...s, [k]: v }));
  const setM = <K extends keyof MedicalState>(k: K, v: MedicalState[K]) =>
    setMedical((s) => ({ ...s, [k]: v }));
  const setRow = (key: string, patch: Partial<ParentRow>) =>
    setParents((ps) => ps.map((p) => (p.rowKey === key ? { ...p, ...patch } : p)));
  const setPrimary = (key: string) =>
    setParents((ps) => ps.map((p) => ({ ...p, isPrimary: p.rowKey === key })));
  const addRow = () => {
    const key = `new-${rowSeq}`;
    setRowSeq((n) => n + 1);
    setParents((ps) => [...ps, emptyNewRow(key)]);
  };
  const doRemoveRow = (row: ParentRow) => {
    setParents((ps) => {
      const next = ps.filter((p) => p.rowKey !== row.rowKey).map((p) => ({ ...p }));
      if (!next.some((p) => p.isPrimary) && next[0]) next[0].isPrimary = true;
      return next;
    });
    if (row.linked) setRemovedLinkedIds((ids) => [...ids, row.parentId]);
  };
  const requestRemoveRow = (row: ParentRow) => {
    const isEmptyNew =
      !row.linked && !row.fullName && !row.email && !row.parentId && !row.relationship;
    if (isEmptyNew) doRemoveRow(row);
    else setRemoveRow(row);
  };

  const childErrors = useMemo(() => {
    const e: string[] = [];
    if (!childState.firstName.trim()) e.push('First name is required.');
    if (!childState.lastName.trim()) e.push('Last name is required.');
    if (!childState.birthDate) e.push('Birth date is required.');
    else if (childState.birthDate > todayStr) e.push('Birth date cannot be in the future.');
    if (!childState.gender) e.push('Gender is required.');
    return e;
  }, [childState, todayStr]);

  const parentErrors = useMemo(() => {
    const e: string[] = [];
    if (parents.length === 0) e.push('At least one parent is required.');
    parents.forEach((p, i) => {
      const tag = `Parent ${i + 1}`;
      if (!p.relationship) e.push(`${tag}: relationship is required.`);
      if (!p.linked && p.mode === 'existing' && !p.parentId) e.push(`${tag}: pick an existing parent.`);
      if (!p.linked && p.mode === 'new') {
        if (splitName(p.fullName).lastName === '') e.push(`${tag}: full name (first and last) is required.`);
        if (!EMAIL_RE.test(p.email.trim())) e.push(`${tag}: a valid email is required.`);
      }
    });
    if (parents.length > 0 && !parents.some((p) => p.isPrimary)) e.push('Mark one parent as primary.');
    return e;
  }, [parents]);

  const currentErrors = tab === 'child' ? childErrors : tab === 'parents' ? parentErrors : [];

  const buildChildPayload = (): UpdateChildPayload => ({
    firstName: childState.firstName.trim(),
    middleName: undef(childState.middleName),
    lastName: childState.lastName.trim(),
    dateOfBirth: childState.birthDate,
    gender: childState.gender,
    addressStreet: undef(childState.address.street),
    addressCity: undef(childState.address.city),
    addressState: undef(childState.address.state),
    addressZip: undef(childState.address.zip),
    admissionDate: childState.admissionDate || undefined,
    firstCareDay: childState.firstCareDay || undefined,
    enrollmentStatus: childState.enrollmentStatus,
  });

  const buildMedicalPayload = (): MedicalInfoPayload => ({
    allergies: medical.allergies,
    medications: medical.medications,
    doctorName: undef(medical.doctorName),
    doctorPhone: phoneDigits(medical.doctorPhone),
    doctorAddress: undef(medical.doctorAddress),
    medicationAllergies: medical.medicationAllergies.length
      ? medical.medicationAllergies.join(', ')
      : undefined,
    medicalPlan: undef(medical.medicalPlan),
    hasSpecialNeeds: medical.hasSpecialNeeds,
  });

  const buildParentOps = (): ParentOps => {
    const ops: ParentOps = { add: [], updateLinks: [], remove: [...removedLinkedIds] };
    for (const p of parents) {
      if (p.linked) {
        if (
          p.relationship !== p.origRelationship ||
          p.isPrimary !== p.origIsPrimary ||
          p.livesWithChild !== p.origLivesWithChild
        ) {
          ops.updateLinks.push({
            parentId: p.parentId,
            relationship: p.relationship,
            isPrimary: p.isPrimary,
            livesWithChild: p.livesWithChild,
          });
        }
        continue;
      }
      const base: ChildParentPayload = {
        relationship: p.relationship,
        isPrimary: p.isPrimary,
        livesWithChild: p.livesWithChild,
      };
      if (p.mode === 'existing') {
        ops.add.push({ ...base, parentId: p.parentId });
      } else {
        const { firstName, lastName } = splitName(p.fullName);
        const home = p.sameAddressAsChild ? childState.address : p.home;
        ops.add.push({
          ...base,
          firstName,
          lastName,
          email: p.email.trim(),
          homePhone: phoneDigits(p.phone),
          homeAddressStreet: undef(home.street),
          homeAddressCity: undef(home.city),
          homeAddressState: undef(home.state),
          homeAddressZip: undef(home.zip),
          ...(p.showWork
            ? {
                workPhone: phoneDigits(p.workPhone),
                workEmployer: undef(p.workEmployer),
                workAddressStreet: undef(p.work.street),
                workAddressCity: undef(p.work.city),
                workAddressState: undef(p.work.state),
                workAddressZip: undef(p.work.zip),
              }
            : {}),
        });
      }
    }
    return ops;
  };

  // Save the current section. Returns true on success.
  const saveSection = async (section: EditTab): Promise<boolean> => {
    try {
      if (section === 'child') {
        if (childErrors.length) {
          setTouched(true);
          toast.error(childErrors[0]);
          return false;
        }
        await detailsMut.mutateAsync({ childId: child.id, payload: buildChildPayload() });
        setChildBaseline(JSON.stringify(childState));
        toast.success('Child details saved');
      } else if (section === 'medical') {
        await medicalMut.mutateAsync({ childId: child.id, payload: buildMedicalPayload() });
        setMedicalBaseline(JSON.stringify(medical));
        toast.success('Medical info saved');
      } else {
        if (parentErrors.length) {
          setTouched(true);
          toast.error(parentErrors[0]);
          return false;
        }
        const fresh = await parentsMut.mutateAsync({ childId: child.id, ops: buildParentOps() });
        // Re-seed parents from fresh data: new parents now have real ids.
        const reseeded = seed(fresh).parents;
        setParents(reseeded);
        setRemovedLinkedIds([]);
        setParentsBaseline(JSON.stringify({ p: reseeded, r: [] }));
        toast.success('Parents saved');
      }
      setTouched(false);
      return true;
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to save changes');
      return false;
    }
  };

  const discardCurrentTab = () => {
    if (tab === 'child') setChildState(JSON.parse(childBaseline) as ChildState);
    else if (tab === 'medical') setMedical(JSON.parse(medicalBaseline) as MedicalState);
    else {
      const b = JSON.parse(parentsBaseline) as { p: ParentRow[]; r: string[] };
      setParents(b.p);
      setRemovedLinkedIds(b.r);
    }
    setTouched(false);
  };

  const handleTabChange = (next: EditTab) => {
    if (next === tab) return;
    if (currentDirty) {
      setPendingTab(next);
      return;
    }
    setTouched(false);
    setTab(next);
  };

  const saveLabel = tab === 'child' ? 'Save details' : tab === 'parents' ? 'Save parents' : 'Save medical';

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <FilterTabs tabs={EDIT_TABS} value={tab} onChange={handleTabChange} ariaLabel="Edit sections" />

      {touched && currentErrors.length > 0 && (
        <ul
          className="rounded-lg border p-3 text-sm"
          style={{
            background: 'var(--kc-error-bg)',
            borderColor: 'color-mix(in oklch, var(--kc-error), transparent 70%)',
            color: 'var(--kc-error)',
          }}
        >
          {currentErrors.map((e) => (
            <li key={e}>• {e}</li>
          ))}
        </ul>
      )}

      {tab === 'child' && (
        <CardWithHeader title="Child details">
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="First name" required>
                <NameInput value={childState.firstName} onChange={(v) => setC('firstName', v)} />
              </Field>
              <Field label="Middle name">
                <NameInput value={childState.middleName} onChange={(v) => setC('middleName', v)} />
              </Field>
              <Field label="Last name" required>
                <NameInput value={childState.lastName} onChange={(v) => setC('lastName', v)} />
              </Field>
              <Field label="Birth date" required>
                <DateField value={childState.birthDate} onChange={(e) => setC('birthDate', e.target.value)} max={todayStr} />
              </Field>
              <Field label="Gender" required>
                <PlainSelect value={childState.gender} onValueChange={(v) => setC('gender', v)} options={GENDERS} />
              </Field>
              <Field label="Enrollment status" required>
                <PlainSelect value={childState.enrollmentStatus} onValueChange={(v) => setC('enrollmentStatus', v)} options={ENROLLMENT_STATUSES} />
              </Field>
            </div>
            <div className="rounded-lg p-4 space-y-4" style={{ background: 'var(--kc-surface-2)' }}>
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--kc-text-3)' }}>
                Child&apos;s address
              </p>
              <AddressFields value={childState.address} onChange={(f, v) => setC('address', { ...childState.address, [f]: v })} />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Admission date">
                <DateField value={childState.admissionDate} onChange={(e) => setC('admissionDate', e.target.value)} />
              </Field>
              <Field label="First day of care">
                <DateField value={childState.firstCareDay} onChange={(e) => setC('firstCareDay', e.target.value)} />
              </Field>
            </div>
          </div>
        </CardWithHeader>
      )}

      {tab === 'parents' && (
        <CardWithHeader title="Parents & guardians">
          <div className="space-y-4">
            {parents.map((p, i) => (
              <ParentEditCard
                key={p.rowKey}
                index={i}
                row={p}
                linkableParents={linkableParents}
                canRemove={parents.length > 1}
                onChange={(patch) => setRow(p.rowKey, patch)}
                onPrimary={() => setPrimary(p.rowKey)}
                onRemove={() => requestRemoveRow(p)}
              />
            ))}
            <Button variant="outline" onClick={addRow} className="w-full">
              <Plus className="mr-1.5 h-4 w-4" />
              Add parent
            </Button>
          </div>
        </CardWithHeader>
      )}

      {tab === 'medical' && (
        <CardWithHeader title="Medical">
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Doctor name">
                <NameInput value={medical.doctorName} onChange={(v) => setM('doctorName', v)} />
              </Field>
              <Field label="Doctor phone">
                <PhoneInput value={medical.doctorPhone} onChange={(v) => setM('doctorPhone', v)} />
              </Field>
              <Field label="Doctor address" className="sm:col-span-2">
                <Input value={medical.doctorAddress} onChange={(e) => setM('doctorAddress', e.target.value)} />
              </Field>
            </div>
            <EditableList label="Allergies" items={medical.allergies} onChange={(v) => setM('allergies', v)} placeholder="Add an allergy…" />
            <EditableList label="Medication allergies" items={medical.medicationAllergies} onChange={(v) => setM('medicationAllergies', v)} placeholder="Add a medication allergy…" />
            <EditableList label="Medications" items={medical.medications} onChange={(v) => setM('medications', v)} placeholder="Add a medication…" />
            <Field label="Medical plan">
              <textarea
                className="w-full min-h-[72px] rounded-md border px-3 py-2 text-sm"
                style={{ borderColor: 'var(--kc-border)', background: 'var(--kc-bg)', color: 'var(--kc-text-1)' }}
                value={medical.medicalPlan}
                onChange={(e) => setM('medicalPlan', e.target.value)}
              />
            </Field>
            <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: 'var(--kc-text-2)' }}>
              <Checkbox checked={medical.hasSpecialNeeds} onCheckedChange={(c) => setM('hasSpecialNeeds', c === true)} />
              Has special needs
            </label>
          </div>
        </CardWithHeader>
      )}

      <div className="flex items-center justify-between gap-2">
        <Button asChild variant="ghost">
          <Link href={`/children/${child.id}`}>Cancel</Link>
        </Button>
        <Button
          onClick={() => {
            setTouched(true);
            if (currentErrors.length === 0) setConfirmSaveOpen(true);
          }}
          disabled={saving || !currentDirty}
        >
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {saveLabel}
        </Button>
      </div>

      {/* Save confirm (this section only) */}
      <AlertDialog open={confirmSaveOpen} onOpenChange={setConfirmSaveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Save changes?</AlertDialogTitle>
            <AlertDialogDescription>Apply the changes to this section?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                setConfirmSaveOpen(false);
                void saveSection(tab);
              }}
            >
              Save
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Tab-switch guard — current section has unsaved changes */}
      <AlertDialog open={pendingTab !== null} onOpenChange={(o) => !o && setPendingTab(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes in this section. Save before continuing?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:gap-2">
            <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
            <Button
              variant="outline"
              disabled={saving}
              onClick={() => {
                const target = pendingTab;
                discardCurrentTab();
                setPendingTab(null);
                if (target) setTab(target);
              }}
            >
              Discard
            </Button>
            <AlertDialogAction
              disabled={saving}
              onClick={async (e) => {
                e.preventDefault();
                const target = pendingTab;
                const ok = await saveSection(tab);
                setPendingTab(null);
                if (ok && target) setTab(target);
              }}
            >
              Save and continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Remove-parent confirm */}
      <AlertDialog open={removeRow !== null} onOpenChange={(o) => !o && setRemoveRow(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this parent?</AlertDialogTitle>
            <AlertDialogDescription>
              The parent record itself is kept — only the link to this child is removed (on save).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                if (removeRow) doRemoveRow(removeRow);
                setRemoveRow(null);
              }}
              style={{ background: 'var(--kc-error)', color: 'white' }}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Thin Select wrapper for the fixed option lists.
function PlainSelect({
  value,
  onValueChange,
  options,
}: {
  value: string;
  onValueChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Select…" />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function ParentEditCard({
  index,
  row,
  linkableParents,
  canRemove,
  onChange,
  onPrimary,
  onRemove,
}: {
  index: number;
  row: ParentRow;
  linkableParents: Array<{ id: string; name: string; email: string }>;
  canRemove: boolean;
  onChange: (patch: Partial<ParentRow>) => void;
  onPrimary: () => void;
  onRemove: () => void;
}) {
  const [exSearch, setExSearch] = useState('');
  const selected = linkableParents.find((e) => e.id === row.parentId);
  const filtered = useMemo(() => {
    const q = exSearch.trim().toLowerCase();
    return (q ? linkableParents.filter((e) => `${e.name} ${e.email}`.toLowerCase().includes(q)) : linkableParents).slice(0, 6);
  }, [exSearch, linkableParents]);

  return (
    <div className="rounded-lg border p-4 space-y-4" style={{ borderColor: 'var(--kc-border)' }}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold" style={{ color: 'var(--kc-text-1)' }}>
          Parent {index + 1}
          {row.linked && (
            <span className="ml-2 text-xs font-normal" style={{ color: 'var(--kc-text-3)' }}>
              {row.displayName}
            </span>
          )}
        </span>
        {canRemove && (
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onRemove} aria-label="Remove parent">
            <Trash2 className="h-3.5 w-3.5" style={{ color: 'var(--kc-error)' }} />
          </Button>
        )}
      </div>

      {row.linked ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Full name">
            <Input value={row.displayName} disabled />
          </Field>
          <Field label="Email">
            <Input value={row.displayEmail} disabled />
          </Field>
        </div>
      ) : (
        <>
          <div className="flex gap-2">
            <Button variant={row.mode === 'new' ? 'default' : 'outline'} size="sm" onClick={() => onChange({ mode: 'new' })}>
              New parent
            </Button>
            <Button
              variant={row.mode === 'existing' ? 'default' : 'outline'}
              size="sm"
              onClick={() => onChange({ mode: 'existing' })}
              disabled={linkableParents.length === 0}
            >
              Link existing
            </Button>
          </div>

          {row.mode === 'existing' ? (
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
                  <NameInput value={row.fullName} onChange={(v) => onChange({ fullName: v })} placeholder="First and last name" />
                </Field>
                <Field label="Email" required>
                  <Input type="email" value={row.email} onChange={(e) => onChange({ email: e.target.value })} />
                </Field>
                <Field label="Phone">
                  <PhoneInput value={row.phone} onChange={(v) => onChange({ phone: v })} />
                </Field>
              </div>
              <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: 'var(--kc-text-2)' }}>
                <Checkbox checked={row.isPrimary} onCheckedChange={() => onPrimary()} />
                Primary contact
              </label>
            </>
          )}
        </>
      )}

      <Field label="Relationship" required className="sm:max-w-xs">
        <PlainSelect value={row.relationship} onValueChange={(v) => onChange({ relationship: v })} options={RELATIONSHIPS} />
      </Field>

      <div className="flex flex-wrap gap-4">
        {(row.linked || row.mode === 'existing') && (
          <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: 'var(--kc-text-2)' }}>
            <Checkbox checked={row.isPrimary} onCheckedChange={() => onPrimary()} />
            Primary contact
          </label>
        )}
        <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: 'var(--kc-text-2)' }}>
          <Checkbox checked={row.livesWithChild} onCheckedChange={(c) => onChange({ livesWithChild: c === true })} />
          Lives with child
        </label>
      </div>

      {!row.linked && row.mode === 'new' && (
        <>
          <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: 'var(--kc-text-2)' }}>
            <Checkbox checked={row.sameAddressAsChild} onCheckedChange={(c) => onChange({ sameAddressAsChild: c === true })} />
            Same address as the child
          </label>
          {!row.sameAddressAsChild && (
            <div className="rounded-lg p-4" style={{ background: 'var(--kc-surface-2)' }}>
              <AddressFields value={row.home} onChange={(f, v) => onChange({ home: { ...row.home, [f]: v } })} />
            </div>
          )}
          <Collapsible open={row.showWork} onOpenChange={(o) => onChange({ showWork: o })}>
            <CollapsibleTrigger className="flex items-center gap-1.5 text-sm font-medium" style={{ color: 'var(--kc-p-600)' }}>
              <ChevronDown className={cn('h-4 w-4 transition-transform', row.showWork && 'rotate-180')} />
              Work details (optional)
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 pt-3">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Employer">
                  <NameInput value={row.workEmployer} onChange={(v) => onChange({ workEmployer: v })} />
                </Field>
                <Field label="Work phone">
                  <PhoneInput value={row.workPhone} onChange={(v) => onChange({ workPhone: v })} />
                </Field>
              </div>
              <AddressFields value={row.work} onChange={(f, v) => onChange({ work: { ...row.work, [f]: v } })} />
            </CollapsibleContent>
          </Collapsible>
        </>
      )}
    </div>
  );
}
