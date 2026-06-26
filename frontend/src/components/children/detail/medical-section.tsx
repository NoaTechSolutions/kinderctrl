'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Calendar,
  FileText,
  Hash,
  Heart,
  MapPin,
  Phone,
  Pill,
  ShieldCheck,
  Smile,
  Stethoscope,
  Thermometer,
  User,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { NameInput } from '@/components/ui/name-input';
import { NumericInput } from '@/components/ui/numeric-input';
import { PhoneInput } from '@/components/ui/phone-input';
import { DateField } from '@/components/ui/date-field';
import { useTranslation } from '@/lib/i18n';
import { useUpdateChildMedicalInfo } from '@/lib/hooks/use-children';
import type { Child } from '@/lib/types/child';
import { Field, AddressFields, EditableList } from '../child-form-fields';
import { CheckboxRow, MedTextarea, PastIllnessRow } from './section-fields';
import { ReadGrid, ReadRow, fmtDate, joinAddress, useBoolText } from './read-view';
import { SectionFrame } from './section-frame';
import {
  useSectionEditor,
  type SectionEditorHandle,
  type SectionProps,
} from './use-section-editor';
import {
  PAST_ILLNESSES,
  buildMedAllergiesPayload,
  buildMedDentistPayload,
  buildMedDoctorPayload,
  buildMedHealthPayload,
  buildMedIllnessesPayload,
  buildMedInsurancePayload,
  seedMedAllergies,
  seedMedDentist,
  seedMedDoctor,
  seedMedHealth,
  seedMedIllnesses,
  seedMedInsurance,
  type MedAllergiesState,
  type MedDentistState,
  type MedDoctorState,
  type MedHealthState,
  type MedIllnessesState,
  type MedInsuranceState,
} from './section-data';

// No-op handle published to the shell when NO card is editing.
const READ_HANDLE: SectionEditorHandle = {
  editing: false,
  dirty: false,
  save: async () => true,
  cancel: () => {},
};

type MedCardId = 'doctor' | 'allergies' | 'dentist' | 'health' | 'insurance' | 'illnesses';

interface MedCardProps {
  child: Child;
  canManage: boolean;
  canEdit: boolean;
  onCardEditorChange: (id: MedCardId, h: SectionEditorHandle) => void;
}

// The Medical tab is a CONTAINER of independent cards. One card edits at a time
// (others' Edit disabled while one is open), and the active card's handle is
// published to the shell so the tab-switch / module-exit guard still works.
export function MedicalSection({ child, canManage, onEditorChange }: SectionProps) {
  const [handles, setHandles] = useState<Partial<Record<MedCardId, SectionEditorHandle>>>({});
  const setHandle = useCallback((id: MedCardId, h: SectionEditorHandle) => {
    setHandles((prev) => (prev[id] === h ? prev : { ...prev, [id]: h }));
  }, []);

  const editingId =
    (Object.keys(handles) as MedCardId[]).find((k) => handles[k]?.editing) ?? null;
  const editingHandle = editingId ? handles[editingId]! : null;
  const canEditAny = editingId === null;

  useEffect(() => {
    onEditorChange(editingHandle ?? READ_HANDLE);
  }, [editingHandle, onEditorChange]);

  const common = { child, canManage, canEdit: canEditAny, onCardEditorChange: setHandle };

  return (
    <div className="space-y-4">
      <DoctorCard {...common} />
      <AllergiesCard {...common} />
      <DentistCard {...common} />
      <HealthCard {...common} />
      <InsuranceCard {...common} />
      <IllnessesCard {...common} />
    </div>
  );
}

const list = (xs: string[]) => (xs.length ? xs.join(', ') : '—');

