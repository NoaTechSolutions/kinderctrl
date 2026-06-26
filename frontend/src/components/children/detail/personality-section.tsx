'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Bed,
  FileText,
  Frown,
  Gift,
  Heart,
  Home,
  Lightbulb,
  Shield,
  Smile,
  Sparkles,
  StickyNote,
  Trees,
  Users,
  Utensils,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useTranslation } from '@/lib/i18n';
import { useUpdateChildPersonality } from '@/lib/hooks/use-children';
import type { Child } from '@/lib/types/child';
import { Field } from '../child-form-fields';
import { CheckboxRow, MedTextarea } from './section-fields';
import { ReadGrid, ReadRow, CommaChips, useBoolText } from './read-view';
import { SectionFrame } from './section-frame';
import {
  useSectionEditor,
  type SectionEditorHandle,
  type SectionProps,
} from './use-section-editor';
import {
  buildPersBehaviorPayload,
  buildPersLikesPayload,
  buildPersNotesPayload,
  seedPersBehavior,
  seedPersLikes,
  seedPersNotes,
  type PersBehaviorState,
  type PersLikesState,
  type PersNotesState,
} from './section-data';

const READ_HANDLE: SectionEditorHandle = {
  editing: false,
  dirty: false,
  save: async () => true,
  cancel: () => {},
};

type PersCardId = 'likes' | 'behavior' | 'notes';

interface PersCardProps {
  child: Child;
  canManage: boolean;
  canEdit: boolean;
  onCardEditorChange: (id: PersCardId, h: SectionEditorHandle) => void;
}

// Container of independent personality cards (same one-at-a-time coordination
// as MedicalSection): one card edits at a time, the active card's handle is
// published to the shell for the tab-switch / module-exit guard.
export function PersonalitySection({ child, canManage, onEditorChange }: SectionProps) {
  const [handles, setHandles] = useState<Partial<Record<PersCardId, SectionEditorHandle>>>({});
  const setHandle = useCallback((id: PersCardId, h: SectionEditorHandle) => {
    setHandles((prev) => (prev[id] === h ? prev : { ...prev, [id]: h }));
  }, []);

  const editingId = (Object.keys(handles) as PersCardId[]).find((k) => handles[k]?.editing) ?? null;
  const editingHandle = editingId ? handles[editingId]! : null;

  useEffect(() => {
    onEditorChange(editingHandle ?? READ_HANDLE);
  }, [editingHandle, onEditorChange]);

  const common = { child, canManage, canEdit: editingId === null, onCardEditorChange: setHandle };

  return (
    <div className="space-y-4">
      <LikesCard {...common} />
      <BehaviorCard {...common} />
      <NotesCard {...common} />
    </div>
  );
}

