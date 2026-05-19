'use client';

import * as React from 'react';
import { ArrowLeft } from 'lucide-react';

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface BottomSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Header title — required. Kept text-only by design; no rich content. */
  title: string;
  /** Optional secondary line below the title. */
  description?: string;
  /**
   * When provided, renders a back arrow above the title and calls this
   * on tap. Use for sub-views inside the same sheet (caller manages the
   * view state — the sheet just exposes the affordance).
   */
  onBack?: () => void;
  children: React.ReactNode;
  /** Override scroll container className (rarely needed). */
  contentClassName?: string;
}

/**
 * Bottom sheet — mobile-first alternative to DropdownMenu / context menus.
 *
 * Use when a dropdown's width breaks below ~640px or nested submenus
 * collide with viewport edges. Pair with a viewport check (a media
 * query hook or `md:hidden` / `hidden md:block` CSS) when the desktop
 * surface remains a DropdownMenu.
 *
 * @example basic
 * const [open, setOpen] = useState(false);
 *
 * <BottomSheet open={open} onOpenChange={setOpen} title="Admin Actions">
 *   <button onClick={handleEdit}>Edit Center</button>
 *   <button onClick={handleDelete}>Close Center</button>
 * </BottomSheet>
 *
 * @example with sub-view (replaces the desktop nested submenu)
 * const [view, setView] = useState<'main' | 'status'>('main');
 *
 * <BottomSheet
 *   open={open}
 *   onOpenChange={(o) => { setOpen(o); if (!o) setView('main'); }}
 *   title={view === 'status' ? 'Change Status' : 'Admin Actions'}
 *   onBack={view === 'status' ? () => setView('main') : undefined}
 * >
 *   {view === 'main' ? <MainItems /> : <StatusItems />}
 * </BottomSheet>
 *
 * What is intentionally NOT here (avoid premature abstraction; the
 * project has a single use case today and a clear rule against
 * designing for hypothetical futures):
 *  - Item / Divider / Section subcomponents — callers compose content
 *    with plain elements + existing primitives (Button, Separator, etc.).
 *  - Snap points — Radix Sheet (underneath) does not support them. If
 *    needed later, swap the implementation for `vaul`.
 *  - Swipe-to-dismiss gestures — Radix Sheet supports tap-outside and
 *    Escape only. The top handle bar is a visual affordance, not wired
 *    to a gesture.
 */
export function BottomSheet({
  open,
  onOpenChange,
  title,
  description,
  onBack,
  children,
  contentClassName,
}: BottomSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="max-h-[90vh] gap-0 rounded-t-2xl p-0"
      >
        <div className="flex justify-center pt-3 pb-1" aria-hidden>
          <div
            className="h-1 w-12 rounded-full"
            style={{ background: 'var(--kc-text-4)' }}
          />
        </div>

        <SheetHeader className="gap-1 px-4 pt-2 pb-3">
          {onBack && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="-ml-2 mb-1 h-8 self-start px-2 text-sm"
              onClick={onBack}
            >
              <ArrowLeft className="mr-1 h-4 w-4" />
              Back
            </Button>
          )}
          <SheetTitle className="text-left text-base">{title}</SheetTitle>
          {description && (
            <SheetDescription className="text-left text-xs">
              {description}
            </SheetDescription>
          )}
        </SheetHeader>

        <div
          className={cn(
            'flex-1 overflow-y-auto px-4 pb-6',
            contentClassName,
          )}
        >
          {children}
        </div>
      </SheetContent>
    </Sheet>
  );
}
