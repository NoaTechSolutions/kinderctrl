'use client';

import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Loader2, Pencil } from 'lucide-react';
import { CardWithHeader } from '@/components/ui/card-with-header';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/lib/i18n';
import type { SectionMode } from './use-section-editor';

// Card frame shared by every detail tab. Read mode shows an Edit button (only
// when the viewer can manage); edit mode swaps it for Cancel / Save. Save is
// disabled until the section is dirty so a no-op edit can't fire a request.
export function SectionFrame({
  title,
  icon,
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

  const action =
    mode === 'read' ? (
      canManage ? (
        <Button variant="outline" size="sm" onClick={onEdit} disabled={!canEdit}>
          <Pencil className="mr-1.5 h-3.5 w-3.5" />
          {t('children.edit')}
        </Button>
      ) : null
    ) : (
      <div className="flex gap-2">
        <Button variant="ghost" size="sm" onClick={onCancel} disabled={saving}>
          {t('children.cancel')}
        </Button>
        <Button size="sm" onClick={onSave} disabled={saving || !dirty}>
          {saving && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
          {t('children.save')}
        </Button>
      </div>
    );

  return (
    // scroll-mt keeps the card clear of the sticky header when a badge scrolls
    // to it via its id anchor.
    <div id={id} className="scroll-mt-24">
      <CardWithHeader icon={icon} title={title} contentClassName="pt-2">
        {/* Action in normal flow (not the card's absolute slot) so it never
            overlaps the first row of content — e.g. the first parent card. */}
        {action && <div className="mb-3 flex items-center justify-end">{action}</div>}
        {children}
      </CardWithHeader>
    </div>
  );
}