// ── Likes & preferences ───────────────────────────────────────────────────────
function LikesCard({ child, canManage, canEdit, onCardEditorChange }: PersCardProps) {
  const { t } = useTranslation();
  const boolText = useBoolText();
  const mut = useUpdateChildPersonality();
  const seed = useMemo(() => seedPersLikes(child), [child]);
  const ed = useSectionEditor<PersLikesState>({
    seed,
    saving: mut.isPending,
    save: (s) => mut.mutateAsync({ childId: child.id, payload: buildPersLikesPayload(s) }),
  });
  useEffect(() => onCardEditorChange('likes', ed.handle), [ed.handle, onCardEditorChange]);
  const { state, setState } = ed;
  const set = <K extends keyof PersLikesState>(k: K, v: PersLikesState[K]) =>
    setState((s) => ({ ...s, [k]: v }));
  const p = seed;

  return (
    <SectionFrame
      id="personality-card-likes"
      title={t('children.persLikes')}
      icon={Sparkles}
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
          <ReadRow icon={Sparkles} label={t('children.personalityWords')} full>
            <CommaChips value={p.personalityWords} />
          </ReadRow>
          <ReadRow icon={Heart} label={t('children.likesToDo')} value={p.likesToDo} full />
          <ReadRow icon={Utensils} label={t('children.favoriteFoods')}>
            <CommaChips value={p.favoriteFoods} />
          </ReadRow>
          <ReadRow icon={Utensils} label={t('children.dislikedFoods')}>
            <CommaChips value={p.dislikedFoods} />
          </ReadRow>
          <ReadRow icon={Frown} label={t('children.fears')} value={p.fears} />
          <ReadRow icon={Gift} label={t('children.favoriteToy')} value={p.favoriteToy} />
          <ReadRow icon={Home} label={t('children.favoriteIndoorActivity')} value={p.favoriteIndoorActivity} />
          <ReadRow icon={Trees} label={t('children.favoriteOutdoorActivity')} value={p.favoriteOutdoorActivity} />
          <ReadRow
            icon={Bed}
            label={t('children.napsAtHome')}
            value={p.napsAtHome ? `${boolText(true)}${p.napTimeAtHome ? ` (${p.napTimeAtHome})` : ''}` : boolText(false)}
          />
        </ReadGrid>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field icon={Sparkles} label={t('children.personalityWords')} className="sm:col-span-2">
              <Input value={state.personalityWords} onChange={(e) => set('personalityWords', e.target.value)} placeholder={t('children.commaHint')} />
            </Field>
            <Field icon={Heart} label={t('children.likesToDo')} className="sm:col-span-2">
              <Input value={state.likesToDo} onChange={(e) => set('likesToDo', e.target.value)} />
            </Field>
            <Field icon={Utensils} label={t('children.favoriteFoods')}>
              <Input value={state.favoriteFoods} onChange={(e) => set('favoriteFoods', e.target.value)} placeholder={t('children.commaHint')} />
            </Field>
            <Field icon={Utensils} label={t('children.dislikedFoods')}>
              <Input value={state.dislikedFoods} onChange={(e) => set('dislikedFoods', e.target.value)} placeholder={t('children.commaHint')} />
            </Field>
            <Field icon={Frown} label={t('children.fears')}>
              <Input value={state.fears} onChange={(e) => set('fears', e.target.value)} />
            </Field>
            <Field icon={Gift} label={t('children.favoriteToy')}>
              <Input value={state.favoriteToy} onChange={(e) => set('favoriteToy', e.target.value)} />
            </Field>
            <Field icon={Home} label={t('children.favoriteIndoorActivity')}>
              <Input value={state.favoriteIndoorActivity} onChange={(e) => set('favoriteIndoorActivity', e.target.value)} />
            </Field>
            <Field icon={Trees} label={t('children.favoriteOutdoorActivity')}>
              <Input value={state.favoriteOutdoorActivity} onChange={(e) => set('favoriteOutdoorActivity', e.target.value)} />
            </Field>
          </div>
          <div className="flex flex-wrap items-end gap-4">
            <CheckboxRow checked={state.napsAtHome} onChange={(c) => set('napsAtHome', c)} label={t('children.napsAtHome')} />
            {state.napsAtHome && (
              <Field icon={Bed} label={t('children.napTimeAtHome')} className="w-48">
                <Input value={state.napTimeAtHome} onChange={(e) => set('napTimeAtHome', e.target.value)} placeholder="1-3pm" />
              </Field>
            )}
          </div>
        </div>
      )}
    </SectionFrame>
  );
}