// ── Doctor ──────────────────────────────────────────────────────────────────
function DoctorCard({ child, canManage, canEdit, onCardEditorChange }: MedCardProps) {
  const { t, locale } = useTranslation();
  const boolText = useBoolText();
  const mut = useUpdateChildMedicalInfo();
  const todayStr = new Date().toLocaleDateString('en-CA');
  const seed = useMemo(() => seedMedDoctor(child), [child]);
  const ed = useSectionEditor<MedDoctorState>({
    seed,
    saving: mut.isPending,
    save: (s) => mut.mutateAsync({ childId: child.id, payload: buildMedDoctorPayload(s) }),
  });
  useEffect(() => onCardEditorChange('doctor', ed.handle), [ed.handle, onCardEditorChange]);
  const { state, setState } = ed;
  const set = <K extends keyof MedDoctorState>(k: K, v: MedDoctorState[K]) =>
    setState((s) => ({ ...s, [k]: v }));
  const m = seed;

  return (
    <SectionFrame
      id="medical-card-doctor"
      title={t('children.sectionDoctor')}
      icon={Stethoscope}
      mode={ed.mode}
      dirty={ed.dirty}
      saving={ed.saving}
      canManage={canManage}
      canEdit={canEdit}
      onEdit={ed.enterEdit}
      onSave={ed.save}
      onCancel={ed.cancel}
    >
      {ed.mode === 'read' ? (
        <ReadGrid>
          <ReadRow icon={User} label={t('children.doctorName')} value={m.doctorName} />
          <ReadRow icon={Phone} label={t('children.doctorPhone')} value={m.doctorPhone} />
          <ReadRow icon={MapPin} label={t('children.doctorAddress')} value={m.doctorAddress} full />
          <ReadRow icon={Calendar} label={t('children.doctorLastExamDate')} value={fmtDate(m.doctorLastExamDate || null, locale)} />
          <ReadRow icon={Heart} label={t('children.isUnderDoctorCare')} value={boolText(m.isUnderDoctorCare)} />
          <ReadRow icon={Pill} label={t('children.prescribedMedicationDetails')} value={m.prescribedMedicationDetails} full />
          <ReadRow icon={AlertTriangle} label={t('children.medicationSideEffects')} value={m.medicationSideEffects} full />
        </ReadGrid>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field icon={User} label={t('children.doctorName')}>
              <NameInput value={state.doctorName} onChange={(v) => set('doctorName', v)} />
            </Field>
            <Field icon={Phone} label={t('children.doctorPhone')}>
              <PhoneInput value={state.doctorPhone} onChange={(v) => set('doctorPhone', v)} />
            </Field>
            <Field icon={MapPin} label={t('children.doctorAddress')} className="sm:col-span-2">
              <Input value={state.doctorAddress} onChange={(e) => set('doctorAddress', e.target.value)} />
            </Field>
            <Field icon={Calendar} label={t('children.doctorLastExamDate')}>
              <DateField value={state.doctorLastExamDate} onChange={(e) => set('doctorLastExamDate', e.target.value)} max={todayStr} />
            </Field>
          </div>
          <CheckboxRow checked={state.isUnderDoctorCare} onChange={(c) => set('isUnderDoctorCare', c)} label={t('children.isUnderDoctorCare')} />
          <Field icon={Pill} label={t('children.prescribedMedicationDetails')}>
            <MedTextarea value={state.prescribedMedicationDetails} onChange={(v) => set('prescribedMedicationDetails', v)} />
          </Field>
          <Field icon={AlertTriangle} label={t('children.medicationSideEffects')}>
            <MedTextarea value={state.medicationSideEffects} onChange={(v) => set('medicationSideEffects', v)} />
          </Field>
        </div>
      )}
    </SectionFrame>
  );
}

