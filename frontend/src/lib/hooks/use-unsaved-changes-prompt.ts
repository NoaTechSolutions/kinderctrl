'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useConfirm } from '@/lib/toast';
import { useTranslation } from '@/lib/i18n';

/**
 * Warn the user before they navigate away from the page while the
 * `isDirty` flag is true. Covers two exits:
 *
 *   - browser tab close / page refresh / external URL change — handled
 *     by `beforeunload`; the browser shows its native dialog and ignores
 *     custom message text. We CANNOT replace this with a branded
 *     ConfirmDialog because `beforeunload` is synchronous and async
 *     promises are dropped before the unload completes. This is a
 *     browser-level constraint.
 *
 *   - internal navigation via Next.js `<Link>` or any `<a href>` click —
 *     intercepted at the document level (capture phase). PO QA #55
 *     (FEATURE 4): we block the navigation immediately, then fire the
 *     branded ConfirmDialog asynchronously. If the user confirms we
 *     re-execute the navigation via `router.push`; if they cancel, we
 *     stay on the page. The native window.confirm() pattern was
 *     replaced because it didn't match the rest of the UI.
 *
 * Programmatic navigation via `router.push()` is intentionally NOT
 * intercepted — callers that perform programmatic navigation should
 * either reset the form first or check `isDirty` themselves before
 * navigating. This is by design: the hook protects against accidental
 * exits, not deliberate ones.
 */
export function useUnsavedChangesPrompt(
  isDirty: boolean,
  message: string,
) {
  const confirm = useConfirm();
  const router = useRouter();
  const { t } = useTranslation();

  useEffect(() => {
    if (!isDirty) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // Modern browsers require returnValue to be set; the actual text
      // is ignored — they show their own localized prompt.
      e.returnValue = '';
    };

    const handleClick = (e: MouseEvent) => {
      // Respect modifier-clicks: cmd/ctrl-click opens in a new tab and
      // doesn't navigate the current page.
      if (e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      const anchor = (e.target as HTMLElement | null)?.closest('a');
      if (!anchor) return;
      const href = anchor.getAttribute('href');
      if (!href) return;
      // target=_blank opens a new tab — current page stays.
      if (anchor.target === '_blank') return;
      // In-page hash navigation is not a leave.
      if (href.startsWith('#')) return;
      // External links go through beforeunload naturally; let them.
      if (/^https?:\/\//i.test(href)) return;

      // Block first — the click handler is synchronous, we can't await
      // the async confirm before deciding whether to navigate. Stop
      // the default link behavior + bubbling so Next.js's own router
      // doesn't pick it up either. Then run the branded ConfirmDialog
      // asynchronously and re-trigger the navigation manually on
      // confirm.
      e.preventDefault();
      e.stopImmediatePropagation();

      void confirm({
        title: t('staff.discardChangesTitle'),
        description: message,
        confirmText: t('staff.discardChangesAction'),
        cancelText: t('staff.keepEditing'),
        variant: 'warning',
      }).then((ok) => {
        if (ok) router.push(href);
      });
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('click', handleClick, true);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('click', handleClick, true);
    };
  }, [isDirty, message, confirm, router, t]);
}
