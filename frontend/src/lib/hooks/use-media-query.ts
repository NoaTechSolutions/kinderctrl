import { useEffect, useState } from 'react';

/**
 * Subscribes to a CSS media query and returns whether it matches.
 *
 * SSR-safe: starts as `false` until the first effect runs, so the markup
 * the server renders matches the first client paint. Downstream consumers
 * should treat `false` as "unknown / mobile" during the first paint.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(query);
    setMatches(mql.matches);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, [query]);

  return matches;
}