// ── Allergies & medications ───────────────────────────────────────────────────
function AllergiesCard({ child, canManage, canEdit, onCardEditorChange }: MedCardProps) {
  const { t } = useTranslation();
  const mut = useUpdateChildMedicalInfo();
  const seed = useMemo(() => seedMedAllergies(child), [child]);
  const ed = useSectionEditor<MedAllergiesState>({
    seed,
    saving: mut.isPending,
    save: (s) => mut.mutateAsync({ childId: child.id, payload: buildMedAllergiesPayload(s) }),
  });
  useEffect(() => onCardEditorChange('allergies', ed.handle), [ed.handle, onCardEditorChange]);
  const { state, setState } = ed;
  const set = <K extends keyof MedAllergiesState>(k: K, v: MedAllergiesState[K]) =>
    setState((s) => ({ ...s, [k]: v }));
  const m = seed;

  return (
    <SectionFrame
      id="medical-card-allergies"
      title={t('children.allergiesMedications')}
      icon={Pill}
      mode={ed.mode}
      dirty={ed.dirty}
      saving={ed.saving}
      canManage={canManage}
      canEdit={canEdit}
      onEdit={ed.enterEdit}
      onSave={ed.save}
      onCancel={ed.cancel}
    >
      {ed.mode === 'read' ? (
        <ReadGrid>
          <ReadRow icon={AlertTriangle} label={t('children.allergies')} value={list(m.allergies)} />
          <ReadRow icon={AlertTriangle} label={t('children.medicationAllergies')} value={list(m.medicationAllergies)} />
          <ReadRow icon={Pill} label={t('children.medications')} value={list(m.medications)} />
          <ReadRow icon={FileText} label={t('children.medicalPlan')} value={m.medicalPlan} full />
        </ReadGrid>
      ) : (
        <div className="space-y-4">
          <EditableList icon={AlertTriangle} label={t('children.allergies')} items={state.allergies} onChange={(v) => set('allergies', v)} placeholder={t('children.addAllergy')} />
          <EditableList icon={AlertTriangle} label={t('children.medicationAllergies')} items={state.medicationAllergies} onChange={(v) => set('medicationAllergies', v)} placeholder={t('children.addMedicationAllergy')} />
          <EditableList icon={Pill} label={t('children.medications')} items={state.medications} onChange={(v) => set('medications', v)} placeholder={t('children.addMedication')} />
          <Field icon={FileText} label={t('children.medicalPlan')}>
            <MedTextarea value={state.medicalPlan} onChange={(v) => set('medicalPlan', v)} />
          </Field>
        </div>
      )}
    </SectionFrame>
  );
}

// ── Dentist ───────────────────────────────────────────────────────────────────
function DentistCard({ child, canManage, canEdit, onCardEditorChange }: MedCardProps) {
  const { t } = useTranslation();
  const mut = useUpdateChildMedicalInfo();
  const seed = useMemo(() => seedMedDentist(child), [child]);
  const ed = useSectionEditor<MedDentistState>({
    seed,
    saving: mut.isPending,
    save: (s) => mut.mutateAsync({ childId: child.id, payload: buildMedDentistPayload(s) }),
  });
  useEffect(() => onCardEditorChange('dentist', ed.handle), [ed.handle, onCardEditorChange]);
  const { state, setState } = ed;
  const set = <K extends keyof MedDentistState>(k: K, v: MedDentistState[K]) =>
    setState((s) => ({ ...s, [k]: v }));
  const m = seed;

  return (
    <SectionFrame
      id="medical-card-dentist"
      title={t('children.sectionDentist')}
      icon={Smile}
      mode={ed.mode}
      dirty={ed.dirty}
      saving={ed.saving}
      canManage={canManage}
      canEdit={canEdit}
      onEdit={ed.enterEdit}
      onSave={ed.save}
      onCancel={ed.cancel}
    >
      {ed.mode === 'read' ? (
        <ReadGrid>
          <ReadRow icon={Smile} label={t('children.dentistName')} value={m.dentistName} />
          <ReadRow icon={Phone} label={t('children.dentistPhone')} value={m.dentistPhone} />
          <ReadRow
            icon={MapPin}
            label={t('children.dentistAddress')}
            value={joinAddress([m.dentistAddress.street, m.dentistAddress.city, m.dentistAddress.state, m.dentistAddress.zip])}
            full
          />
          <ReadRow icon={FileText} label={t('children.dentalPlan')} value={m.dentalPlan} full />
        </ReadGrid>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field icon={Smile} label={t('children.dentistName')}>
              <NameInput value={state.dentistName} onChange={(v) => set('dentistName', v)} />
            </Field>
            <Field icon={Phone} label={t('children.dentistPhone')}>
              <PhoneInput value={state.dentistPhone} onChange={(v) => set('dentistPhone', v)} />
            </Field>
            <Field icon={FileText} label={t('children.dentalPlan')} className="sm:col-span-2">
              <Input value={state.dentalPlan} onChange={(e) => set('dentalPlan', e.target.value)} />
            </Field>
          </div>
          <div className="rounded-lg p-4 space-y-4" style={{ background: 'var(--kc-surface-2)' }}>
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--kc-text-3)' }}>
              {t('children.dentistAddress')}
            </p>
            <AddressFields value={state.dentistAddress} onChange={(f, v) => set('dentistAddress', { ...state.dentistAddress, [f]: v })} />
          </div>
        </div>
      )}
    </SectionFrame>
  );
}

