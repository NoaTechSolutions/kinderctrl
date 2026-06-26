'use client';

import { useEffect, useMemo } from 'react';
import { Baby, FileText, Footprints, MessageCircle, TrendingUp } from 'lucide-react';
import { NumericInput } from '@/components/ui/numeric-input';
import { useTranslation } from '@/lib/i18n';
import { useUpdateChildDevelopment } from '@/lib/hooks/use-children';
import { Field } from '../child-form-fields';
import { MedTextarea } from './section-fields';
import { ReadGrid, ReadRow, EmptyHint } from '@/components/ui/read-view';
import { SectionFrame } from '@/components/ui/section-frame';
import { useSectionEditor, type SectionProps } from '@/components/ui/use-section-editor';
import { buildDevelopmentPayload, seedDevelopment, type DevelopmentState } from './section-data';

export function DevelopmentSection({ child, canManage, onEditorChange }: SectionProps) {
  const { t } = useTranslation();
  const mut = useUpdateChildDevelopment();

  const seed = useMemo(() => seedDevelopment(child), [child]);
  const ed = useSectionEditor<DevelopmentState>({
    seed,
    saving: mut.isPending,
    save: (s) => mut.mutateAsync({ childId: child.id, payload: buildDevelopmentPayload(s) }),
  });

  useEffect(() => onEditorChange(ed.handle), [ed.handle, onEditorChange]);

  const { state, setState } = ed;
  const setD = <K extends keyof DevelopmentState>(k: K, v: DevelopmentState[K]) =>
    setState((s) => ({ ...s, [k]: v }));

  const d = seed;
  const hasAny =
    d.walkedAtMonths || d.talkedAtMonths || d.toiletTrainedAtMonths || d.developmentNotes;

  return (
    <SectionFrame
      title={t('children.development')}
      icon={TrendingUp}
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
          <EmptyHint>{t('children.noDevelopment')}</EmptyHint>
        ) : (
          <ReadGrid>
            <ReadRow icon={Footprints} label={t('children.walkedAtMonths')} value={d.walkedAtMonths} />
            <ReadRow icon={MessageCircle} label={t('children.talkedAtMonths')} value={d.talkedAtMonths} />
            <ReadRow icon={Baby} label={t('children.toiletTrainedAtMonths')} value={d.toiletTrainedAtMonths} />
            <ReadRow icon={FileText} label={t('children.developmentNotes')} value={d.developmentNotes} full />
          </ReadGrid>
        )
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field icon={Footprints} label={t('children.walkedAtMonths')}>
              <NumericInput value={state.walkedAtMonths} onChange={(v) => setD('walkedAtMonths', v)} maxLength={3} />
            </Field>
            <Field icon={MessageCircle} label={t('children.talkedAtMonths')}>
              <NumericInput value={state.talkedAtMonths} onChange={(v) => setD('talkedAtMonths', v)} maxLength={3} />
            </Field>
            <Field icon={Baby} label={t('children.toiletTrainedAtMonths')}>
              <NumericInput value={state.toiletTrainedAtMonths} onChange={(v) => setD('toiletTrainedAtMonths', v)} maxLength={3} />
            </Field>
          </div>
          <Field icon={FileText} label={t('children.developmentNotes')}>
            <MedTextarea value={state.developmentNotes} onChange={(v) => setD('developmentNotes', v)} />
          </Field>
        </div>
      )}
    </SectionFrame>
  );
}
