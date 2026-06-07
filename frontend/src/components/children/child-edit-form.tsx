'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronDown, Loader2, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { CardWithHeader } from '@/components/ui/card-with-header';
import { FilterTabs, type FilterTab } from '@/components/ui/filter-tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NameInput } from '@/components/ui/name-input';
import { NumericInput } from '@/components/ui/numeric-input';
import { PhoneInput } from '@/components/ui/phone-input';
import { SearchInput } from '@/components/ui/search-input';
import { Checkbox } from '@/components/ui/checkbox';
import { DateField } from '@/components/ui/date-field';
import { TimeField } from '@/components/ui/time-field';
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
  useUpdateChildContacts,
  useUpdateChildDetails,
  useUpdateChildDevelopment,
  useUpdateChildMedicalInfo,
  useUpdateChildParents,
  type ContactOps,
  type ParentOps,
} from '@/lib/hooks/use-children';
import { useUnsavedChangesPrompt } from '@/lib/hooks/use-unsaved-changes-prompt';
import { useTranslation } from '@/lib/i18n';
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
  ChildContactPayload,
  ChildParentPayload,
  DevelopmentPayload,
  MedicalInfoPayload,
  UpdateChildPayload,
} from '@/lib/api/children';
import type {
  Child,
  ChildContactType,
  PastIllnesses,
} from '@/lib/types/child';

type EditTab =
  | 'child'
  | 'parents'
  | 'medical'
  | 'contacts'
  | 'development'
  | 'routines'
  | 'toilet';

// Past-illness checklist (Fase 2 · 2A). Codes mirror the backend
// CHILD_PAST_ILLNESSES whitelist; labels are i18n keys.
const PAST_ILLNESSES = [
  { code: 'CHICKEN_POX', labelKey: 'children.illnessChickenPox' },
  { code: 'ASTHMA', labelKey: 'children.illnessAsthma' },
  { code: 'RHEUMATIC_FEVER', labelKey: 'children.illnessRheumaticFever' },
  { code: 'HAY_FEVER', labelKey: 'children.illnessHayFever' },
  { code: 'DIABETES', labelKey: 'children.illnessDiabetes' },
  { code: 'EPILEPSY', labelKey: 'children.illnessEpilepsy' },
  { code: 'WHOOPING_COUGH', labelKey: 'children.illnessWhoopingCough' },
  { code: 'MUMPS', labelKey: 'children.illnessMumps' },
  { code: 'POLIOMYELITIS', labelKey: 'children.illnessPoliomyelitis' },
  { code: 'TEN_DAY_MEASLES', labelKey: 'children.illnessTenDayMeasles' },
  { code: 'THREE_DAY_MEASLES', labelKey: 'children.illnessThreeDayMeasles' },
] as const;

interface IllnessEntryState {
  checked: boolean;
  date: string;
}

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
const ENROLLMENT_STATUSES = [
  { value: 'PENDING', labelKey: 'children.statusPending' },
  { value: 'ACTIVE', labelKey: 'children.statusActive' },
  { value: 'INACTIVE', labelKey: 'children.statusInactive' },
  { value: 'WITHDRAWN', labelKey: 'children.statusWithdrawn' },
];
// Fase 2 (2B) — toilet help-level whitelist (mirrors CHILD_TOILET_HELP_LEVELS).
const TOILET_HELP_LEVELS = [
  { value: 'INDEPENDENT', labelKey: 'children.toiletHelpIndependent' },
  { value: 'NEEDS_REMINDERS', labelKey: 'children.toiletHelpNeedsReminders' },
  { value: 'NEEDS_ASSISTANCE', labelKey: 'children.toiletHelpNeedsAssistance' },
  { value: 'FULL_ASSISTANCE', labelKey: 'children.toiletHelpFullAssistance' },
  { value: 'IN_DIAPERS', labelKey: 'children.toiletHelpInDiapers' },
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const undef = (v: string): string | undefined => (v.trim() ? v.trim() : undefined);
// PATCH-merge helpers (2B): an emptied field sends `null` to CLEAR the column
// (vs `undef`'s undefined, which the merge would treat as "leave unchanged").
const orNull = (v: string): string | null => (v.trim() ? v.trim() : null);
const numOrNull = (v: string): number | null => (v.trim() ? Number(v) : null);
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
  doctorLastExamDate: string;
  isUnderDoctorCare: boolean;
  prescribedMedicationDetails: string;
  medicationSideEffects: string;
  allergies: string[];
  medicationAllergies: string[];
  medications: string[];
  medicalPlan: string;
  hasSpecialNeeds: boolean;
  // Dentist (structured address).
  dentistName: string;
  dentistPhone: string;
  dentistAddress: Addr;
  dentalPlan: string;
  // Health.
  specialDevices: string;
  frequentColds: boolean;
  frequentColdsCount: string; // kept as text for the input; parsed on save
  pastIllnesses: Record<string, IllnessEntryState>;
  otherIllnesses: string;
}

// Fase 2 (2B) — each tab keeps its own slice so per-tab dirty/save is clean.
// Month ages live as strings for the NumericInput (parsed on save, like
// frequentColdsCount).
interface DevelopmentState {
  walkedAtMonths: string;
  talkedAtMonths: string;
  toiletTrainedAtMonths: string;
  developmentNotes: string;
}

interface RoutinesState {
  wakeUpTime: string;
  bedTime: string;
  takesNap: boolean;
  napStartTime: string;
  napEndTime: string;
  diet: string;
  mealTimes: string;
}

interface ToiletState {
  toiletTrained: boolean;
  toiletWords: string;
  toiletHelpLevel: string;
  toiletAccidents: string;
}

