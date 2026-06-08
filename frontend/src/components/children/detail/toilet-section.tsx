'use client';

import { useEffect, useMemo } from 'react';
import { Droplets } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useTranslation } from '@/lib/i18n';
import { useUpdateChildDevelopment } from '@/lib/hooks/use-children';
import { Field } from '../child-form-fields';
import { CheckboxRow, MedTextarea, PlainSelect, TriStateField, triText } from './section-fields';
import { ReadGrid, ReadRow, EmptyHint, useBoolText } from './read-view';
import { SectionFrame } from './section-frame';
import { useSectionEditor, type SectionProps } from './use-section-editor';
import {
  TOILET_HELP_LEVELS,
  buildToiletPayload,
  optionLabel,
  seedToilet,
  type ToiletState,
} from './section-data';

export function ToiletSection({ child, canManage, onEditorChange }: SectionProps) {
  const { t } = useTranslation();
  const boolText = useBoolText();
  const mut = useUpdateChildDevelopment();

  const seed = useMemo(() => seedToilet(child), [child]);
  const ed = useSectionEditor<ToiletState>({
    seed,
    saving: mut.isPending,
    save: (s) => mut.mutateAsync({ childId: child.id, payload: buildToiletPayload(s) }),
  });

  useEffect(() => onEditorChange(ed.handle), [ed.handle, onEditorChange]);

  const { state, setState } = ed;
  const setT = <K extends keyof ToiletState>(k: K, v: ToiletState[K]) =>
    setState((s) => ({ ...s, [k]: v }));

  const v = seed;
  const hasAny =
    v.toiletTrained ||
    v.toiletHelpLevel ||
    v.toiletWordBowel ||
    v.toiletWordUrination ||
    v.toiletAccidents ||
    v.bowelMovementsRegular !== null ||
    v.bowelMovementTime;

  return (
    <SectionFrame
      title={t('children.toilet')}
      icon={Droplets}
      mode={ed.mode}
      dirty={ed.dirty}
      saving={ed.saving}
      canManage={canManage}
      onEdit={ed.enterEdit}
      onSave={ed.save}
      onCancel={ed.cancel}
    >
      {ed.mode === 'read' ? (
        !hasAny ? (
          <EmptyHint>{t('children.noToilet')}</EmptyHint>
        ) : (
          <ReadGrid>
            <ReadRow label={t('children.toiletTrained')} value={boolText(v.toiletTrained)} />
            <ReadRow label={t('children.toiletHelpLevel')} value={optionLabel(TOILET_HELP_LEVELS, v.toiletHelpLevel, t) || '—'} />
            <ReadRow label={t('children.toiletWordBowel')} value={v.toiletWordBowel} />
            <ReadRow label={t('children.toiletWordUrination')} value={v.toiletWordUrination} />
            <ReadRow label={t('children.bowelMovementsRegular')} value={triText(v.bowelMovementsRegular, t)} />
            <ReadRow label={t('children.bowelMovementTime')} value={v.bowelMovementTime} />
            <ReadRow label={t('children.toiletAccidents')} value={v.toiletAccidents} full />
          </ReadGrid>
        )
      ) : (
        <div className="space-y-4">
          <CheckboxRow checked={state.toiletTrained} onChange={(c) => setT('toiletTrained', c)} label={t('children.toiletTrained')} />
          <Field label={t('children.toiletHelpLevel')} className="sm:max-w-xs">
            <PlainSelect value={state.toiletHelpLevel} onValueChange={(val) => setT('toiletHelpLevel', val)} options={TOILET_HELP_LEVELS} />
          </Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label={t('children.toiletWordBowel')}>
              <Input value={state.toiletWordBowel} onChange={(e) => setT('toiletWordBowel', e.target.value)} />
            </Field>
            <Field label={t('children.toiletWordUrination')}>
              <Input value={state.toiletWordUrination} onChange={(e) => setT('toiletWordUrination', e.target.value)} />
            </Field>
          </div>
          <Field label={t('children.bowelMovementsRegular')}>
            <TriStateField value={state.bowelMovementsRegular} onChange={(val) => setT('bowelMovementsRegular', val)} />
          </Field>
          <Field label={t('children.bowelMovementTime')}>
            <Input value={state.bowelMovementTime} onChange={(e) => setT('bowelMovementTime', e.target.value)} />
          </Field>
          <Field label={t('children.toiletAccidents')}>
            <MedTextarea value={state.toiletAccidents} onChange={(val) => setT('toiletAccidents', val)} />
          </Field>
        </div>
      )}
    </SectionFrame>
  );
}
