'use client';

import { useEffect, useMemo } from 'react';
import { Baby, Bed, Calendar, Clock, Eye, FileText, Moon, Repeat, Shield, Tag } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { DateField } from '@/components/ui/date-field';
import { useTranslation } from '@/lib/i18n';
import { useUpdateChildInfantSleep } from '@/lib/hooks/use-children';
import { ageInMonths } from '@/lib/format-child';
import { Field } from '../child-form-fields';
import { CheckboxRow, MedTextarea, PlainSelect } from './section-fields';
import { ReadGrid, ReadRow, EmptyHint, fmtDate, useBoolText } from './read-view';
import { SectionFrame } from './section-frame';
import { useSectionEditor, type SectionProps } from './use-section-editor';
import {
  PACIFIER_USE,
  SLEEP_LOCATIONS,
  buildInfantSleepPayload,
  optionLabel,
  seedInfantSleep,
  type InfantSleepState,
} from './section-data';

// LIC 9227 — infant-only (< 12 months). The tab is ALWAYS visible; for a child
// past the threshold the Edit button is hidden and a note explains why, but any
// data already on file still renders in read so it's never inaccessible.
const INFANT_MAX_MONTHS = 12;

export function InfantSleepSection({ child, canManage, onEditorChange }: SectionProps) {
  const { t, locale } = useTranslation();
  const boolText = useBoolText();
  const mut = useUpdateChildInfantSleep();

  const isInfant = ageInMonths(child.dateOfBirth) < INFANT_MAX_MONTHS;
  const effectiveCanManage = canManage && isInfant;

  const seed = useMemo(() => seedInfantSleep(child), [child]);
  const ed = useSectionEditor<InfantSleepState>({
    seed,
    saving: mut.isPending,
    save: (s) => mut.mutateAsync({ childId: child.id, payload: buildInfantSleepPayload(s) }),
  });

  useEffect(() => onEditorChange(ed.handle), [ed.handle, onEditorChange]);

  const { state, setState } = ed;
  const set = <K extends keyof InfantSleepState>(k: K, v: InfantSleepState[K]) =>
    setState((s) => ({ ...s, [k]: v }));

  const v = seed;
  const hasAny =
    v.sleepLocation ||
    v.usualSleepHours ||
    v.averageNapDuration ||
    v.usesPacifier ||
    v.canRollOver ||
    v.medicalExemption;
  const showPacifierBrand = state.usesPacifier === 'YES' || state.usesPacifier === 'SOMETIMES';

  return (
    <SectionFrame
      title={t('children.infantSleep')}
      icon={Moon}
      mode={ed.mode}
      dirty={ed.dirty}
      saving={ed.saving}
      canManage={effectiveCanManage}
      onEdit={ed.enterEdit}
      onSave={ed.save}
      onCancel={ed.cancel}
    >
      {!isInfant && (
        <p
          className="mb-3 rounded-md px-3 py-2 text-xs"
          style={{ background: 'var(--kc-warning-bg, var(--kc-surface-2))', color: 'var(--kc-text-2)' }}
        >
          {t('children.infantOnlyNote')}
        </p>
      )}

      {ed.mode === 'read' ? (
        !hasAny ? (
          <EmptyHint>{t('children.noInfantSleep')}</EmptyHint>
        ) : (
          <ReadGrid>
            <ReadRow icon={Bed} label={t('children.sleepLocation')} value={optionLabel(SLEEP_LOCATIONS, v.sleepLocation, t)} />
            {v.sleepLocation === 'OTHER' && (
              <ReadRow icon={Bed} label={t('children.sleepLocationOther')} value={v.sleepLocationOther} />
            )}
            <ReadRow icon={Moon} label={t('children.usualSleepHours')} value={v.usualSleepHours} />
            <ReadRow icon={Clock} label={t('children.averageNapDuration')} value={v.averageNapDuration} />
            <ReadRow icon={Baby} label={t('children.usesPacifier')} value={optionLabel(PACIFIER_USE, v.usesPacifier, t)} />
            <ReadRow icon={Tag} label={t('children.pacifierBrand')} value={v.pacifierBrand} />
            <ReadRow
              icon={Repeat}
              label={t('children.canRollOver')}
              value={v.canRollOver ? `${boolText(true)}${v.rollOverDate ? ` (${fmtDate(v.rollOverDate, locale)})` : ''}` : boolText(false)}
            />
            <ReadRow icon={Eye} label={t('children.providerObservedRoll')} value={boolText(v.providerObservedRoll)} />
            <ReadRow icon={Shield} label={t('children.medicalExemption')} value={boolText(v.medicalExemption)} />
            {v.medicalExemption && (
              <ReadRow icon={FileText} label={t('children.medicalExemptionInstructions')} value={v.medicalExemptionInstructions} full />
            )}
          </ReadGrid>
        )
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field icon={Bed} label={t('children.sleepLocation')}>
              <PlainSelect value={state.sleepLocation} onValueChange={(val) => set('sleepLocation', val)} options={SLEEP_LOCATIONS} />
            </Field>
            {state.sleepLocation === 'OTHER' && (
              <Field icon={Bed} label={t('children.sleepLocationOther')}>
                <Input value={state.sleepLocationOther} onChange={(e) => set('sleepLocationOther', e.target.value)} />
              </Field>
            )}
            <Field icon={Moon} label={t('children.usualSleepHours')}>
              <Input value={state.usualSleepHours} onChange={(e) => set('usualSleepHours', e.target.value)} placeholder="7pm – 6am" />
            </Field>
            <Field icon={Clock} label={t('children.averageNapDuration')}>
              <Input value={state.averageNapDuration} onChange={(e) => set('averageNapDuration', e.target.value)} placeholder="45 min" />
            </Field>
            <Field icon={Baby} label={t('children.usesPacifier')}>
              <PlainSelect value={state.usesPacifier} onValueChange={(val) => set('usesPacifier', val)} options={PACIFIER_USE} />
            </Field>
            {showPacifierBrand && (
              <Field icon={Tag} label={t('children.pacifierBrand')}>
                <Input value={state.pacifierBrand} onChange={(e) => set('pacifierBrand', e.target.value)} />
              </Field>
            )}
          </div>

          <CheckboxRow checked={state.canRollOver} onChange={(c) => set('canRollOver', c)} label={t('children.canRollOver')} />
          {state.canRollOver && (
            <Field icon={Calendar} label={t('children.rollOverDate')} className="sm:max-w-xs">
              <DateField value={state.rollOverDate} onChange={(e) => set('rollOverDate', e.target.value)} />
            </Field>
          )}
          <CheckboxRow checked={state.providerObservedRoll} onChange={(c) => set('providerObservedRoll', c)} label={t('children.providerObservedRoll')} />

          <CheckboxRow checked={state.medicalExemption} onChange={(c) => set('medicalExemption', c)} label={t('children.medicalExemption')} />
          {state.medicalExemption && (
            <Field icon={FileText} label={t('children.medicalExemptionInstructions')}>
              <MedTextarea value={state.medicalExemptionInstructions} onChange={(val) => set('medicalExemptionInstructions', val)} />
            </Field>
          )}
        </div>
      )}
    </SectionFrame>
  );
}
