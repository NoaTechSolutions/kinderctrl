'use client';

import { useEffect, useMemo, useState } from 'react';
import { MapPin, Phone, Plus, Users } from 'lucide-react';
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
import { useUpdateChildContacts } from '@/lib/hooks/use-children';
import { formatPhoneUS } from '@/lib/utils/phone';
import type { ChildContact, ChildContactType } from '@/lib/types/child';
import { ContactCard, SectionLabel } from './section-fields';
import { EmptyHint, joinAddress } from './read-view';
import { SectionFrame } from './section-frame';
import { useSectionEditor, type SectionProps } from './use-section-editor';
import {
  CONTACT_GROUPS,
  buildContactOps,
  emptyContactRow,
  contactErrors,
  seedContacts,
  type ContactRow,
} from './section-data';

interface ContactsState {
  rows: ContactRow[];
  removed: string[];
}

export function ContactsSection({ child, canManage, onEditorChange }: SectionProps) {
  const { t } = useTranslation();
  const mut = useUpdateChildContacts();

  const seed = useMemo<ContactsState>(
    () => ({ rows: seedContacts(child), removed: [] }),
    [child],
  );
  const ed = useSectionEditor<ContactsState>({
    seed,
    saving: mut.isPending,
    validate: (s) => contactErrors(s.rows, t)[0] ?? null,
    save: (s) => mut.mutateAsync({ childId: child.id, ops: buildContactOps(s.rows, s.removed) }),
  });

  useEffect(() => onEditorChange(ed.handle), [ed.handle, onEditorChange]);

  const { state, setState } = ed;
  const [seq, setSeq] = useState(0);
  const [removeRow, setRemoveRow] = useState<ContactRow | null>(null);

  const setContact = (key: string, patch: Partial<ContactRow>) =>
    setState((s) => ({ ...s, rows: s.rows.map((c) => (c.rowKey === key ? { ...c, ...patch } : c)) }));
  const addContactRow = (type: ChildContactType) => {
    const key = `nc-${seq}`;
    setSeq((n) => n + 1);
    setState((s) => ({ ...s, rows: [...s.rows, emptyContactRow(key, type)] }));
  };
  const doRemoveContact = (row: ContactRow) =>
    setState((s) => ({
      rows: s.rows.filter((c) => c.rowKey !== row.rowKey),
      removed: row.id ? [...s.removed, row.id] : s.removed,
    }));
  const requestRemoveContact = (row: ContactRow) => {
    const isEmptyNew = !row.id && !row.name.trim();
    if (isEmptyNew) doRemoveContact(row);
    else setRemoveRow(row);
  };

  const readContacts = child.contacts ?? [];

  return (
    <>
      <SectionFrame
        title={t('children.contacts')}
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
          readContacts.length === 0 ? (
            <EmptyHint>{t('children.noContacts')}</EmptyHint>
          ) : (
            <div className="space-y-6">
              {CONTACT_GROUPS.map((g) => {
                const rows = readContacts.filter((c) => c.contactType === g.type);
                if (rows.length === 0) return null;
                return (
                  <section key={g.type} className="space-y-3">
                    <SectionLabel>{t(g.titleKey)}</SectionLabel>
                    {rows.map((c) => (
                      <ContactReadRow key={c.id} contact={c} />
                    ))}
                  </section>
                );
              })}
            </div>
          )
        ) : (
          <div className="space-y-6">
            {CONTACT_GROUPS.map((g) => {
              const rows = state.rows.filter((c) => c.contactType === g.type);
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
        )}
      </SectionFrame>

      {/* Remove-contact confirm */}
      <AlertDialog open={removeRow !== null} onOpenChange={(o) => !o && setRemoveRow(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('children.removeContactTitle')}</AlertDialogTitle>
            <AlertDialogDescription>{t('children.removeContactDesc')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('children.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                if (removeRow) doRemoveContact(removeRow);
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

function ContactReadRow({ contact }: { contact: ChildContact }) {
  const { t } = useTranslation();
  const addr = joinAddress([
    contact.addressStreet,
    contact.addressCity,
    contact.addressState,
    contact.addressZip,
  ]);
  const phones = [
    contact.phone && formatPhoneUS(contact.phone),
    contact.homePhone && `${t('children.homePhone')}: ${formatPhoneUS(contact.homePhone)}`,
    contact.workPhone && `${t('children.workPhone')}: ${formatPhoneUS(contact.workPhone)}`,
  ].filter(Boolean) as string[];
  return (
    <div className="rounded-lg border p-3" style={{ borderColor: 'var(--kc-border)' }}>
      <p className="text-sm font-medium" style={{ color: 'var(--kc-text-1)' }}>
        {contact.name}
        {contact.relationship && (
          <span className="ml-2 text-xs font-normal" style={{ color: 'var(--kc-text-3)' }}>
            {contact.relationship}
          </span>
        )}
      </p>
      <div className="mt-1.5 flex flex-col gap-1 sm:flex-row sm:flex-wrap sm:gap-x-4 text-sm" style={{ color: 'var(--kc-text-2)' }}>
        {phones.map((p) => (
          <span key={p} className="inline-flex items-center gap-1.5">
            <Phone className="h-3.5 w-3.5 flex-none" style={{ color: 'var(--kc-text-3)' }} />
            {p}
          </span>
        ))}
        {addr && (
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 flex-none" style={{ color: 'var(--kc-text-3)' }} />
            {addr}
          </span>
        )}
      </div>
    </div>
  );
}
