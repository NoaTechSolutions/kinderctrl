'use client';

import { useEffect } from 'react';

/**
 * Warn the user before they navigate away from the page while the
 * `isDirty` flag is true. Covers two exits:
 *
 *   - browser tab close / page refresh / external URL change — handled
 *     by `beforeunload`; the browser shows its native dialog and ignores
 *     custom message text.
 *   - internal navigation via Next.js `<Link>` or any `<a href>` click —
 *     intercepted at the document level (capture phase) and blocked
 *     with `window.confirm` so we can show our own message.
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

      const confirmed = window.confirm(message);
      if (!confirmed) {
        e.preventDefault();
        e.stopImmediatePropagation();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('click', handleClick, true);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('click', handleClick, true);
    };
  }, [isDirty, message]);
}
