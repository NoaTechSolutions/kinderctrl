'use client';

import { useCallback, useEffect, useState, type RefObject } from 'react';
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
import { FilterTabs, type FilterTab } from '@/components/ui/filter-tabs';
import { useUnsavedChangesPrompt } from '@/lib/hooks/use-unsaved-changes-prompt';
import { useTranslation } from '@/lib/i18n';
import type { Child } from '@/lib/types/child';
import { ChildDetailsSection } from './child-details-section';
import { ParentsSection } from './parents-section';
import { MedicalSection } from './medical-section';
import { ContactsSection } from './contacts-section';
import { DevelopmentSection } from './development-section';
import { RoutinesSection } from './routines-section';
import { ToiletSection } from './toilet-section';
import { PersonalitySection } from './personality-section';
import { PermissionsSection } from './permissions-section';
import { InfantSleepSection } from './infant-sleep-section';
import type { SectionEditorHandle } from './use-section-editor';

export type DetailTab =
  | 'child'
  | 'parents'
  | 'medical'
  | 'contacts'
  | 'development'
  | 'routines'
  | 'toilet'
  | 'infantSleep'
  | 'personality'
  | 'permissions';

// A guarded navigator the header badges call: jump to a tab and (optionally)
// scroll to a card by element id. Goes through the same unsaved-changes guard
// as the tab bar.
export type DetailNavigate = (tab: DetailTab, anchorId?: string) => void;

export function ChildDetailTabs({
  child,
  canManage,
  navRef,
}: {
  child: Child;
  canManage: boolean;
  navRef?: RefObject<DetailNavigate | null>;
}) {
  const { t } = useTranslation();
  const [tab, setTab] = useState<DetailTab>('child');
  const [anchor, setAnchor] = useState<string | null>(null);
  const [pendingTab, setPendingTab] = useState<DetailTab | null>(null);
  const [pendingAnchor, setPendingAnchor] = useState<string | null>(null);
  // Handle published by the ACTIVE section (only one is mounted at a time).
  const [activeHandle, setActiveHandle] = useState<SectionEditorHandle | null>(null);

  const onEditorChange = useCallback((h: SectionEditorHandle) => setActiveHandle(h), []);

  const TABS: ReadonlyArray<FilterTab<DetailTab>> = [
    { value: 'child', label: t('children.childDetails') },
    { value: 'parents', label: t('children.colParents') },
    { value: 'medical', label: t('children.medical') },
    { value: 'contacts', label: t('children.contacts') },
    { value: 'development', label: t('children.development') },
    { value: 'routines', label: t('children.routines') },
    { value: 'toilet', label: t('children.toilet') },
    { value: 'infantSleep', label: t('children.infantSleep') },
    { value: 'personality', label: t('children.personality') },
    { value: 'permissions', label: t('children.permissions') },
  ];

  // The active section is "blocking" only while it's in edit mode AND dirty.
  const blocking = !!activeHandle?.editing && !!activeHandle?.dirty;

  // Module-exit guard (sidebar / back / refresh).
  useUnsavedChangesPrompt(blocking, t('children.unsavedLeaveEdit'));

  const requestTab = useCallback(
    (next: DetailTab, anchorId?: string) => {
      if (next === tab) {
        if (anchorId) setAnchor(anchorId);
        return;
      }
      if (blocking) {
        setPendingTab(next);
        setPendingAnchor(anchorId ?? null);
        return;
      }
      setTab(next);
      setAnchor(anchorId ?? null);
    },
    [tab, blocking],
  );

  // Expose the guarded navigator to the header badges (refreshed each render).
  useEffect(() => {
    if (navRef) navRef.current = requestTab;
  });
  useEffect(() => () => {
    if (navRef) navRef.current = null;
  }, [navRef]);

  // Scroll to the anchored card once the tab content has mounted.
  useEffect(() => {
    if (!anchor) return;
    const r = requestAnimationFrame(() => {
      document.getElementById(anchor)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    return () => cancelAnimationFrame(r);
  }, [anchor, tab]);

  const sectionProps = { child, canManage, onEditorChange };

  return (
    <div className="space-y-4">
      <FilterTabs tabs={TABS} value={tab} onChange={(next) => requestTab(next)} ariaLabel={t('children.editSectionsAria')} />

      {tab === 'child' && <ChildDetailsSection {...sectionProps} />}
      {tab === 'parents' && <ParentsSection {...sectionProps} />}
      {tab === 'medical' && <MedicalSection {...sectionProps} />}
      {tab === 'contacts' && <ContactsSection {...sectionProps} />}
      {tab === 'development' && <DevelopmentSection {...sectionProps} />}
      {tab === 'routines' && <RoutinesSection {...sectionProps} />}
      {tab === 'toilet' && <ToiletSection {...sectionProps} />}
      {tab === 'infantSleep' && <InfantSleepSection {...sectionProps} />}
      {tab === 'personality' && <PersonalitySection {...sectionProps} />}
      {tab === 'permissions' && <PermissionsSection {...sectionProps} />}

      {/* Tab-switch guard — active section has unsaved edits */}
      <AlertDialog open={pendingTab !== null} onOpenChange={(o) => !o && setPendingTab(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('children.unsavedTitle')}</AlertDialogTitle>
            <AlertDialogDescription>{t('children.unsavedTabDesc')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:gap-2">
            <AlertDialogCancel>{t('children.cancel')}</AlertDialogCancel>
            <Button
              variant="outline"
              onClick={() => {
                const target = pendingTab;
                const a = pendingAnchor;
                activeHandle?.cancel();
                setPendingTab(null);
                setPendingAnchor(null);
                if (target) {
                  setTab(target);
                  setAnchor(a);
                }
              }}
            >
              {t('children.discard')}
            </Button>
            <AlertDialogAction
              onClick={async (e) => {
                e.preventDefault();
                const target = pendingTab;
                const a = pendingAnchor;
                const ok = (await activeHandle?.save()) ?? false;
                setPendingTab(null);
                setPendingAnchor(null);
                if (ok && target) {
                  setTab(target);
                  setAnchor(a);
                }
              }}
            >
              {t('children.saveAndContinue')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
