'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  disabled?: boolean;
}

/**
 * Minimal pagination control. Renders nothing when there is only one
 * page so callers don't need to guard. Page numbers are 1-indexed.
 */
export function Pagination({
  page,
  totalPages,
  onPageChange,
  disabled,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const canPrev = page > 1 && !disabled;
  const canNext = page < totalPages && !disabled;

  return (
    <nav
      aria-label="Pagination"
      className="flex items-center justify-between gap-3 pt-2"
    >
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onPageChange(page - 1)}
        disabled={!canPrev}
        aria-label="Previous page"
      >
        <ChevronLeft className="mr-1 h-4 w-4" />
        Previous
      </Button>

      <span
        className="text-sm tabular-nums"
        style={{ color: 'var(--kc-text-3)' }}
        aria-live="polite"
      >
        Page <strong>{page}</strong> of <strong>{totalPages}</strong>
      </span>

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onPageChange(page + 1)}
        disabled={!canNext}
        aria-label="Next page"
      >
        Next
        <ChevronRight className="ml-1 h-4 w-4" />
      </Button>
    </nav>
  );
}
