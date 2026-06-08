'use client';

import { useEffect, useMemo, useState } from 'react';
import { Plus, Users } from 'lucide-react';
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
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/lib/i18n';
import { useCenterChildren, useUpdateChildParents } from '@/lib/hooks/use-children';
import { relationshipLabel, sortedParents } from '@/lib/format-child';
import { formatPhoneUS } from '@/lib/utils/phone';
import type { ChildParentLink } from '@/lib/types/child';
import { ParentEditCard } from './section-fields';
import { EmptyHint, ReadGrid, ReadRow, joinAddress, useBoolText } from './read-view';
import { SectionFrame } from './section-frame';
import { useSectionEditor, type SectionProps } from './use-section-editor';
import {
  buildParentOps,
  emptyNewRow,
  parentErrors,
  seedChild,
  seedParents,
  type ParentRow,
} from './section-data';

interface ParentsState {
  rows: ParentRow[];
  removed: string[];
}

export function ParentsSection({ child, canManage, onEditorChange }: SectionProps) {
  const { t } = useTranslation();
  const mut = useUpdateChildParents();
  const childAddr = useMemo(() => seedChild(child).address, [child]);

  const seed = useMemo<ParentsState>(
    () => ({ rows: seedParents(child), removed: [] }),
    [child],
  );
  const ed = useSectionEditor<ParentsState>({
    seed,
    saving: mut.isPending,
    validate: (s) => parentErrors(s.rows, t)[0] ?? null,
    save: (s) =>
      mut.mutateAsync({ childId: child.id, ops: buildParentOps(s.rows, s.removed, childAddr) }),
  });

  useEffect(() => onEditorChange(ed.handle), [ed.handle, onEditorChange]);

  const { state, setState } = ed;
  const [seq, setSeq] = useState(0);
  const [removeRow, setRemoveRow] = useState<ParentRow | null>(null);

  // Existing roster parents NOT already on this child (for "link existing").
  const { data: roster } = useCenterChildren(child.centerId);
  const linkableParents = useMemo(() => {
    const onChild = new Set(state.rows.map((p) => p.parentId).filter(Boolean));
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
  }, [roster, state.rows]);

  const setRow = (key: string, patch: Partial<ParentRow>) =>
    setState((s) => ({ ...s, rows: s.rows.map((p) => (p.rowKey === key ? { ...p, ...patch } : p)) }));
  const setPrimary = (key: string) =>
    setState((s) => ({ ...s, rows: s.rows.map((p) => ({ ...p, isPrimary: p.rowKey === key })) }));
  const addRow = () => {
    const key = `new-${seq}`;
    setSeq((n) => n + 1);
    setState((s) => ({ ...s, rows: [...s.rows, emptyNewRow(key)] }));
  };
  const doRemoveRow = (row: ParentRow) =>
    setState((s) => {
      const next = s.rows.filter((p) => p.rowKey !== row.rowKey).map((p) => ({ ...p }));
      if (!next.some((p) => p.isPrimary) && next[0]) next[0].isPrimary = true;
      return { rows: next, removed: row.linked ? [...s.removed, row.parentId] : s.removed };
    });
  const requestRemoveRow = (row: ParentRow) => {
    const isEmptyNew =
      !row.linked &&
      !row.firstName &&
      !row.lastName &&
      !row.email &&
      !row.parentId &&
      !row.relationship;
    if (isEmptyNew) doRemoveRow(row);
    else setRemoveRow(row);
  };

  const readParents = sortedParents(child);

  return (
    <>
      <SectionFrame
        title={t('children.parentsGuardians')}
        icon={Users}
        mode={ed.mode}
        dirty={ed.dirty}
        saving={ed.saving}
        canManage={canManage}
        onEdit={ed.enterEdit}
        onSave={ed.save}
        onCancel={ed.cancel}
      >
        {ed.mode === 'read' ? (
          readParents.length === 0 ? (
            <EmptyHint>{t('children.noParentsLinked')}</EmptyHint>
          ) : (
            <div className="space-y-3">
              {readParents.map((link) => (
                <ParentReadRow key={link.id} link={link} />
              ))}
            </div>
          )
        ) : (
          <div className="space-y-4">
            {state.rows.map((p, i) => (
              <ParentEditCard
                key={p.rowKey}
                index={i}
                row={p}
                linkableParents={linkableParents}
                canRemove={state.rows.length > 1}
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
        )}
      </SectionFrame>

      {/* Remove-parent confirm */}
      <AlertDialog open={removeRow !== null} onOpenChange={(o) => !o && setRemoveRow(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('children.removeParentTitle')}</AlertDialogTitle>
            <AlertDialogDescription>{t('children.removeParentDescEdit')}</AlertDialogDescription>
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
    </>
  );
}

function ParentReadRow({ link }: { link: ChildParentLink }) {
  const { t } = useTranslation();
  const boolText = useBoolText();
  const homeAddr = joinAddress([
    link.parent.homeAddressNumber,
    link.parent.homeAddressStreet,
    link.parent.homeAddressCity,
    link.parent.homeAddressState,
    link.parent.homeAddressZip,
  ]);
  return (
    <div className="rounded-lg border p-4" style={{ borderColor: 'var(--kc-border)' }}>
      <ReadGrid cols={3}>
        <ReadRow label={t('children.firstName')} value={link.parent.firstName} />
        <ReadRow label={t('children.middleName')} value={link.parent.middleName ?? '—'} />
        <ReadRow label={t('children.lastName')} value={link.parent.lastName} />
        <ReadRow label={t('children.relationship')} value={relationshipLabel(link.relationship, t) || '—'} />
        <ReadRow label={t('children.email')} value={link.parent.email} />
        <ReadRow
          label={t('children.homePhone')}
          value={link.parent.homePhone ? formatPhoneUS(link.parent.homePhone) : '—'}
        />
        <ReadRow label={t('children.primaryContact')} value={boolText(link.isPrimary)} />
        <ReadRow label={t('children.livesWithChild')} value={boolText(link.livesWithChild)} />
        <ReadRow label={t('children.homeAddress')} value={homeAddr ?? '—'} full />
      </ReadGrid>
    </div>
  );
}
