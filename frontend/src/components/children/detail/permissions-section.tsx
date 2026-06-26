'use client';

import { useEffect, useMemo, type ReactNode } from 'react';
import { Calendar, Check, FileText, ShieldCheck, Sun, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { DateField } from '@/components/ui/date-field';
import { useTranslation } from '@/lib/i18n';
import { useUpdateChildConsents } from '@/lib/hooks/use-children';
import { Field } from '../child-form-fields';
import { CheckboxRow, MedTextarea } from './section-fields';
import { fmtDate } from '@/components/ui/read-view';
import { SectionFrame } from '@/components/ui/section-frame';
import { useSectionEditor, type SectionProps } from '@/components/ui/use-section-editor';
import { buildConsentsPayload, seedConsents, type ConsentsState } from './section-data';

// Clear approved / not-approved pill — legal clarity (icon + word, not just a
// checkmark) so a read is never ambiguous about what was granted.
function ConsentPill({ granted }: { granted: boolean }) {
  const { t } = useTranslation();
  return (
    <span
      className="inline-flex flex-none items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold"
      style={
        granted
          ? {
              background: 'color-mix(in oklch, var(--kc-p-100), transparent 30%)',
              color: 'var(--kc-p-700)',
            }
          : { background: 'var(--kc-surface-2)', color: 'var(--kc-text-3)' }
      }
    >
      {granted ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
      {granted ? t('children.consentApproved') : t('children.consentNotApproved')}
    </span>
  );
}

function ConsentReadItem({ label, granted }: { label: string; granted: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border p-2.5" style={{ borderColor: 'var(--kc-border)' }}>
      <span className="text-sm" style={{ color: 'var(--kc-text-1)' }}>{label}</span>
      <ConsentPill granted={granted} />
    </div>
  );
}

function SubDetail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="mt-1.5">
      <dt className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--kc-text-3)' }}>{label}</dt>
      <dd className="mt-0.5 text-sm break-words whitespace-pre-wrap" style={{ color: 'var(--kc-text-1)' }}>{children}</dd>
    </div>
  );
}

export function PermissionsSection({ child, canManage, onEditorChange }: SectionProps) {
  const { t, locale } = useTranslation();
  const mut = useUpdateChildConsents();
  const seed = useMemo(() => seedConsents(child), [child]);
  const ed = useSectionEditor<ConsentsState>({
    seed,
    saving: mut.isPending,
    save: (s) => mut.mutateAsync({ childId: child.id, payload: buildConsentsPayload(s) }),
  });
  useEffect(() => onEditorChange(ed.handle), [ed.handle, onEditorChange]);

  const { state, setState } = ed;
  const set = <K extends keyof ConsentsState>(k: K, v: ConsentsState[K]) =>
    setState((s) => ({ ...s, [k]: v }));

  const c = seed;
  const consents = child.consents ?? null;
  // Signature trail (read-only — set server-side).
  const signer = consents?.signedBy;
  const signerName = signer
    ? `${signer.firstName ?? ''} ${signer.lastName ?? ''}`.trim() || signer.email
    : '';
  const dateRange =
    c.sunscreenStartDate || c.sunscreenEndDate
      ? `${c.sunscreenStartDate ? fmtDate(c.sunscreenStartDate, locale) : ''} → ${c.sunscreenEndDate ? fmtDate(c.sunscreenEndDate, locale) : ''}`
      : '';

  return (
    <SectionFrame
      id="permissions-card"
      title={t('children.permissions')}
      icon={ShieldCheck}
      mode={ed.mode}
      dirty={ed.dirty}
      saving={ed.saving}
      canManage={canManage}
      onEdit={ed.enterEdit}
      onSave={ed.save}
      onCancel={ed.cancel}
    >
      {ed.mode === 'read' ? (
        <div className="space-y-3">
          <ConsentReadItem label={t('children.consentWaterPlay')} granted={c.waterPlay} />
          <ConsentReadItem label={t('children.consentPhotoInternal')} granted={c.photoInternal} />
          <ConsentReadItem label={t('children.consentPhotoMarketing')} granted={c.photoMarketing} />

          <div className="rounded-md border p-2.5" style={{ borderColor: 'var(--kc-border)' }}>
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm" style={{ color: 'var(--kc-text-1)' }}>{t('children.consentSunscreen')}</span>
              <ConsentPill granted={c.sunscreenRepellent} />
            </div>
            {c.sunscreenRepellent && (
              <dl>
                <SubDetail label={t('children.sunscreenProducts')}>{c.sunscreenProducts}</SubDetail>
                <SubDetail label={t('children.sunscreenInstructions')}>{c.sunscreenInstructions}</SubDetail>
                <SubDetail label={t('children.sunscreenDates')}>{dateRange}</SubDetail>
              </dl>
            )}
          </div>

          <ConsentReadItem label={t('children.consentEmergencyMedical')} granted={c.emergencyMedical} />
          <ConsentReadItem label={t('children.consentEmergencyTransport')} granted={c.emergencyTransport} />

          {consents?.signedAt && (
            <p className="pt-1 text-xs" style={{ color: 'var(--kc-text-3)' }}>
              {t('children.signedBy')
                .replace('{name}', signerName || t('children.unknownUser'))
                .replace('{date}', fmtDate(consents.signedAt, locale))}
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <CheckboxRow checked={state.waterPlay} onChange={(v) => set('waterPlay', v)} label={t('children.consentWaterPlay')} />
          <CheckboxRow checked={state.photoInternal} onChange={(v) => set('photoInternal', v)} label={t('children.consentPhotoInternal')} />
          <CheckboxRow checked={state.photoMarketing} onChange={(v) => set('photoMarketing', v)} label={t('children.consentPhotoMarketing')} />

          <div className="rounded-lg border p-4 space-y-4" style={{ borderColor: 'var(--kc-border)' }}>
            <CheckboxRow checked={state.sunscreenRepellent} onChange={(v) => set('sunscreenRepellent', v)} label={t('children.consentSunscreen')} />
            {state.sunscreenRepellent && (
              <div className="space-y-4">
                <Field icon={Sun} label={t('children.sunscreenProducts')}>
                  <Input value={state.sunscreenProducts} onChange={(e) => set('sunscreenProducts', e.target.value)} />
                </Field>
                <Field icon={FileText} label={t('children.sunscreenInstructions')}>
                  <MedTextarea value={state.sunscreenInstructions} onChange={(v) => set('sunscreenInstructions', v)} />
                </Field>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field icon={Calendar} label={t('children.sunscreenStartDate')}>
                    <DateField value={state.sunscreenStartDate} onChange={(e) => set('sunscreenStartDate', e.target.value)} />
                  </Field>
                  <Field icon={Calendar} label={t('children.sunscreenEndDate')}>
                    <DateField value={state.sunscreenEndDate} onChange={(e) => set('sunscreenEndDate', e.target.value)} />
                  </Field>
                </div>
              </div>
            )}
          </div>

          <CheckboxRow checked={state.emergencyMedical} onChange={(v) => set('emergencyMedical', v)} label={t('children.consentEmergencyMedical')} />
          <CheckboxRow checked={state.emergencyTransport} onChange={(v) => set('emergencyTransport', v)} label={t('children.consentEmergencyTransport')} />

          {consents?.signedAt && (
            <p className="text-xs" style={{ color: 'var(--kc-text-3)' }}>
              {t('children.signedBy')
                .replace('{name}', signerName || t('children.unknownUser'))
                .replace('{date}', fmtDate(consents.signedAt, locale))}
            </p>
          )}
        </div>
      )}
    </SectionFrame>
  );
}
