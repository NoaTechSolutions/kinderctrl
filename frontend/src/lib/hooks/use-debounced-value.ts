'use client';

import { useEffect, useState } from 'react';

/**
 * Debounce any value by `delayMs`. The returned value lags behind the
 * input — typing 'a', 'b', 'c' in quick succession only commits 'abc'
 * once the user pauses for `delayMs` milliseconds. Used to keep search
 * inputs from firing a backend request on every keystroke.
 *
 *   const [text, setText] = useState('');
 *   const debounced = useDebouncedValue(text, 300);
 *   useQuery({ queryKey: ['list', debounced], queryFn: () => fetchList(debounced) });
 */
export function useDebouncedValue<T>(value: T, delayMs: number = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}
