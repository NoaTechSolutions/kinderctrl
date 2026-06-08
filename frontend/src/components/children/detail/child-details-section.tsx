'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Baby } from 'lucide-react';
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
import { NameInput } from '@/components/ui/name-input';
import { PhoneInput } from '@/components/ui/phone-input';
import { DateField } from '@/components/ui/date-field';
import { useTranslation } from '@/lib/i18n';
import { useUpdateChildDetails, useUpdatePrimaryContactPhone } from '@/lib/hooks/use-children';
import { genderLabel } from '@/lib/format-child';
import { formatPhoneUS } from '@/lib/utils/phone';
import { ChildStatusBadge } from '@/components/children/child-status-badge';
import { Field, AddressFields } from '../child-form-fields';
import { SectionFrame } from './section-frame';
import { PlainSelect } from './section-fields';
import { ReadGrid, ReadRow, fmtDate, joinAddress } from './read-view';
import { useSectionEditor, AbortSave, type SectionProps } from './use-section-editor';
import {
  GENDERS,
  ENROLLMENT_STATUSES,
  buildChildPayload,
  childErrors,
  phoneDigits,
  primaryParentOf,
  seedChild,
  type ChildState,
} from './section-data';

export function ChildDetailsSection({ child, canManage, onEditorChange }: SectionProps) {
  const { t, locale } = useTranslation();
  const detailsMut = useUpdateChildDetails();
  const phoneMut = useUpdatePrimaryContactPhone();
  const todayStr = new Date().toLocaleDateString('en-CA');

  const primary = useMemo(() => primaryParentOf(child), [child]);
  const primaryName = primary
    ? `${primary.parent.firstName} ${primary.parent.lastName}`.trim()
    : '';

  // Confirm-before-phone-sync: the save fn awaits this promise; the dialog
  // resolves it. Cancel → AbortSave (nothing is written).
  const [confirmOpen, setConfirmOpen] = useState(false);
  const resolveRef = useRef<((ok: boolean) => void) | null>(null);
  const requestPhoneConfirm = () =>
    new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
      setConfirmOpen(true);
    });
  const resolveConfirm = (ok: boolean) => {
    setConfirmOpen(false);
    resolveRef.current?.(ok);
    resolveRef.current = null;
  };

  const seed = useMemo(() => seedChild(child), [child]);
  const ed = useSectionEditor<ChildState>({
    seed,
    saving: detailsMut.isPending || phoneMut.isPending,
    validate: (s) => childErrors(s, t, todayStr)[0] ?? null,
    save: async (s) => {
      const newDigits = phoneDigits(s.phone) ?? '';
      const curDigits = primary?.parent.homePhone ?? '';
      const phoneChanged = !!primary && newDigits !== curDigits;
      // Confirm BEFORE any write so a cancel leaves everything untouched.
      if (phoneChanged) {
        const ok = await requestPhoneConfirm();
        if (!ok) throw new AbortSave();
      }
      await detailsMut.mutateAsync({ childId: child.id, payload: buildChildPayload(s) });
      if (phoneChanged) {
        await phoneMut.mutateAsync({
          childId: child.id,
          parentId: primary!.parentId,
          homePhone: newDigits,
        });
      }
    },
  });

  useEffect(() => onEditorChange(ed.handle), [ed.handle, onEditorChange]);

  const { state, setState } = ed;
  const setC = <K extends keyof ChildState>(k: K, v: ChildState[K]) =>
    setState((s) => ({ ...s, [k]: v }));

  return (
    <>
      <SectionFrame
        title={t('children.childDetails')}
        icon={Baby}
        mode={ed.mode}
        dirty={ed.dirty}
        saving={ed.saving}
        canManage={canManage}
        onEdit={ed.enterEdit}
        onSave={ed.save}
        onCancel={ed.cancel}
      >
        {ed.mode === 'read' ? (
          <ReadGrid cols={4}>
            <ReadRow label={t('children.firstName')} value={child.firstName} />
            <ReadRow label={t('children.middleName')} value={child.middleName ?? '—'} />
            <ReadRow label={t('children.lastName')} value={child.lastName} />
            <ReadRow label={t('children.dateOfBirth')} value={fmtDate(child.dateOfBirth, locale)} />
            <ReadRow label={t('children.gender')} value={genderLabel(child.gender, t)} />
            <ReadRow label={t('children.enrollmentStatus')}>
              <ChildStatusBadge status={child.enrollmentStatus} />
            </ReadRow>
            <ReadRow label={t('children.phone')}>
              {primary ? (
                <>
                  {primary.parent.homePhone ? formatPhoneUS(primary.parent.homePhone) : '—'}
                  <span className="mt-0.5 block text-xs" style={{ color: 'var(--kc-text-3)' }}>
                    {t('children.phonePrimaryContactHint').replace('{name}', primaryName)}
                  </span>
                </>
              ) : (
                '—'
              )}
            </ReadRow>
            <ReadRow
              label={t('children.address')}
              full
              value={
                joinAddress([
                  child.addressNumber,
                  child.addressStreet,
                  child.addressCity,
                  child.addressState,
                  child.addressZip,
                ]) ?? '—'
              }
            />
            <ReadRow label={t('children.admissionDate')} value={fmtDate(child.admissionDate, locale)} />
            <ReadRow label={t('children.firstDayOfCare')} value={fmtDate(child.firstCareDay, locale)} />
          </ReadGrid>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Field label={t('children.firstName')} required>
                <NameInput value={state.firstName} onChange={(v) => setC('firstName', v)} />
              </Field>
              <Field label={t('children.middleName')}>
                <NameInput value={state.middleName} onChange={(v) => setC('middleName', v)} />
              </Field>
              <Field label={t('children.lastName')} required>
                <NameInput value={state.lastName} onChange={(v) => setC('lastName', v)} />
              </Field>
              <Field label={t('children.birthDate')} required>
                <DateField value={state.birthDate} onChange={(e) => setC('birthDate', e.target.value)} max={todayStr} />
              </Field>
              <Field label={t('children.gender')} required>
                <PlainSelect value={state.gender} onValueChange={(v) => setC('gender', v)} options={GENDERS} />
              </Field>
              <Field label={t('children.enrollmentStatus')} required>
                <PlainSelect value={state.enrollmentStatus} onValueChange={(v) => setC('enrollmentStatus', v)} options={ENROLLMENT_STATUSES} />
              </Field>
              {primary && (
                <Field label={t('children.phone')} className="sm:col-span-full">
                  <PhoneInput value={state.phone} onChange={(v) => setC('phone', v)} />
                  <span className="text-xs" style={{ color: 'var(--kc-text-3)' }}>
                    {t('children.phonePrimaryContactHint').replace('{name}', primaryName)}
                  </span>
                </Field>
              )}
            </div>
            <div className="rounded-lg p-4 space-y-4" style={{ background: 'var(--kc-surface-2)' }}>
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--kc-text-3)' }}>
                {t('children.childsAddress')}
              </p>
              <AddressFields value={state.address} onChange={(f, v) => setC('address', { ...state.address, [f]: v })} />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label={t('children.admissionDate')}>
                <DateField value={state.admissionDate} onChange={(e) => setC('admissionDate', e.target.value)} />
              </Field>
              <Field label={t('children.firstDayOfCare')}>
                <DateField value={state.firstCareDay} onChange={(e) => setC('firstCareDay', e.target.value)} />
              </Field>
            </div>
          </div>
        )}
      </SectionFrame>

      {/* Confirm before syncing the primary contact's phone */}
      <AlertDialog open={confirmOpen} onOpenChange={(o) => !o && resolveConfirm(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('children.syncPhoneTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('children.syncPhoneDesc').replace('{name}', primaryName)}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => resolveConfirm(false)}>
              {t('children.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                resolveConfirm(true);
              }}
            >
              {t('children.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
