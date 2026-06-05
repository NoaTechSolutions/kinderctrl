'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ChevronDown, ChevronLeft, LogOut, Settings } from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/store/auth';
import { useTranslation } from '@/lib/i18n';
import { logout as logoutApi } from '@/lib/api/auth';
import {
  useNavEntries,
  isGroup,
  collectNavHrefs,
  isNavItemActive,
  type NavItem,
  type NavGroup,
} from './use-nav-entries';

// Nav types, `isGroup`, and the role-aware entry tree now live in
// ./use-nav-entries so the desktop Sidebar and the mobile Sheet nav share a
// single source of truth and can never drift.

const COLLAPSED_STORAGE_KEY = 'kc-sidebar-collapsed';

function readCollapsedStored(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(COLLAPSED_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useTranslation();
  const clearTokens = useAuthStore((s) => s.clearTokens);
  const NAV_ENTRIES = useNavEntries();

  // Every rendered href (incl. the bottom Settings item) — feeds the shared
  // "most specific wins" active matcher so a parent route doesn't stay
  // highlighted on a child route.
  const allHrefs = [...collectNavHrefs(NAV_ENTRIES), '/settings'];

  // Persisted state — written to localStorage. The user's
  // "preferred" sidebar mode.
  const [collapsed, setCollapsedState] = useState(false);
  useEffect(() => {
    setCollapsedState(readCollapsedStored());
  }, []);
  const setCollapsed = (next: boolean) => {
    setCollapsedState(next);
    try {
      window.localStorage.setItem(COLLAPSED_STORAGE_KEY, next ? '1' : '0');
    } catch {
      // localStorage unavailable
    }
  };

  // v13 Opción B: temporary expansion driven by clicking a group icon
  // when collapsed. Temp expansion does NOT touch the persisted
  // `collapsed` value — Israel's spec is explicit about this. Click
  // outside, navigate, or use the chevron to dismiss temp; click K
  // to commit it to permanent.
  const [tempExpanded, setTempExpanded] = useState(false);
  const [tempOpenGroup, setTempOpenGroup] = useState<string | null>(null);

  // Visual expansion = persistent OR temporary. Every child reads
  // this, NOT `collapsed`, to decide its layout.
  const isExpanded = !collapsed || tempExpanded;

  const sidebarRef = useRef<HTMLDivElement>(null);

  // Click anywhere outside the sidebar while temp-expanded → dismiss
  // temp. Mirrors how dropdowns/popovers behave.
  useEffect(() => {
    if (!tempExpanded) return;
    const handleDocumentMouseDown = (e: MouseEvent) => {
      if (
        sidebarRef.current &&
        !sidebarRef.current.contains(e.target as Node)
      ) {
        setTempExpanded(false);
        setTempOpenGroup(null);
      }
    };
    document.addEventListener('mousedown', handleDocumentMouseDown);
    return () => {
      document.removeEventListener('mousedown', handleDocumentMouseDown);
    };
  }, [tempExpanded]);

  // Pathname change while temp-expanded → user navigated (via a
  // sub-item link OR external navigation). Reset temp so the sidebar
  // returns to its persisted (collapsed) state on the next page.
  // Guarded so the initial mount with tempExpanded=false doesn't
  // touch state needlessly.
  useEffect(() => {
    if (tempExpanded) {
      setTempExpanded(false);
      setTempOpenGroup(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // K logo click — "commit" semantics:
  //   - Truly collapsed (no temp) → expand permanently
  //   - Truly expanded → collapse permanently
  //   - Temp expanded → commit to permanent expand
  // K reads as "make what I see right now permanent".
  const handleKLogoClick = () => {
    if (tempExpanded) {
      setCollapsed(false);
      setTempExpanded(false);
      setTempOpenGroup(null);
    } else {
      setCollapsed(!collapsed);
    }
  };

  // Chevron click — "dismiss visible expansion" semantics:
  //   - Temp expanded → dismiss temp (persisted stays collapsed)
  //   - Truly expanded → collapse permanently
  // Chevron only renders when isExpanded is true.
  const handleChevronClick = () => {
    if (tempExpanded) {
      setTempExpanded(false);
      setTempOpenGroup(null);
    } else {
      setCollapsed(true);
    }
  };

  // Click on a group icon while sidebar is in collapsed display.
  // Triggers temp expansion + flags WHICH group should be opened on
  // the next render. The group itself is rendered via SidebarGroup
  // (expanded variant) with defaultOpen=true via key remount.
  const handleGroupClickWhenCollapsed = (groupTitle: string) => {
    setTempExpanded(true);
    setTempOpenGroup(groupTitle);
  };

  const handleLogout = async () => {
    try {
      await logoutApi();
    } catch {
      // ignore: local clear is the source of truth
    } finally {
      clearTokens();
      router.replace('/login');
    }
  };

  // The display mode every child component branches on. `collapsed`
  // (the prop) is true ONLY when the sidebar should render its narrow
  // icon-stack layout. Note: isExpanded === !displayCollapsed.
  const displayCollapsed = !isExpanded;

  return (
    <div
      ref={sidebarRef}
      className={cn(
        'relative flex h-full flex-col border-r transition-all duration-200',
        displayCollapsed ? 'w-[72px]' : 'w-56',
      )}
      style={{
        background: 'var(--kc-surface)',
        borderColor: 'var(--kc-border)',
      }}
    >
      <div
        className="flex h-16 items-center border-b"
        style={{ borderColor: 'var(--kc-border)' }}
      >
        {displayCollapsed ? (
          <div className="flex justify-center w-full px-2">
            <button
              type="button"
              onClick={handleKLogoClick}
              aria-label={t('sidebar.expand')}
              title={t('sidebar.expand')}
              className="hover:opacity-80 transition-opacity"
            >
              <KLogo />
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between w-full px-3">
            <button
              type="button"
              onClick={handleKLogoClick}
              aria-label={
                tempExpanded
                  ? t('sidebar.pinExpansion')
                  : t('sidebar.collapse')
              }
              title={
                tempExpanded
                  ? t('sidebar.pinExpansion')
                  : t('sidebar.collapse')
              }
              className="flex items-center gap-2.5 min-w-0 hover:opacity-80 transition-opacity"
            >
              <KLogo />
              <span className="font-display text-lg font-semibold tracking-tight truncate">
                KinderCtrl
              </span>
            </button>
            <button
              type="button"
              onClick={handleChevronClick}
              aria-label={t('sidebar.collapse')}
              title={t('sidebar.collapse')}
              className="flex-none rounded-md p-1.5 transition-colors"
              style={{ color: 'var(--kc-text-3)' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--kc-surface-2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              <ChevronLeft className="h-4 w-4" aria-hidden />
            </button>
          </div>
        )}
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-2">
        {NAV_ENTRIES.map((entry, idx) => {
          if (isGroup(entry)) {
            if (displayCollapsed) {
              // Collapsed display: render as a click trigger that
              // flips tempExpanded. The next render will pick up
              // !displayCollapsed and render the SidebarGroup branch.
              return (
                <CollapsedGroupTrigger
                  key={`group-${entry.title}-${idx}`}
                  group={entry}
                  pathname={pathname}
                  onClick={() =>
                    handleGroupClickWhenCollapsed(entry.title)
                  }
                />
              );
            }
            // Expanded display (permanent OR temp). When this group
            // matches tempOpenGroup, the `key` trick forces a remount
            // so SidebarGroup's defaultOpen takes effect — the group
            // appears pre-opened. Other groups keep their normal
            // "open if any child active" default.
            const isTempOpen = tempOpenGroup === entry.title;
            return (
              <SidebarGroup
                key={`group-${entry.title}-${idx}-${isTempOpen ? 'temp' : 'persistent'}`}
                group={entry}
                pathname={pathname}
                allHrefs={allHrefs}
                defaultOpen={isTempOpen ? true : undefined}
              />
            );
          }
          return (
            <SidebarItem
              key={entry.href}
              item={entry}
              pathname={pathname}
              allHrefs={allHrefs}
              collapsed={displayCollapsed}
            />
          );
        })}
      </nav>

      <div
        className="border-t p-2 space-y-1"
        style={{ borderColor: 'var(--kc-border)' }}
      >
        <SidebarItem
          item={{
            title: 'Settings',
            href: '/settings',
            icon: Settings,
            active: false,
          }}
          pathname={pathname}
          allHrefs={allHrefs}
          collapsed={displayCollapsed}
        />
        <LogoutButton
          collapsed={displayCollapsed}
          onLogout={handleLogout}
        />
      </div>
    </div>
  );
}

// Brand mark — extracted so the collapsed-vs-expanded headers can
// share the exact same disc without copy/paste drift.
function KLogo() {
  return (
    <div
      className="flex h-8 w-8 flex-none items-center justify-center rounded-lg text-white font-display"
      style={{ background: 'var(--kc-p-600)' }}
    >
      <span className="text-lg font-bold leading-none">K</span>
    </div>
  );
}

function SidebarGroup({
  group,
  pathname,
  allHrefs,
  defaultOpen,
}: {
  group: NavGroup;
  pathname: string;
  allHrefs: string[];
  // v13: external override for initial open state. Used when the
  // parent forces a temp expansion via clicking a collapsed group
  // icon — the key prop also changes so the component remounts
  // and picks up this defaultOpen. Once mounted, the user can
  // freely toggle via the chevron trigger.
  defaultOpen?: boolean;
}) {
  const isAnyChildActive = group.items.some((it) =>
    pathname.startsWith(it.href),
  );
  const [open, setOpen] = useState(defaultOpen ?? isAnyChildActive);
  const Icon = group.icon;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger
        className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors"
        style={{ color: 'var(--kc-text-2)' }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'var(--kc-surface-2)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent';
        }}
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
          <SidebarItem
            key={item.href}
            item={item}
            pathname={pathname}
            allHrefs={allHrefs}
            collapsed={false}
          />
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}

// v13: collapsed-mode group trigger. Just a click target — no hover
// fly-out, no inline panel. Clicking dispatches `onClick` which the
// parent uses to set tempExpanded=true + tempOpenGroup, triggering
// the temp-expansion flow.
function CollapsedGroupTrigger({
  group,
  pathname,
  onClick,
}: {
  group: NavGroup;
  pathname: string;
  onClick: () => void;
}) {
  const Icon = group.icon;
  const isGroupActive = group.items.some((it) =>
    pathname.startsWith(it.href),
  );
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center gap-0.5 py-2 px-1 w-full rounded-lg transition-colors"
      style={
        isGroupActive
          ? {
              background:
                'color-mix(in oklch, var(--kc-p-100), transparent 30%)',
              color: 'var(--kc-p-700)',
            }
          : { color: 'var(--kc-text-2)' }
      }
      onMouseEnter={(e) => {
        if (!isGroupActive)
          e.currentTarget.style.background = 'var(--kc-surface-2)';
      }}
      onMouseLeave={(e) => {
        if (!isGroupActive)
          e.currentTarget.style.background = 'transparent';
      }}
    >
      <Icon className="h-5 w-5 flex-none" />
      <span
        className="text-[10px] leading-tight text-center w-full truncate"
        style={
          isGroupActive
            ? { color: 'var(--kc-p-700)' }
            : { color: 'var(--kc-text-3)' }
        }
      >
        {group.title}
      </span>
    </button>
  );
}

function SidebarItem({
  item,
  pathname,
  allHrefs,
  collapsed,
}: {
  item: NavItem;
  pathname: string;
  allHrefs: string[];
  collapsed: boolean;
}) {
  const Icon = item.icon;
  // Shared "most specific wins" matcher (see use-nav-entries) so desktop and
  // mobile can never drift again — and a parent route (e.g. /attendance) stops
  // staying active on a child route.
  const isActive = isNavItemActive(item.href, pathname, allHrefs);

  if (!item.active) {
    if (collapsed) {
      return (
        <div
          className="flex flex-col items-center gap-0.5 py-2 px-1 w-full opacity-60 cursor-not-allowed select-none rounded-lg"
          style={{ color: 'var(--kc-text-3)' }}
          aria-disabled="true"
        >
          <Icon className="h-5 w-5 flex-none" />
          <span
            className="text-[10px] leading-tight text-center w-full truncate"
            style={{ color: 'var(--kc-text-3)' }}
          >
            {item.title}
          </span>
        </div>
      );
    }
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
      className={cn(
        'flex rounded-lg text-sm font-medium transition-colors',
        collapsed
          ? 'flex-col items-center gap-0.5 py-2 px-1 w-full'
          : 'items-center gap-3 px-3 py-2',
      )}
      style={
        isActive
          ? {
              background:
                'color-mix(in oklch, var(--kc-p-100), transparent 30%)',
              color: 'var(--kc-p-700)',
            }
          : { color: 'var(--kc-text-2)' }
      }
      onMouseEnter={(e) => {
        if (!isActive)
          e.currentTarget.style.background = 'var(--kc-surface-2)';
      }}
      onMouseLeave={(e) => {
        if (!isActive) e.currentTarget.style.background = 'transparent';
      }}
    >
      <Icon className="h-5 w-5 flex-none" />
      {collapsed ? (
        <span
          className="text-[10px] leading-tight text-center w-full truncate"
          style={
            isActive
              ? { color: 'var(--kc-p-700)' }
              : { color: 'var(--kc-text-3)' }
          }
        >
          {item.title}
        </span>
      ) : (
        <span>{item.title}</span>
      )}
    </Link>
  );
}

function LogoutButton({
  collapsed,
  onLogout,
}: {
  collapsed: boolean;
  onLogout: () => void | Promise<void>;
}) {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      onClick={onLogout}
      className={cn(
        'flex w-full rounded-lg text-sm font-medium transition-colors',
        collapsed
          ? 'flex-col items-center gap-0.5 py-2 px-1'
          : 'items-center gap-3 px-3 py-2',
      )}
      style={{ color: 'var(--kc-text-2)' }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'var(--kc-error-bg)';
        e.currentTarget.style.color = 'var(--kc-error)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent';
        e.currentTarget.style.color = 'var(--kc-text-2)';
      }}
    >
      <LogOut className="h-5 w-5 flex-none" aria-hidden />
      {collapsed ? (
        <span
          className="text-[10px] leading-tight text-center w-full truncate"
          style={{ color: 'inherit' }}
        >
          {t('topbar.logout')}
        </span>
      ) : (
        <span>{t('topbar.logout')}</span>
      )}
    </button>
  );
}
