'use client';

import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface SearchInputProps {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  className?: string;
  ariaLabel?: string;
}

/**
 * Standard search input — magnifier left, clear (X) right when non-empty.
 * Pair with `useDebouncedValue` in the caller to throttle backend queries.
 * Drop-in for the project's previous inline search inputs (centers, staff).
 */
export function SearchInput({
  value,
  onChange,
  placeholder = 'Search…',
  className,
  ariaLabel,
}: SearchInputProps) {
  return (
    <div className={cn('relative', className)}>
      <Search
        className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none"
        style={{ color: 'var(--kc-text-3)' }}
        aria-hidden
      />
      <Input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pl-9 pr-9 h-10"
        aria-label={ariaLabel ?? placeholder}
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          className="absolute right-3 top-1/2 -translate-y-1/2 inline-flex items-center justify-center rounded-full p-0.5 transition-colors hover:bg-[var(--kc-surface-2)]"
          aria-label="Clear search"
        >
          <X className="h-3.5 w-3.5" style={{ color: 'var(--kc-text-3)' }} />
        </button>
      )}
    </div>
  );
}