// ── Health ────────────────────────────────────────────────────────────────────
function HealthCard({ child, canManage, canEdit, onCardEditorChange }: MedCardProps) {
  const { t } = useTranslation();
  const boolText = useBoolText();
  const mut = useUpdateChildMedicalInfo();
  const seed = useMemo(() => seedMedHealth(child), [child]);
  const ed = useSectionEditor<MedHealthState>({
    seed,
    saving: mut.isPending,
    save: (s) => mut.mutateAsync({ childId: child.id, payload: buildMedHealthPayload(s) }),
  });
  useEffect(() => onCardEditorChange('health', ed.handle), [ed.handle, onCardEditorChange]);
  const { state, setState } = ed;
  const set = <K extends keyof MedHealthState>(k: K, v: MedHealthState[K]) =>
    setState((s) => ({ ...s, [k]: v }));
  const m = seed;

  return (
    <SectionFrame
      id="medical-card-health"
      title={t('children.sectionHealth')}
      icon={Activity}
      mode={ed.mode}
      dirty={ed.dirty}
      saving={ed.saving}
      canManage={canManage}
      canEdit={canEdit}
      onEdit={ed.enterEdit}
      onSave={ed.save}
      onCancel={ed.cancel}
    >
      {ed.mode === 'read' ? (
        <ReadGrid>
          <ReadRow icon={Activity} label={t('children.medicalConditionsLabel')} value={list(m.medicalConditions)} full />
          <ReadRow icon={Stethoscope} label={t('children.specialDevices')} value={m.specialDevices} full />
          <ReadRow
            icon={Thermometer}
            label={t('children.frequentColds')}
            value={m.frequentColds ? `${boolText(true)}${m.frequentColdsCount ? ` (${m.frequentColdsCount})` : ''}` : boolText(false)}
          />
          <ReadRow icon={Heart} label={t('children.hasSpecialNeeds')} value={boolText(m.hasSpecialNeeds)} />
        </ReadGrid>
      ) : (
        <div className="space-y-4">
          <EditableList icon={Activity} label={t('children.medicalConditionsLabel')} items={state.medicalConditions} onChange={(v) => set('medicalConditions', v)} placeholder={t('children.addMedicalCondition')} />
          <Field icon={Stethoscope} label={t('children.specialDevices')}>
            <MedTextarea value={state.specialDevices} onChange={(v) => set('specialDevices', v)} />
          </Field>
          <div className="flex flex-wrap items-end gap-4">
            <CheckboxRow checked={state.frequentColds} onChange={(c) => set('frequentColds', c)} label={t('children.frequentColds')} />
            {state.frequentColds && (
              <Field label={t('children.frequentColdsCount')} className="w-28">
                <NumericInput value={state.frequentColdsCount} onChange={(v) => set('frequentColdsCount', v)} maxLength={3} />
              </Field>
            )}
          </div>
          <CheckboxRow checked={state.hasSpecialNeeds} onChange={(c) => set('hasSpecialNeeds', c)} label={t('children.hasSpecialNeeds')} />
        </div>
      )}
    </SectionFrame>
  );
}

