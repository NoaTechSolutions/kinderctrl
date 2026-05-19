'use client';

import { Check, ChevronDown, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { FilterTab } from './filter-tabs';

interface FilterDropdownProps<T extends string> {
  options: ReadonlyArray<FilterTab<T>>;
  value: T;
  onChange: (value: T) => void;
  ariaLabel?: string;
}

/**
 * Mobile-friendly counterpart to FilterTabs. Same data shape (FilterTab[])
 * so callers can share a single STATUS_TABS array between both. Used as
 * the mobile rendering of a status filter where the tab strip would
 * overflow horizontally (BUG-015).
 */
export function FilterDropdown<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
}: FilterDropdownProps<T>) {
  const selected = options.find((o) => o.value === value);
  const label = selected?.label ?? 'Filter';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 h-10"
          aria-label={ariaLabel ?? 'Filter'}
        >
          <Filter className="h-4 w-4" />
          <span className="truncate">{label}</span>
          <ChevronDown className="h-3.5 w-3.5 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[200px]">
        {options.map((option) => {
          const isSelected = option.value === value;
          return (
            <DropdownMenuItem
              key={option.value}
              onSelect={() => {
                if (!isSelected) onChange(option.value);
              }}
              className="flex items-center justify-between gap-2"
            >
              <span>{option.label}</span>
              {isSelected && <Check className="h-4 w-4 opacity-80" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
