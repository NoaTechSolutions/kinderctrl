'use client';

import { useEffect, useRef, useState, type ComponentType } from 'react';
import type { SectionEditorHandle, SectionProps } from './use-section-editor';

// No-op handle published when nothing in the group is editing.
const READ_HANDLE: SectionEditorHandle = {
  editing: false,
  dirty: false,
  save: async () => true,
  cancel: () => {},
};

/**
 * Stacks several inline-edit sections in ONE tab and aggregates their handles
 * into a single one for the shell's guard — mirrors how MedicalSection combines
 * its cards. Each child section still owns its own read↔edit/save lifecycle; the
 * group just surfaces whichever one is currently editing (only one can be, since
 * each section disables nothing — but in practice the user edits one at a time).
 */
export function SectionGroup({
  child,
  canManage,
  onEditorChange,
  sections,
}: SectionProps & { sections: ReadonlyArray<ComponentType<SectionProps>> }) {
  const [handles, setHandles] = useState<Record<number, SectionEditorHandle>>({});

  // Stable per-index registrar so children's effect deps don't churn.
  const registrars = useRef<Record<number, (h: SectionEditorHandle) => void>>({});
  sections.forEach((_, i) => {
    if (!registrars.current[i]) {
      registrars.current[i] = (h) =>
        setHandles((prev) => (prev[i] === h ? prev : { ...prev, [i]: h }));
    }
  });

  const editing = Object.values(handles).find((h) => h.editing) ?? READ_HANDLE;
  useEffect(() => onEditorChange(editing), [editing, onEditorChange]);

  return (
    <div className="space-y-4">
      {sections.map((Section, i) => (
        <Section
          key={i}
          child={child}
          canManage={canManage}
          onEditorChange={registrars.current[i]}
        />
      ))}
    </div>
  );
}
