'use client';

import { useEffect, useMemo } from 'react';
import { Clock } from 'lucide-react';
import { TimeField } from '@/components/ui/time-field';
import { useTranslation } from '@/lib/i18n';
import { useUpdateChildDevelopment } from '@/lib/hooks/use-children';
import { Field } from '../child-form-fields';
import { CheckboxRow, MedTextarea } from './section-fields';
import { ReadGrid, ReadRow, EmptyHint, useBoolText } from './read-view';
import { SectionFrame } from './section-frame';
import { useSectionEditor, type SectionProps } from './use-section-editor';
import {
  buildRoutinesPayload,
  routinesErrors,
  seedRoutines,
  type RoutinesState,
} from './section-data';

export function RoutinesSection({ child, canManage, onEditorChange }: SectionProps) {
  const { t } = useTranslation();
  const boolText = useBoolText();
  const mut = useUpdateChildDevelopment();

  const seed = useMemo(() => seedRoutines(child), [child]);
  const ed = useSectionEditor<RoutinesState>({
    seed,
    saving: mut.isPending,
    validate: (s) => routinesErrors(s, t)[0] ?? null,
    save: (s) => mut.mutateAsync({ childId: child.id, payload: buildRoutinesPayload(s) }),
  });

  useEffect(() => onEditorChange(ed.handle), [ed.handle, onEditorChange]);

  const { state, setState } = ed;
  const setR = <K extends keyof RoutinesState>(k: K, v: RoutinesState[K]) =>
    setState((s) => ({ ...s, [k]: v }));

  const r = seed;
  const napText = r.takesNap
    ? r.napStartTime || r.napEndTime
      ? `${boolText(true)} (${r.napStartTime || '—'}–${r.napEndTime || '—'})`
      : boolText(true)
    : boolText(false);
  const hasAny =
    r.wakeUpTime || r.bedTime || r.takesNap || r.diet || r.mealTimes;

  return (
    <SectionFrame
      title={t('children.routines')}
      icon={Clock}
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
          <EmptyHint>{t('children.noRoutines')}</EmptyHint>
        ) : (
          <ReadGrid>
            <ReadRow label={t('children.wakeUpTime')} value={r.wakeUpTime || '—'} />
            <ReadRow label={t('children.bedTime')} value={r.bedTime || '—'} />
            <ReadRow label={t('children.takesNap')} value={napText} />
            <ReadRow label={t('children.diet')} value={r.diet} full />
            <ReadRow label={t('children.mealTimes')} value={r.mealTimes} full />
          </ReadGrid>
        )
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label={t('children.wakeUpTime')}>
              <TimeField value={state.wakeUpTime} onChange={(e) => setR('wakeUpTime', e.target.value)} />
            </Field>
            <Field label={t('children.bedTime')}>
              <TimeField value={state.bedTime} onChange={(e) => setR('bedTime', e.target.value)} />
            </Field>
          </div>
          <CheckboxRow checked={state.takesNap} onChange={(c) => setR('takesNap', c)} label={t('children.takesNap')} />
          {state.takesNap && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label={t('children.napStartTime')}>
                <TimeField value={state.napStartTime} onChange={(e) => setR('napStartTime', e.target.value)} />
              </Field>
              <Field label={t('children.napEndTime')}>
                <TimeField value={state.napEndTime} onChange={(e) => setR('napEndTime', e.target.value)} />
              </Field>
            </div>
          )}
          <Field label={t('children.diet')}>
            <MedTextarea value={state.diet} onChange={(v) => setR('diet', v)} />
          </Field>
          <Field label={t('children.mealTimes')}>
            <MedTextarea value={state.mealTimes} onChange={(v) => setR('mealTimes', v)} />
          </Field>
        </div>
      )}
    </SectionFrame>
  );
}