// Build the per-illness checklist state from saved data, defaulting every code
// in the whitelist to unchecked/no-date so the form always renders all rows.
function buildIllnessState(
  saved: PastIllnesses | null,
): Record<string, IllnessEntryState> {
  const out: Record<string, IllnessEntryState> = {};
  for (const it of PAST_ILLNESSES) {
    const s = saved?.[it.code];
    out[it.code] = { checked: s?.checked ?? false, date: s?.date ?? '' };
  }
  return out;
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

// ── Contacts (Fase 2 · 2A) ──────────────────────────────────────────────────
// One editable contact row. `id` empty = a new (unsaved) contact.
interface ContactRow {
  rowKey: string;
  id: string;
  contactType: ChildContactType;
  name: string;
  relationship: string;
  phone: string;
  homePhone: string;
  workPhone: string;
  address: Addr;
  orig: string; // field signature at seed time → detect edits on existing rows
}

// The three contact groups + which fields each one shows.
const CONTACT_GROUPS = [
  {
    type: 'EMERGENCY' as ChildContactType,
    titleKey: 'children.sectionEmergency',
    noteKey: null,
    fields: ['relationship', 'phone', 'address'] as const,
  },
  {
    type: 'AUTHORIZED_PICKUP' as ChildContactType,
    titleKey: 'children.sectionAuthorizedPickup',
    noteKey: 'children.authorizedPickupNote',
    fields: ['relationship'] as const,
  },
  {
    type: 'RESPONSIBLE' as ChildContactType,
    titleKey: 'children.sectionResponsible',
    noteKey: null,
    fields: ['homePhone', 'workPhone'] as const,
  },
] as const;

type ContactField = (typeof CONTACT_GROUPS)[number]['fields'][number];

// Comparable signature of a contact's editable fields (dirty / diff).
function contactSig(r: Omit<ContactRow, 'rowKey' | 'orig'>): string {
  return JSON.stringify({
    contactType: r.contactType,
    name: r.name.trim(),
    relationship: r.relationship.trim(),
    phone: r.phone,
    homePhone: r.homePhone,
    workPhone: r.workPhone,
    address: r.address,
  });
}

function emptyContactRow(key: string, type: ChildContactType): ContactRow {
  const base = {
    id: '',
    contactType: type,
    name: '',
    relationship: '',
    phone: '',
    homePhone: '',
    workPhone: '',
    address: emptyAddr(),
  };
  return { rowKey: key, ...base, orig: contactSig(base) };
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
    doctorLastExamDate: med?.doctorLastExamDate
      ? med.doctorLastExamDate.slice(0, 10)
      : '',
    isUnderDoctorCare: med?.isUnderDoctorCare ?? false,
    prescribedMedicationDetails: med?.prescribedMedicationDetails ?? '',
    medicationSideEffects: med?.medicationSideEffects ?? '',
    allergies: toStrArray(med?.allergies),
    medicationAllergies: splitCsv(med?.medicationAllergies),
    medications: toStrArray(med?.medications),
    medicalPlan: med?.medicalPlan ?? '',
    hasSpecialNeeds: med?.hasSpecialNeeds ?? false,
    dentistName: med?.dentistName ?? '',
    dentistPhone: med?.dentistPhone ? formatPhoneUS(med.dentistPhone) : '',
    dentistAddress: {
      street: med?.dentistAddressStreet ?? '',
      city: med?.dentistAddressCity ?? '',
      state: med?.dentistAddressState ?? '',
      zip: med?.dentistAddressZip ?? '',
    },
    dentalPlan: med?.dentalPlan ?? '',
    specialDevices: med?.specialDevices ?? '',
    frequentColds: med?.frequentColds ?? false,
    frequentColdsCount:
      med?.frequentColdsCount != null ? String(med.frequentColdsCount) : '',
    pastIllnesses: buildIllnessState(med?.pastIllnesses ?? null),
    otherIllnesses: med?.otherIllnesses ?? '',
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
  const contacts: ContactRow[] = (child.contacts ?? []).map((c, i) => {
    const base = {
      id: c.id,
      contactType: c.contactType,
      name: c.name,
      relationship: c.relationship ?? '',
      phone: c.phone ? formatPhoneUS(c.phone) : '',
      homePhone: c.homePhone ? formatPhoneUS(c.homePhone) : '',
      workPhone: c.workPhone ? formatPhoneUS(c.workPhone) : '',
      address: {
        street: c.addressStreet ?? '',
        city: c.addressCity ?? '',
        state: c.addressState ?? '',
        zip: c.addressZip ?? '',
      },
    };
    return { rowKey: `c-${c.id}-${i}`, ...base, orig: contactSig(base) };
  });
  // Fase 2 (2B) — development / routines / toilet slices.
  const dev = child.development ?? null;
  const development: DevelopmentState = {
    walkedAtMonths: dev?.walkedAtMonths != null ? String(dev.walkedAtMonths) : '',
    talkedAtMonths: dev?.talkedAtMonths != null ? String(dev.talkedAtMonths) : '',
    toiletTrainedAtMonths:
      dev?.toiletTrainedAtMonths != null ? String(dev.toiletTrainedAtMonths) : '',
    developmentNotes: dev?.developmentNotes ?? '',
  };
  const routines: RoutinesState = {
    wakeUpTime: dev?.wakeUpTime ?? '',
    bedTime: dev?.bedTime ?? '',
    takesNap: dev?.takesNap ?? false,
    napStartTime: dev?.napStartTime ?? '',
    napEndTime: dev?.napEndTime ?? '',
    diet: dev?.diet ?? '',
    mealTimes: dev?.mealTimes ?? '',
  };
  const toilet: ToiletState = {
    toiletTrained: dev?.toiletTrained ?? false,
    toiletWords: dev?.toiletWords ?? '',
    toiletHelpLevel: dev?.toiletHelpLevel ?? '',
    toiletAccidents: dev?.toiletAccidents ?? '',
  };
  return { childState, medical, parents, contacts, development, routines, toilet };
}

export function ChildEditForm({ child }: { child: Child }) {
  const router = useRouter();
  const { t } = useTranslation();
  const seeded = useMemo(() => seed(child), [child]);

  const EDIT_TABS: ReadonlyArray<FilterTab<EditTab>> = [
    { value: 'child', label: t('children.childDetails') },
    { value: 'parents', label: t('children.colParents') },
    { value: 'medical', label: t('children.medical') },
    { value: 'contacts', label: t('children.contacts') },
    { value: 'development', label: t('children.development') },
    { value: 'routines', label: t('children.routines') },
    { value: 'toilet', label: t('children.toilet') },
  ];

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

  const [contacts, setContacts] = useState<ContactRow[]>(seeded.contacts);
  const [removedContactIds, setRemovedContactIds] = useState<string[]>([]);
  const [contactsBaseline, setContactsBaseline] = useState(() =>
    JSON.stringify({ c: seeded.contacts, r: [] as string[] }),
  );
  const [contactSeq, setContactSeq] = useState(0);

  // Fase 2 (2B) — development / routines / toilet (each saves on its own tab).
  const [development, setDevelopment] = useState<DevelopmentState>(seeded.development);
  const [developmentBaseline, setDevelopmentBaseline] = useState(() =>
    JSON.stringify(seeded.development),
  );
  const [routines, setRoutines] = useState<RoutinesState>(seeded.routines);
  const [routinesBaseline, setRoutinesBaseline] = useState(() =>
    JSON.stringify(seeded.routines),
  );
  const [toilet, setToilet] = useState<ToiletState>(seeded.toilet);
  const [toiletBaseline, setToiletBaseline] = useState(() =>
    JSON.stringify(seeded.toilet),
  );

  const [touched, setTouched] = useState(false);
  const [confirmSaveOpen, setConfirmSaveOpen] = useState(false);
  const [removeRow, setRemoveRow] = useState<ParentRow | null>(null);
  const [removeContact, setRemoveContact] = useState<ContactRow | null>(null);
  const [pendingTab, setPendingTab] = useState<EditTab | null>(null);

  const detailsMut = useUpdateChildDetails();
  const medicalMut = useUpdateChildMedicalInfo();
  const parentsMut = useUpdateChildParents();
  const contactsMut = useUpdateChildContacts();
  // One mutation shared by Development / Routines / Toilet — each tab sends
  // only its own fields (PATCH-merge), so they never clobber each other.
  const devMut = useUpdateChildDevelopment();
  const saving =
    detailsMut.isPending ||
    medicalMut.isPending ||
    parentsMut.isPending ||
    contactsMut.isPending ||
    devMut.isPending;
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
  const contactsDirty = JSON.stringify({ c: contacts, r: removedContactIds }) !== contactsBaseline;
  const developmentDirty = JSON.stringify(development) !== developmentBaseline;
  const routinesDirty = JSON.stringify(routines) !== routinesBaseline;
  const toiletDirty = JSON.stringify(toilet) !== toiletBaseline;
  const dirtyByTab: Record<EditTab, boolean> = {
    child: childDirty,
    parents: parentsDirty,
    medical: medicalDirty,
    contacts: contactsDirty,
    development: developmentDirty,
    routines: routinesDirty,
    toilet: toiletDirty,
  };
  const anyDirty =
    childDirty ||
    medicalDirty ||
    parentsDirty ||
    contactsDirty ||
    developmentDirty ||
    routinesDirty ||
    toiletDirty;
  const currentDirty = dirtyByTab[tab];

  // Module-exit guard (sidebar / back / refresh) — active if ANY tab is dirty.
  useUnsavedChangesPrompt(anyDirty, t('children.unsavedLeaveEdit'));

  const setC = <K extends keyof ChildState>(k: K, v: ChildState[K]) =>
    setChildState((s) => ({ ...s, [k]: v }));
  const setM = <K extends keyof MedicalState>(k: K, v: MedicalState[K]) =>
    setMedical((s) => ({ ...s, [k]: v }));
  const setIllness = (code: string, patch: Partial<IllnessEntryState>) =>
    setMedical((s) => ({
      ...s,
      pastIllnesses: {
        ...s.pastIllnesses,
        [code]: { ...s.pastIllnesses[code], ...patch },
      },
    }));
  const setDev = <K extends keyof DevelopmentState>(k: K, v: DevelopmentState[K]) =>
    setDevelopment((s) => ({ ...s, [k]: v }));
  const setRou = <K extends keyof RoutinesState>(k: K, v: RoutinesState[K]) =>
    setRoutines((s) => ({ ...s, [k]: v }));
  const setToi = <K extends keyof ToiletState>(k: K, v: ToiletState[K]) =>
    setToilet((s) => ({ ...s, [k]: v }));
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

  // ── Contacts handlers ──
  const setContact = (key: string, patch: Partial<ContactRow>) =>
    setContacts((cs) => cs.map((c) => (c.rowKey === key ? { ...c, ...patch } : c)));
  const addContactRow = (type: ChildContactType) => {
    const key = `nc-${contactSeq}`;
    setContactSeq((n) => n + 1);
    setContacts((cs) => [...cs, emptyContactRow(key, type)]);
  };
  const doRemoveContact = (row: ContactRow) => {
    setContacts((cs) => cs.filter((c) => c.rowKey !== row.rowKey));
    if (row.id) setRemovedContactIds((ids) => [...ids, row.id]);
  };
  const requestRemoveContact = (row: ContactRow) => {
    const isEmptyNew = !row.id && !row.name.trim();
    if (isEmptyNew) doRemoveContact(row);
    else setRemoveContact(row);
  };

  const contactErrors = useMemo(() => {
    const e: string[] = [];
    contacts.forEach((c) => {
      if (!c.name.trim()) e.push(t('children.errContactNameRequired'));
    });
    return [...new Set(e)];
  }, [contacts, t]);

  const childErrors = useMemo(() => {
    const e: string[] = [];
    if (!childState.firstName.trim()) e.push(t('children.errFirstNameRequired'));
    if (!childState.lastName.trim()) e.push(t('children.errLastNameRequired'));
    if (!childState.birthDate) e.push(t('children.errBirthDateRequired'));
    else if (childState.birthDate > todayStr) e.push(t('children.errBirthDateFuture'));
    if (!childState.gender) e.push(t('children.errGenderRequired'));
    return e;
  }, [childState, todayStr, t]);

  const parentErrors = useMemo(() => {
    const e: string[] = [];
    if (parents.length === 0) e.push(t('children.errAtLeastOneParent'));
    parents.forEach((p, i) => {
      const tag = `${t('children.parentWord')} ${i + 1}`;
      if (!p.relationship) e.push(`${tag}: ${t('children.errRelationshipRequired')}`);
      if (!p.linked && p.mode === 'existing' && !p.parentId) e.push(`${tag}: ${t('children.errPickExisting')}`);
      if (!p.linked && p.mode === 'new') {
        if (splitName(p.fullName).lastName === '') e.push(`${tag}: ${t('children.errFullNameRequired')}`);
        if (!EMAIL_RE.test(p.email.trim())) e.push(`${tag}: ${t('children.errEmailRequired')}`);
      }
    });
    if (parents.length > 0 && !parents.some((p) => p.isPrimary)) e.push(t('children.errMarkPrimary'));
    return e;
  }, [parents, t]);

  // Routines: the only validation is nap end-after-start (HH:mm string compare
  // works because the format is zero-padded 24h).
  const routinesErrors = useMemo(() => {
    const e: string[] = [];
    if (
      routines.takesNap &&
      routines.napStartTime &&
      routines.napEndTime &&
      routines.napEndTime <= routines.napStartTime
    ) {
      e.push(t('children.errNapEndBeforeStart'));
    }
    return e;
  }, [routines, t]);

  const currentErrors =
    tab === 'child'
      ? childErrors
      : tab === 'parents'
        ? parentErrors
        : tab === 'contacts'
          ? contactErrors
          : tab === 'routines'
            ? routinesErrors
            : [];

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
    // Fase 2 (2A) — extended medical history.
    isUnderDoctorCare: medical.isUnderDoctorCare,
    doctorLastExamDate: medical.doctorLastExamDate || undefined,
    prescribedMedicationDetails: undef(medical.prescribedMedicationDetails),
    medicationSideEffects: undef(medical.medicationSideEffects),
    dentistName: undef(medical.dentistName),
    dentistPhone: phoneDigits(medical.dentistPhone),
    dentistAddressStreet: undef(medical.dentistAddress.street),
    dentistAddressCity: undef(medical.dentistAddress.city),
    dentistAddressState: undef(medical.dentistAddress.state),
    dentistAddressZip: undef(medical.dentistAddress.zip),
    dentalPlan: undef(medical.dentalPlan),
    specialDevices: undef(medical.specialDevices),
    frequentColds: medical.frequentColds,
    frequentColdsCount: medical.frequentColdsCount.trim()
      ? Number(medical.frequentColdsCount)
      : undefined,
    // Only persist checked illnesses (date optional); unchecked are omitted.
    pastIllnesses: PAST_ILLNESSES.reduce<PastIllnesses>((acc, it) => {
      const e = medical.pastIllnesses[it.code];
      if (e?.checked) acc[it.code] = { checked: true, date: e.date || null };
      return acc;
    }, {}),
    otherIllnesses: undef(medical.otherIllnesses),
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

  // Fase 2 (2B) — one builder per tab. Each returns ONLY its own fields so the
  // PATCH merge leaves the other two tabs' columns untouched. Emptied fields go
  // out as `null` (clear), never `undefined` (which merge reads as "keep").
  const buildDevelopmentPayload = (): DevelopmentPayload => ({
    walkedAtMonths: numOrNull(development.walkedAtMonths),
    talkedAtMonths: numOrNull(development.talkedAtMonths),
    toiletTrainedAtMonths: numOrNull(development.toiletTrainedAtMonths),
    developmentNotes: orNull(development.developmentNotes),
  });

  const buildRoutinesPayload = (): DevelopmentPayload => ({
    wakeUpTime: orNull(routines.wakeUpTime),
    bedTime: orNull(routines.bedTime),
    takesNap: routines.takesNap,
    // Nap window only persists while takesNap is on; turning it off clears them.
    napStartTime: routines.takesNap ? orNull(routines.napStartTime) : null,
    napEndTime: routines.takesNap ? orNull(routines.napEndTime) : null,
    diet: orNull(routines.diet),
    mealTimes: orNull(routines.mealTimes),
  });

  const buildToiletPayload = (): DevelopmentPayload => ({
    toiletTrained: toilet.toiletTrained,
    toiletWords: orNull(toilet.toiletWords),
    toiletHelpLevel: toilet.toiletHelpLevel || null,
    toiletAccidents: orNull(toilet.toiletAccidents),
  });

  const buildContactOps = (): ContactOps => {
    const ops: ContactOps = { add: [], update: [], remove: [...removedContactIds] };
    for (const c of contacts) {
      const payload: ChildContactPayload = {
        contactType: c.contactType,
        name: c.name.trim(),
        relationship: undef(c.relationship),
        phone: phoneDigits(c.phone),
        homePhone: phoneDigits(c.homePhone),
        workPhone: phoneDigits(c.workPhone),
        addressStreet: undef(c.address.street),
        addressCity: undef(c.address.city),
        addressState: undef(c.address.state),
        addressZip: undef(c.address.zip),
      };
      if (!c.id) {
        ops.add.push(payload);
      } else if (contactSig(c) !== c.orig) {
        // Only PATCH existing contacts whose fields actually changed.
        ops.update.push({ id: c.id, payload });
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
        toast.success(t('children.toastDetailsSaved'));
      } else if (section === 'medical') {
        await medicalMut.mutateAsync({ childId: child.id, payload: buildMedicalPayload() });
        setMedicalBaseline(JSON.stringify(medical));
        toast.success(t('children.toastMedicalSaved'));
      } else if (section === 'contacts') {
        if (contactErrors.length) {
          setTouched(true);
          toast.error(contactErrors[0]);
          return false;
        }
        const fresh = await contactsMut.mutateAsync({ childId: child.id, ops: buildContactOps() });
        // Re-seed contacts from fresh data: new contacts now have real ids.
        const reseeded = seed(fresh).contacts;
        setContacts(reseeded);
        setRemovedContactIds([]);
        setContactsBaseline(JSON.stringify({ c: reseeded, r: [] }));
        toast.success(t('children.toastContactsSaved'));
      } else if (section === 'development') {
        await devMut.mutateAsync({ childId: child.id, payload: buildDevelopmentPayload() });
        setDevelopmentBaseline(JSON.stringify(development));
        toast.success(t('children.toastDevelopmentSaved'));
      } else if (section === 'routines') {
        if (routinesErrors.length) {
          setTouched(true);
          toast.error(routinesErrors[0]);
          return false;
        }
        await devMut.mutateAsync({ childId: child.id, payload: buildRoutinesPayload() });
        setRoutinesBaseline(JSON.stringify(routines));
        toast.success(t('children.toastRoutinesSaved'));
      } else if (section === 'toilet') {
        await devMut.mutateAsync({ childId: child.id, payload: buildToiletPayload() });
        setToiletBaseline(JSON.stringify(toilet));
        toast.success(t('children.toastToiletSaved'));
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
        toast.success(t('children.toastParentsSaved'));
      }
      setTouched(false);
      return true;
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t('children.toastSaveFailed'));
      return false;
    }
  };

  const discardCurrentTab = () => {
    if (tab === 'child') setChildState(JSON.parse(childBaseline) as ChildState);
    else if (tab === 'medical') setMedical(JSON.parse(medicalBaseline) as MedicalState);
    else if (tab === 'development')
      setDevelopment(JSON.parse(developmentBaseline) as DevelopmentState);
    else if (tab === 'routines')
      setRoutines(JSON.parse(routinesBaseline) as RoutinesState);
    else if (tab === 'toilet') setToilet(JSON.parse(toiletBaseline) as ToiletState);
    else if (tab === 'contacts') {
      const b = JSON.parse(contactsBaseline) as { c: ContactRow[]; r: string[] };
      setContacts(b.c);
      setRemovedContactIds(b.r);
    } else {
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

  const SAVE_LABEL_KEYS: Record<EditTab, string> = {
    child: 'children.saveDetails',
    parents: 'children.saveParents',
    medical: 'children.saveMedical',
    contacts: 'children.saveContacts',
    development: 'children.saveDevelopment',
    routines: 'children.saveRoutines',
    toilet: 'children.saveToilet',
  };
  const saveLabel = t(SAVE_LABEL_KEYS[tab]);

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <FilterTabs tabs={EDIT_TABS} value={tab} onChange={handleTabChange} ariaLabel={t('children.editSectionsAria')} />

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
        <CardWithHeader title={t('children.childDetails')}>
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label={t('children.firstName')} required>
                <NameInput value={childState.firstName} onChange={(v) => setC('firstName', v)} />
              </Field>
              <Field label={t('children.middleName')}>
                <NameInput value={childState.middleName} onChange={(v) => setC('middleName', v)} />
              </Field>
              <Field label={t('children.lastName')} required>
                <NameInput value={childState.lastName} onChange={(v) => setC('lastName', v)} />
              </Field>
              <Field label={t('children.birthDate')} required>
                <DateField value={childState.birthDate} onChange={(e) => setC('birthDate', e.target.value)} max={todayStr} />
              </Field>
              <Field label={t('children.gender')} required>
                <PlainSelect value={childState.gender} onValueChange={(v) => setC('gender', v)} options={GENDERS} />
              </Field>
              <Field label={t('children.enrollmentStatus')} required>
                <PlainSelect value={childState.enrollmentStatus} onValueChange={(v) => setC('enrollmentStatus', v)} options={ENROLLMENT_STATUSES} />
              </Field>
            </div>
            <div className="rounded-lg p-4 space-y-4" style={{ background: 'var(--kc-surface-2)' }}>
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--kc-text-3)' }}>
                {t('children.childsAddress')}
              </p>
              <AddressFields value={childState.address} onChange={(f, v) => setC('address', { ...childState.address, [f]: v })} />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label={t('children.admissionDate')}>
                <DateField value={childState.admissionDate} onChange={(e) => setC('admissionDate', e.target.value)} />
              </Field>
              <Field label={t('children.firstDayOfCare')}>
                <DateField value={childState.firstCareDay} onChange={(e) => setC('firstCareDay', e.target.value)} />
              </Field>
            </div>
          </div>
        </CardWithHeader>
      )}

      {tab === 'parents' && (
        <CardWithHeader title={t('children.parentsGuardians')}>
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
              {t('children.addParent')}
            </Button>
          </div>
        </CardWithHeader>
      )}

      {tab === 'medical' && (
        <CardWithHeader title={t('children.medical')}>
          <div className="space-y-6">
            {/* ── Doctor ─────────────────────────────────────────────── */}
            <section className="space-y-4">
              <SectionLabel>{t('children.sectionDoctor')}</SectionLabel>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label={t('children.doctorName')}>
                  <NameInput value={medical.doctorName} onChange={(v) => setM('doctorName', v)} />
                </Field>
                <Field label={t('children.doctorPhone')}>
                  <PhoneInput value={medical.doctorPhone} onChange={(v) => setM('doctorPhone', v)} />
                </Field>
                <Field label={t('children.doctorAddress')} className="sm:col-span-2">
                  <Input value={medical.doctorAddress} onChange={(e) => setM('doctorAddress', e.target.value)} />
                </Field>
                <Field label={t('children.doctorLastExamDate')}>
                  <DateField value={medical.doctorLastExamDate} onChange={(e) => setM('doctorLastExamDate', e.target.value)} max={todayStr} />
                </Field>
              </div>
              <CheckboxRow
                checked={medical.isUnderDoctorCare}
                onChange={(c) => setM('isUnderDoctorCare', c)}
                label={t('children.isUnderDoctorCare')}
              />
              <Field label={t('children.prescribedMedicationDetails')}>
                <MedTextarea value={medical.prescribedMedicationDetails} onChange={(v) => setM('prescribedMedicationDetails', v)} />
              </Field>
              <Field label={t('children.medicationSideEffects')}>
                <MedTextarea value={medical.medicationSideEffects} onChange={(v) => setM('medicationSideEffects', v)} />
              </Field>
            </section>

            {/* ── Allergies & medications (lists) ────────────────────── */}
            <section className="space-y-4">
              <EditableList label={t('children.allergies')} items={medical.allergies} onChange={(v) => setM('allergies', v)} placeholder={t('children.addAllergy')} />
              <EditableList label={t('children.medicationAllergies')} items={medical.medicationAllergies} onChange={(v) => setM('medicationAllergies', v)} placeholder={t('children.addMedicationAllergy')} />
              <EditableList label={t('children.medications')} items={medical.medications} onChange={(v) => setM('medications', v)} placeholder={t('children.addMedication')} />
              <Field label={t('children.medicalPlan')}>
                <MedTextarea value={medical.medicalPlan} onChange={(v) => setM('medicalPlan', v)} />
              </Field>
            </section>

            {/* ── Dentist ────────────────────────────────────────────── */}
            <section className="space-y-4">
              <SectionLabel>{t('children.sectionDentist')}</SectionLabel>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label={t('children.dentistName')}>
                  <NameInput value={medical.dentistName} onChange={(v) => setM('dentistName', v)} />
                </Field>
                <Field label={t('children.dentistPhone')}>
                  <PhoneInput value={medical.dentistPhone} onChange={(v) => setM('dentistPhone', v)} />
                </Field>
                <Field label={t('children.dentalPlan')} className="sm:col-span-2">
                  <Input value={medical.dentalPlan} onChange={(e) => setM('dentalPlan', e.target.value)} />
                </Field>
              </div>
              <div className="rounded-lg p-4 space-y-4" style={{ background: 'var(--kc-surface-2)' }}>
                <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--kc-text-3)' }}>
                  {t('children.dentistAddress')}
                </p>
                <AddressFields value={medical.dentistAddress} onChange={(f, v) => setM('dentistAddress', { ...medical.dentistAddress, [f]: v })} />
              </div>
            </section>

            {/* ── Health ─────────────────────────────────────────────── */}
            <section className="space-y-4">
              <SectionLabel>{t('children.sectionHealth')}</SectionLabel>
              <Field label={t('children.specialDevices')}>
                <MedTextarea value={medical.specialDevices} onChange={(v) => setM('specialDevices', v)} />
              </Field>
              <div className="flex flex-wrap items-end gap-4">
                <CheckboxRow
                  checked={medical.frequentColds}
                  onChange={(c) => setM('frequentColds', c)}
                  label={t('children.frequentColds')}
                />
                {medical.frequentColds && (
                  <Field label={t('children.frequentColdsCount')} className="w-28">
                    <NumericInput value={medical.frequentColdsCount} onChange={(v) => setM('frequentColdsCount', v)} maxLength={3} />
                  </Field>
                )}
              </div>
              <CheckboxRow
                checked={medical.hasSpecialNeeds}
                onChange={(c) => setM('hasSpecialNeeds', c)}
                label={t('children.hasSpecialNeeds')}
              />
            </section>

            {/* ── Past illnesses (checklist) ─────────────────────────── */}
            <section className="space-y-3">
              <SectionLabel>{t('children.sectionPastIllnesses')}</SectionLabel>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {PAST_ILLNESSES.map((it) => (
                  <PastIllnessRow
                    key={it.code}
                    label={t(it.labelKey)}
                    entry={medical.pastIllnesses[it.code]}
                    onToggle={(c) => setIllness(it.code, { checked: c })}
                    onDate={(d) => setIllness(it.code, { date: d })}
                    max={todayStr}
                    dateAria={t('children.illnessDateAria')}
                  />
                ))}
              </div>
              <Field label={t('children.otherIllnesses')}>
                <MedTextarea value={medical.otherIllnesses} onChange={(v) => setM('otherIllnesses', v)} />
              </Field>
            </section>
          </div>
        </CardWithHeader>
      )}

      {tab === 'contacts' && (
        <CardWithHeader title={t('children.contacts')}>
          <div className="space-y-6">
            {CONTACT_GROUPS.map((g) => {
              const rows = contacts.filter((c) => c.contactType === g.type);
              return (
                <section key={g.type} className="space-y-3">
                  <SectionLabel>{t(g.titleKey)}</SectionLabel>
                  {g.noteKey && (
                    <p
                      className="rounded-md px-3 py-2 text-xs"
                      style={{ background: 'var(--kc-warning-bg, var(--kc-surface-2))', color: 'var(--kc-text-2)' }}
                    >
                      {t(g.noteKey)}
                    </p>
                  )}
                  {rows.map((c) => (
                    <ContactCard
                      key={c.rowKey}
                      row={c}
                      fields={g.fields}
                      onChange={(patch) => setContact(c.rowKey, patch)}
                      onRemove={() => requestRemoveContact(c)}
                    />
                  ))}
                  <Button variant="outline" onClick={() => addContactRow(g.type)} className="w-full">
                    <Plus className="mr-1.5 h-4 w-4" />
                    {t('children.addContact')}
                  </Button>
                </section>
              );
            })}
          </div>
        </CardWithHeader>
      )}

      {tab === 'development' && (
        <CardWithHeader title={t('children.development')}>
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Field label={t('children.walkedAtMonths')}>
                <NumericInput value={development.walkedAtMonths} onChange={(v) => setDev('walkedAtMonths', v)} maxLength={3} />
              </Field>
              <Field label={t('children.talkedAtMonths')}>
                <NumericInput value={development.talkedAtMonths} onChange={(v) => setDev('talkedAtMonths', v)} maxLength={3} />
              </Field>
              <Field label={t('children.toiletTrainedAtMonths')}>
                <NumericInput value={development.toiletTrainedAtMonths} onChange={(v) => setDev('toiletTrainedAtMonths', v)} maxLength={3} />
              </Field>
            </div>
            <Field label={t('children.developmentNotes')}>
              <MedTextarea value={development.developmentNotes} onChange={(v) => setDev('developmentNotes', v)} />
            </Field>
          </div>
        </CardWithHeader>
      )}

      {tab === 'routines' && (
        <CardWithHeader title={t('children.routines')}>
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label={t('children.wakeUpTime')}>
                <TimeField value={routines.wakeUpTime} onChange={(e) => setRou('wakeUpTime', e.target.value)} />
              </Field>
              <Field label={t('children.bedTime')}>
                <TimeField value={routines.bedTime} onChange={(e) => setRou('bedTime', e.target.value)} />
              </Field>
            </div>
            <CheckboxRow checked={routines.takesNap} onChange={(c) => setRou('takesNap', c)} label={t('children.takesNap')} />
            {routines.takesNap && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label={t('children.napStartTime')}>
                  <TimeField value={routines.napStartTime} onChange={(e) => setRou('napStartTime', e.target.value)} />
                </Field>
                <Field label={t('children.napEndTime')}>
                  <TimeField value={routines.napEndTime} onChange={(e) => setRou('napEndTime', e.target.value)} />
                </Field>
              </div>
            )}
            <Field label={t('children.diet')}>
              <MedTextarea value={routines.diet} onChange={(v) => setRou('diet', v)} />
            </Field>
            <Field label={t('children.mealTimes')}>
              <MedTextarea value={routines.mealTimes} onChange={(v) => setRou('mealTimes', v)} />
            </Field>
          </div>
        </CardWithHeader>
      )}

      {tab === 'toilet' && (
        <CardWithHeader title={t('children.toilet')}>
          <div className="space-y-4">
            <CheckboxRow checked={toilet.toiletTrained} onChange={(c) => setToi('toiletTrained', c)} label={t('children.toiletTrained')} />
            <Field label={t('children.toiletHelpLevel')} className="sm:max-w-xs">
              <PlainSelect value={toilet.toiletHelpLevel} onValueChange={(v) => setToi('toiletHelpLevel', v)} options={TOILET_HELP_LEVELS} />
            </Field>
            <Field label={t('children.toiletWords')}>
              <Input value={toilet.toiletWords} onChange={(e) => setToi('toiletWords', e.target.value)} />
            </Field>
            <Field label={t('children.toiletAccidents')}>
              <MedTextarea value={toilet.toiletAccidents} onChange={(v) => setToi('toiletAccidents', v)} />
            </Field>
          </div>
        </CardWithHeader>
      )}

      <div className="flex items-center justify-between gap-2">
        <Button asChild variant="ghost">
          <Link href={`/children/${child.id}`}>{t('children.cancel')}</Link>
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
            <AlertDialogTitle>{t('children.saveChangesTitle')}</AlertDialogTitle>
            <AlertDialogDescription>{t('children.saveChangesDesc')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>{t('children.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                setConfirmSaveOpen(false);
                void saveSection(tab);
              }}
            >
              {t('children.save')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Tab-switch guard — current section has unsaved changes */}
      <AlertDialog open={pendingTab !== null} onOpenChange={(o) => !o && setPendingTab(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('children.unsavedTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('children.unsavedTabDesc')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:gap-2">
            <AlertDialogCancel disabled={saving}>{t('children.cancel')}</AlertDialogCancel>
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
              {t('children.discard')}
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
              {t('children.saveAndContinue')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Remove-parent confirm */}
      <AlertDialog open={removeRow !== null} onOpenChange={(o) => !o && setRemoveRow(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('children.removeParentTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('children.removeParentDescEdit')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('children.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                if (removeRow) doRemoveRow(removeRow);
                setRemoveRow(null);
              }}
              style={{ background: 'var(--kc-error)', color: 'white' }}
            >
              {t('children.remove')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Remove-contact confirm */}
      <AlertDialog open={removeContact !== null} onOpenChange={(o) => !o && setRemoveContact(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('children.removeContactTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('children.removeContactDesc')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('children.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                if (removeContact) doRemoveContact(removeContact);
                setRemoveContact(null);
              }}
              style={{ background: 'var(--kc-error)', color: 'white' }}
            >
              {t('children.remove')}
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
  options: Array<{ value: string; labelKey: string }>;
}) {
  const { t } = useTranslation();
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder={t('children.selectPlaceholder')} />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {t(o.labelKey)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// Uppercase section divider used inside the Medical tab.
function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--kc-text-3)' }}>
      {children}
    </p>
  );
}

// Themed multi-line text input (matches the existing medicalPlan textarea).
function MedTextarea({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <textarea
      className="w-full min-h-[72px] rounded-md border px-3 py-2 text-sm"
      style={{ borderColor: 'var(--kc-border)', background: 'var(--kc-bg)', color: 'var(--kc-text-1)' }}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

// Checkbox + label row (the recurring pattern in this form).
function CheckboxRow({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: 'var(--kc-text-2)' }}>
      <Checkbox checked={checked} onCheckedChange={(c) => onChange(c === true)} />
      {label}
    </label>
  );
}

// One past-illness row: checkbox + label, with an optional date once checked.
function PastIllnessRow({
  label,
  entry,
  onToggle,
  onDate,
  max,
  dateAria,
}: {
  label: string;
  entry: IllnessEntryState;
  onToggle: (checked: boolean) => void;
  onDate: (date: string) => void;
  max: string;
  dateAria: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-md border p-2.5" style={{ borderColor: 'var(--kc-border)' }}>
      <label className="flex flex-1 items-center gap-2 text-sm cursor-pointer" style={{ color: 'var(--kc-text-2)' }}>
        <Checkbox checked={entry.checked} onCheckedChange={(c) => onToggle(c === true)} />
        {label}
      </label>
      {entry.checked && (
        <div className="w-40 flex-none">
          <DateField
            value={entry.date}
            onChange={(e) => onDate(e.target.value)}
            max={max}
            aria-label={`${dateAria} ${label}`}
          />
        </div>
      )}
    </div>
  );
}

// One contact card. `fields` controls which inputs show (per contact group).
function ContactCard({
  row,
  fields,
  onChange,
  onRemove,
}: {
  row: ContactRow;
  fields: ReadonlyArray<ContactField>;
  onChange: (patch: Partial<ContactRow>) => void;
  onRemove: () => void;
}) {
  const { t } = useTranslation();
  const has = (f: ContactField) => fields.includes(f);
  return (
    <div className="rounded-lg border p-4 space-y-4" style={{ borderColor: 'var(--kc-border)' }}>
      <div className="flex items-start gap-3">
        <Field label={t('children.contactName')} required className="flex-1">
          <NameInput value={row.name} onChange={(v) => onChange({ name: v })} />
        </Field>
        <Button
          variant="ghost"
          size="icon"
          className="mt-6 h-7 w-7 flex-none"
          onClick={onRemove}
          aria-label={t('children.removeContactAria')}
        >
          <Trash2 className="h-3.5 w-3.5" style={{ color: 'var(--kc-error)' }} />
        </Button>
      </div>

      {(has('relationship') || has('phone') || has('homePhone') || has('workPhone')) && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {has('relationship') && (
            <Field label={t('children.relationship')}>
              <Input value={row.relationship} onChange={(e) => onChange({ relationship: e.target.value })} />
            </Field>
          )}
          {has('phone') && (
            <Field label={t('children.phone')}>
              <PhoneInput value={row.phone} onChange={(v) => onChange({ phone: v })} />
            </Field>
          )}
          {has('homePhone') && (
            <Field label={t('children.homePhone')}>
              <PhoneInput value={row.homePhone} onChange={(v) => onChange({ homePhone: v })} />
            </Field>
          )}
          {has('workPhone') && (
            <Field label={t('children.workPhone')}>
              <PhoneInput value={row.workPhone} onChange={(v) => onChange({ workPhone: v })} />
            </Field>
          )}
        </div>
      )}

      {has('address') && (
        <div className="rounded-lg p-4 space-y-4" style={{ background: 'var(--kc-surface-2)' }}>
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--kc-text-3)' }}>
            {t('children.contactAddress')}
          </p>
          <AddressFields value={row.address} onChange={(f, v) => onChange({ address: { ...row.address, [f]: v } })} />
        </div>
      )}
    </div>
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
  const { t } = useTranslation();
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
          {t('children.parentWord')} {index + 1}
          {row.linked && (
            <span className="ml-2 text-xs font-normal" style={{ color: 'var(--kc-text-3)' }}>
              {row.displayName}
            </span>
          )}
        </span>
        {canRemove && (
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onRemove} aria-label={t('children.removeParentAria')}>
            <Trash2 className="h-3.5 w-3.5" style={{ color: 'var(--kc-error)' }} />
          </Button>
        )}
      </div>

      {row.linked ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label={t('children.fullName')}>
            <Input value={row.displayName} disabled />
          </Field>
          <Field label={t('children.email')}>
            <Input value={row.displayEmail} disabled />
          </Field>
        </div>
      ) : (
        <>
          <div className="flex gap-2">
            <Button variant={row.mode === 'new' ? 'default' : 'outline'} size="sm" onClick={() => onChange({ mode: 'new' })}>
              {t('children.newParentBtn')}
            </Button>
            <Button
              variant={row.mode === 'existing' ? 'default' : 'outline'}
              size="sm"
              onClick={() => onChange({ mode: 'existing' })}
              disabled={linkableParents.length === 0}
            >
              {t('children.linkExisting')}
            </Button>
          </div>

          {row.mode === 'existing' ? (
            <Field label={t('children.existingParent')} required>
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
                <Field label={t('children.fullName')} required className="sm:col-span-2">
                  <NameInput value={row.fullName} onChange={(v) => onChange({ fullName: v })} placeholder={t('children.fullNamePlaceholder')} />
                </Field>
                <Field label={t('children.email')} required>
                  <Input type="email" value={row.email} onChange={(e) => onChange({ email: e.target.value })} />
                </Field>
                <Field label={t('children.phone')}>
                  <PhoneInput value={row.phone} onChange={(v) => onChange({ phone: v })} />
                </Field>
              </div>
              <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: 'var(--kc-text-2)' }}>
                <Checkbox checked={row.isPrimary} onCheckedChange={() => onPrimary()} />
                {t('children.primaryContact')}
              </label>
            </>
          )}
        </>
      )}

      <Field label={t('children.relationship')} required className="sm:max-w-xs">
        <PlainSelect value={row.relationship} onValueChange={(v) => onChange({ relationship: v })} options={RELATIONSHIPS} />
      </Field>

      <div className="flex flex-wrap gap-4">
        {(row.linked || row.mode === 'existing') && (
          <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: 'var(--kc-text-2)' }}>
            <Checkbox checked={row.isPrimary} onCheckedChange={() => onPrimary()} />
            {t('children.primaryContact')}
          </label>
        )}
        <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: 'var(--kc-text-2)' }}>
          <Checkbox checked={row.livesWithChild} onCheckedChange={(c) => onChange({ livesWithChild: c === true })} />
          {t('children.livesWithChild')}
        </label>
      </div>

      {!row.linked && row.mode === 'new' && (
        <>
          <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: 'var(--kc-text-2)' }}>
            <Checkbox checked={row.sameAddressAsChild} onCheckedChange={(c) => onChange({ sameAddressAsChild: c === true })} />
            {t('children.sameAddressAsChild')}
          </label>
          {!row.sameAddressAsChild && (
            <div className="rounded-lg p-4" style={{ background: 'var(--kc-surface-2)' }}>
              <AddressFields value={row.home} onChange={(f, v) => onChange({ home: { ...row.home, [f]: v } })} />
            </div>
          )}
          <Collapsible open={row.showWork} onOpenChange={(o) => onChange({ showWork: o })}>
            <CollapsibleTrigger className="flex items-center gap-1.5 text-sm font-medium" style={{ color: 'var(--kc-p-600)' }}>
              <ChevronDown className={cn('h-4 w-4 transition-transform', row.showWork && 'rotate-180')} />
              {t('children.workDetailsOptional')}
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 pt-3">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label={t('children.employer')}>
                  <NameInput value={row.workEmployer} onChange={(v) => onChange({ workEmployer: v })} />
                </Field>
                <Field label={t('children.workPhone')}>
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
