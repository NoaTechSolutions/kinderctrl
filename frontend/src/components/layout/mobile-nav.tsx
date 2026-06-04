'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDown, Settings } from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import {
  useNavEntries,
  isGroup,
  type NavItem,
  type NavGroup,
} from './use-nav-entries';

interface MobileNavProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MobileNav({ open, onOpenChange }: MobileNavProps) {
  const pathname = usePathname();

  // Single source of truth — same role-aware tree the desktop sidebar renders,
  // so mobile and desktop can never drift. We append Settings here because the
  // sidebar renders it in its own separate bottom section (not in the shared
  // entry list).
  const NAV_ENTRIES: (NavItem | NavGroup)[] = [
    ...useNavEntries(),
    { title: 'Settings', href: '/settings', icon: Settings, active: false },
  ];

  const closeOnClick = () => onOpenChange(false);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-72 p-0">
        <SheetHeader
          className="border-b p-6"
          style={{ borderColor: 'var(--kc-border)' }}
        >
          <SheetTitle className="flex items-center gap-2.5">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-lg text-white"
              style={{ background: 'var(--kc-p-600)' }}
            >
              <span className="text-lg font-bold leading-none">K</span>
            </div>
            <span className="font-display text-lg font-semibold tracking-tight">
              KinderCtrl
            </span>
          </SheetTitle>
        </SheetHeader>

        <nav className="space-y-1 p-4">
          {NAV_ENTRIES.map((entry, idx) =>
            isGroup(entry) ? (
              <MobileNavGroup
                key={`group-${entry.title}-${idx}`}
                group={entry}
                pathname={pathname}
                onItemClick={closeOnClick}
              />
            ) : (
              <MobileNavItem
                key={entry.href}
                item={entry}
                pathname={pathname}
                onClick={closeOnClick}
              />
            ),
          )}
        </nav>
      </SheetContent>
    </Sheet>
  );
}

function MobileNavGroup({
  group,
  pathname,
  onItemClick,
}: {
  group: NavGroup;
  pathname: string;
  onItemClick: () => void;
}) {
  const isAnyChildActive = group.items.some((it) =>
    pathname.startsWith(it.href),
  );
  const [open, setOpen] = useState(isAnyChildActive);
  const Icon = group.icon;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger
        className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors"
        style={{ color: 'var(--kc-text-2)' }}
      >
        <Icon className="h-5 w-5 flex-none" />
        <span className="flex-1 text-left">{group.title}</span>
        <ChevronDown
          className={cn(
            'h-4 w-4 transition-transform',
            open && 'rotate-180',
          )}
          aria-hidden
        />
      </CollapsibleTrigger>
      <CollapsibleContent
        className="ml-3 mt-1 space-y-1 border-l pl-3"
        style={{ borderColor: 'var(--kc-border)' }}
      >
        {group.items.map((item) => (
          <MobileNavItem
            key={item.href}
            item={item}
            pathname={pathname}
            onClick={onItemClick}
          />
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}

function MobileNavItem({
  item,
  pathname,
  onClick,
}: {
  item: NavItem;
  pathname: string;
  onClick: () => void;
}) {
  const Icon = item.icon;
  // Match the sibling-aware matcher in sidebar.tsx — /staff stays inactive
  // when the Director is on /staff/invite so the Invitations entry is the
  // one that highlights.
  const isActive = item.href.startsWith('/centers')
    ? pathname.startsWith('/centers')
    : item.href === '/staff'
      ? pathname === '/staff' ||
        (pathname.startsWith('/staff/') && !pathname.startsWith('/staff/invite'))
      : pathname.startsWith(item.href);

  if (!item.active) {
    return (
      <div
        className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium opacity-60 cursor-not-allowed select-none"
        style={{ color: 'var(--kc-text-3)' }}
        aria-disabled="true"
      >
        <Icon className="h-5 w-5 flex-none" />
        <span className="flex-1">{item.title}</span>
        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
          Soon
        </Badge>
      </div>
    );
  }

  return (
    <Link
      href={item.href}
      onClick={onClick}
      className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors"
      style={
        isActive
          ? {
              background:
                'color-mix(in oklch, var(--kc-p-100), transparent 30%)',
              color: 'var(--kc-p-700)',
            }
          : { color: 'var(--kc-text-2)' }
      }
    >
      <Icon className="h-5 w-5 flex-none" />
      <span>{item.title}</span>
    </Link>
  );
}
