'use client';

import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Check, Loader2, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n';
import { FieldEditingProvider } from './field';
import type { SectionMode } from './use-section-editor';

// Read-only card — same shell + header as SectionFrame's read mode (circular
// tinted icon + title) but NO edit chrome. For read-only surfaces like the
// detail Overview tab. Pair the body with ReadRow/ReadGrid.
export function ReadCard({
  title,
  icon: Icon,
  action,
  children,
}: {
  title: string;
  icon?: LucideIcon;
  // Optional header-right slot (e.g. an Edit button that opens a modal) — for
  // read-display cards whose editing lives elsewhere (modal / wizard step jump).
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div
      className="overflow-hidden rounded-xl"
      style={{ border: '0.5px solid var(--kc-border)', background: 'var(--kc-surface)' }}
    >
      <div className="flex items-center gap-3 px-4 py-2.5">
        {Icon && (
          <span
            className="flex h-8 w-8 flex-none items-center justify-center rounded-full"
            style={{ background: 'var(--kc-p-50)', color: 'var(--kc-p-600)' }}
          >
            <Icon className="h-4 w-4" />
          </span>
        )}
        <h3 className="min-w-0 flex-1 truncate text-[15px] font-medium" style={{ color: 'var(--kc-text-1)' }}>
          {title}
        </h3>
        {action && <div className="flex-none">{action}</div>}
      </div>
      <div style={{ borderTop: '0.5px solid var(--kc-border)' }} />
      <div className="px-4 py-4">{children}</div>
    </div>
  );
}

// Card frame shared by every detail card (the SAAS card design). Read mode: a
// tinted circular icon + title + "Edit" pill. Edit mode: purple 1.5px border +
// tinted header + solid icon + "Editing" badge + Cancel/Save, and the body is
// wrapped in FieldEditingProvider so Field renders its purple card-edit style.
// Save is disabled until the section is dirty so a no-op edit can't fire.
export function SectionFrame({
  title,
  icon: Icon,
  mode,
  dirty,
  saving,
  canManage,
  canEdit = true,
  onEdit,
  onSave,
  onCancel,
  children,
  id,
}: {
  title: string;
  icon?: LucideIcon;
  mode: SectionMode;
  dirty: boolean;
  saving: boolean;
  canManage: boolean;
  // Lets a parent (e.g. the Medical tab) block Edit while another card edits.
  canEdit?: boolean;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  children: ReactNode;
  id?: string;
}) {
  const { t } = useTranslation();
  const editing = mode === 'edit';

  return (
    // scroll-mt keeps the card clear of the sticky header when a badge anchors to it.
    <div id={id} className="scroll-mt-24">
      <div
        className={cn('overflow-hidden rounded-xl', editing && 'kc-section-editing')}
        style={{
          border: editing
            ? '1.5px solid var(--kc-p-600)'
            : '0.5px solid var(--kc-border)',
          background: 'var(--kc-surface)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center gap-3 px-4 py-2.5"
          style={{ background: editing ? 'var(--kc-p-50)' : 'transparent' }}
        >
          {Icon && (
            <span
              className="flex h-8 w-8 flex-none items-center justify-center rounded-full"
              style={
                editing
                  ? { background: 'var(--kc-p-600)', color: '#fff' }
                  : { background: 'var(--kc-p-50)', color: 'var(--kc-p-600)' }
              }
            >
              <Icon className="h-4 w-4" />
            </span>
          )}

          <div className="flex min-w-0 flex-1 items-center gap-2">
            <h3
              className="truncate text-[15px] font-medium"
              style={{ color: editing ? 'var(--kc-p-900)' : 'var(--kc-text-1)' }}
            >
              {title}
            </h3>
            {editing && (
              <span
                className="flex-none rounded-full px-2 py-0.5 text-[10px] font-semibold text-white"
                style={{ background: 'var(--kc-p-600)' }}
              >
                {t('children.editingBadge')}
              </span>
            )}
          </div>

          {editing ? (
            <div className="flex flex-none gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onCancel}
                disabled={saving}
                style={{ borderColor: 'var(--kc-p-300)', color: 'var(--kc-p-600)' }}
              >
                {t('children.cancel')}
              </Button>
              <Button
                size="sm"
                onClick={onSave}
                disabled={saving || !dirty}
                style={{ background: 'var(--kc-p-600)', color: '#fff' }}
              >
                {saving ? (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Check className="mr-1.5 h-3.5 w-3.5" />
                )}
                {t('children.save')}
              </Button>
            </div>
          ) : (
            canManage && (
              <Button
                variant="outline"
                size="sm"
                onClick={onEdit}
                disabled={!canEdit}
                className="flex-none"
                style={{ background: 'var(--kc-surface)', color: 'var(--kc-text-2)' }}
              >
                <Pencil className="mr-1.5 h-3.5 w-3.5" />
                {t('children.edit')}
              </Button>
            )
          )}
        </div>

        {/* Divider */}
        <div style={{ borderTop: '0.5px solid var(--kc-border)' }} />

        {/* Body */}
        <div className="px-4 py-4">
          {editing ? (
            <FieldEditingProvider editing>{children}</FieldEditingProvider>
          ) : (
            children
          )}
        </div>
      </div>
    </div>
  );
}