// ── Insurance ─────────────────────────────────────────────────────────────────
function InsuranceCard({ child, canManage, canEdit, onCardEditorChange }: MedCardProps) {
  const { t } = useTranslation();
  const mut = useUpdateChildMedicalInfo();
  const seed = useMemo(() => seedMedInsurance(child), [child]);
  const ed = useSectionEditor<MedInsuranceState>({
    seed,
    saving: mut.isPending,
    save: (s) => mut.mutateAsync({ childId: child.id, payload: buildMedInsurancePayload(s) }),
  });
  useEffect(() => onCardEditorChange('insurance', ed.handle), [ed.handle, onCardEditorChange]);
  const { state, setState } = ed;
  const set = <K extends keyof MedInsuranceState>(k: K, v: MedInsuranceState[K]) =>
    setState((s) => ({ ...s, [k]: v }));
  const m = seed;

  return (
    <SectionFrame
      id="medical-card-insurance"
      title={t('children.insuranceCard')}
      icon={ShieldCheck}
      mode={ed.mode}
      dirty={ed.dirty}
      saving={ed.saving}
      canManage={canManage}
      canEdit={canEdit}
      onEdit={ed.enterEdit}
      onSave={ed.save}
      onCancel={ed.cancel}
    >
      {ed.mode === 'read' ? (
        <ReadGrid>
          <ReadRow icon={ShieldCheck} label={t('children.insuranceProvider')} value={m.insuranceProvider} />
          <ReadRow icon={Hash} label={t('children.insurancePolicy')} value={m.insurancePolicy} />
        </ReadGrid>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field icon={ShieldCheck} label={t('children.insuranceProvider')}>
            <Input value={state.insuranceProvider} onChange={(e) => set('insuranceProvider', e.target.value)} />
          </Field>
          <Field icon={Hash} label={t('children.insurancePolicy')}>
            <Input value={state.insurancePolicy} onChange={(e) => set('insurancePolicy', e.target.value)} />
          </Field>
        </div>
      )}
    </SectionFrame>
  );
}

// ── Past illnesses ────────────────────────────────────────────────────────────
function IllnessesCard({ child, canManage, canEdit, onCardEditorChange }: MedCardProps) {
  const { t, locale } = useTranslation();
  const mut = useUpdateChildMedicalInfo();
  const todayStr = new Date().toLocaleDateString('en-CA');
  const seed = useMemo(() => seedMedIllnesses(child), [child]);
  const ed = useSectionEditor<MedIllnessesState>({
    seed,
    saving: mut.isPending,
    save: (s) => mut.mutateAsync({ childId: child.id, payload: buildMedIllnessesPayload(s) }),
  });
  useEffect(() => onCardEditorChange('illnesses', ed.handle), [ed.handle, onCardEditorChange]);
  const { state, setState } = ed;
  const setIllness = (code: string, patch: Partial<{ checked: boolean; date: string }>) =>
    setState((s) => ({
      ...s,
      pastIllnesses: { ...s.pastIllnesses, [code]: { ...s.pastIllnesses[code], ...patch } },
    }));
  const m = seed;
  const checked = PAST_ILLNESSES.filter((it) => m.pastIllnesses[it.code]?.checked).map((it) => {
    const d = m.pastIllnesses[it.code]?.date;
    return d ? `${t(it.labelKey)} (${fmtDate(d, locale)})` : t(it.labelKey);
  });

  return (
    <SectionFrame
      id="medical-card-illnesses"
      title={t('children.sectionPastIllnesses')}
      icon={Thermometer}
      mode={ed.mode}
      dirty={ed.dirty}
      saving={ed.saving}
      canManage={canManage}
      canEdit={canEdit}
      onEdit={ed.enterEdit}
      onSave={ed.save}
      onCancel={ed.cancel}
    >
      {ed.mode === 'read' ? (
        <ReadGrid>
          <ReadRow icon={Thermometer} label={t('children.sectionPastIllnesses')} value={checked.length ? checked.join(', ') : ''} full />
          <ReadRow icon={FileText} label={t('children.otherIllnesses')} value={m.otherIllnesses} full />
        </ReadGrid>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {PAST_ILLNESSES.map((it) => (
              <PastIllnessRow
                key={it.code}
                label={t(it.labelKey)}
                entry={state.pastIllnesses[it.code]}
                onToggle={(c) => setIllness(it.code, { checked: c })}
                onDate={(d) => setIllness(it.code, { date: d })}
                max={todayStr}
                dateAria={t('children.illnessDateAria')}
              />
            ))}
          </div>
          <Field icon={FileText} label={t('children.otherIllnesses')}>
            <MedTextarea value={state.otherIllnesses} onChange={(v) => setState((s) => ({ ...s, otherIllnesses: v }))} />
          </Field>
        </div>
      )}
    </SectionFrame>
  );
}