// ── Behavior & social (LIC 702) ───────────────────────────────────────────────
function BehaviorCard({ child, canManage, canEdit, onCardEditorChange }: PersCardProps) {
  const { t } = useTranslation();
  const mut = useUpdateChildPersonality();
  const seed = useMemo(() => seedPersBehavior(child), [child]);
  const ed = useSectionEditor<PersBehaviorState>({
    seed,
    saving: mut.isPending,
    save: (s) => mut.mutateAsync({ childId: child.id, payload: buildPersBehaviorPayload(s) }),
  });
  useEffect(() => onCardEditorChange('behavior', ed.handle), [ed.handle, onCardEditorChange]);
  const { state, setState } = ed;
  const set = <K extends keyof PersBehaviorState>(k: K, v: PersBehaviorState[K]) =>
    setState((s) => ({ ...s, [k]: v }));
  const p = seed;

  return (
    <SectionFrame
      id="personality-card-behavior"
      title={t('children.persBehavior')}
      icon={Users}
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
          <ReadRow icon={Smile} label={t('children.expressesEmotions')} value={p.expressesEmotions} full />
          <ReadRow icon={Shield} label={t('children.homeDiscipline')} value={p.homeDiscipline} full />
          <ReadRow icon={Users} label={t('children.getsAlongWith')} value={p.getsAlongWith} full />
          <ReadRow icon={Users} label={t('children.groupPlayExperience')} value={p.groupPlayExperience} full />
          <ReadRow icon={Heart} label={t('children.sickCarePlan')} value={p.sickCarePlan} full />
        </ReadGrid>
      ) : (
        <div className="space-y-4">
          <Field icon={Smile} label={t('children.expressesEmotions')}>
            <MedTextarea value={state.expressesEmotions} onChange={(v) => set('expressesEmotions', v)} />
          </Field>
          <Field icon={Shield} label={t('children.homeDiscipline')}>
            <MedTextarea value={state.homeDiscipline} onChange={(v) => set('homeDiscipline', v)} />
          </Field>
          <Field icon={Users} label={t('children.getsAlongWith')}>
            <MedTextarea value={state.getsAlongWith} onChange={(v) => set('getsAlongWith', v)} />
          </Field>
          <Field icon={Users} label={t('children.groupPlayExperience')}>
            <MedTextarea value={state.groupPlayExperience} onChange={(v) => set('groupPlayExperience', v)} />
          </Field>
          <Field icon={Heart} label={t('children.sickCarePlan')}>
            <MedTextarea value={state.sickCarePlan} onChange={(v) => set('sickCarePlan', v)} />
          </Field>
        </div>
      )}
    </SectionFrame>
  );
}

// ── Notes ─────────────────────────────────────────────────────────────────────
function NotesCard({ child, canManage, canEdit, onCardEditorChange }: PersCardProps) {
  const { t } = useTranslation();
  const mut = useUpdateChildPersonality();
  const seed = useMemo(() => seedPersNotes(child), [child]);
  const ed = useSectionEditor<PersNotesState>({
    seed,
    saving: mut.isPending,
    save: (s) => mut.mutateAsync({ childId: child.id, payload: buildPersNotesPayload(s) }),
  });
  useEffect(() => onCardEditorChange('notes', ed.handle), [ed.handle, onCardEditorChange]);
  const { state, setState } = ed;
  const set = <K extends keyof PersNotesState>(k: K, v: PersNotesState[K]) =>
    setState((s) => ({ ...s, [k]: v }));
  const p = seed;

  return (
    <SectionFrame
      id="personality-card-notes"
      title={t('children.persNotes')}
      icon={StickyNote}
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
          <ReadRow icon={Lightbulb} label={t('children.transitionTips')} value={p.transitionTips} full />
          <ReadRow icon={FileText} label={t('children.anythingElse')} value={p.anythingElse} full />
        </ReadGrid>
      ) : (
        <div className="space-y-4">
          <Field icon={Lightbulb} label={t('children.transitionTips')}>
            <MedTextarea value={state.transitionTips} onChange={(v) => set('transitionTips', v)} />
          </Field>
          <Field icon={FileText} label={t('children.anythingElse')}>
            <MedTextarea value={state.anythingElse} onChange={(v) => set('anythingElse', v)} />
          </Field>
        </div>
      )}
    </SectionFrame>
  );
}
