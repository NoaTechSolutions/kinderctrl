'use client';

import {
  Baby,
  BarChart3,
  Building2,
  Calendar,
  Clock,
  CreditCard,
  DollarSign,
  GraduationCap,
  Home,
  Mail,
  Settings,
  ShieldAlert,
  Store,
  User,
  UserCog,
  Users,
  UsersRound,
  type LucideIcon,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import { useCenters } from '@/lib/hooks/use-centers';
import { useTranslation } from '@/lib/i18n';

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  active: boolean;
}

export interface NavGroup {
  kind: 'group';
  title: string;
  icon: LucideIcon;
  items: NavItem[];
}

export type SidebarEntry = NavItem | NavGroup;

export function isGroup(entry: SidebarEntry): entry is NavGroup {
  return (entry as NavGroup).kind === 'group';
}

/** Flattens the entry tree to every navigable href (group children + items). */
export function collectNavHrefs(entries: SidebarEntry[]): string[] {
  const hrefs: string[] = [];
  for (const entry of entries) {
    if (isGroup(entry)) hrefs.push(...entry.items.map((it) => it.href));
    else hrefs.push(entry.href);
  }
  return hrefs;
}

// A href "covers" the path when it IS the path or is one of its parent
// segments (`/a` covers `/a` and `/a/b`, but NOT `/ab`).
function coversPath(href: string, pathname: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Whether a nav item is THE active one for `pathname`, using "most specific
 * wins": when several entries cover the path (e.g. /attendance and
 * /attendance/my-corrections), only the longest href stays active — so a
 * parent (Time Clock → /attendance) no longer lights up on a child route.
 *
 * This single matcher is shared by the desktop Sidebar AND the mobile Sheet
 * nav so the two can NEVER drift again. They previously did: sidebar.tsx
 * exact-matched /attendance while mobile-nav.tsx used a bare startsWith, so on
 * /attendance/my-corrections BOTH Time Clock and My Corrections highlighted.
 * "Most specific wins" also subsumes the old /staff special case (so /staff
 * stays inactive on /staff/invite without a hardcoded branch).
 *
 * `allHrefs` is every rendered nav href — see collectNavHrefs.
 */
export function isNavItemActive(
  href: string,
  pathname: string,
  allHrefs: string[],
): boolean {
  // Centers uses a dynamic href (/centers/:id); keep it active for any
  // /centers* path regardless of the specific id or sub-tab.
  if (href.startsWith('/centers')) return pathname.startsWith('/centers');
  if (!coversPath(href, pathname)) return false;
  // Defer to any other (non-centers) entry that covers the path with a longer
  // href — that one is the real, more-specific match.
  const longest = allHrefs.reduce(
    (max, h) =>
      !h.startsWith('/centers') && coversPath(h, pathname)
        ? Math.max(max, h.length)
        : max,
    0,
  );
  return href.length === longest;
}

/**
 * Single source of truth for the role-aware navigation tree. Both the desktop
 * Sidebar and the mobile Sheet nav consume this hook so the two can NEVER drift
 * — each only owns its own rendering/styling, never the entry list itself.
 *
 * The returned array is ordered top-to-bottom as it should render. Note that
 * "Settings" is NOT included here: the desktop sidebar renders it in a separate
 * bottom section, so each surface decides where to place it.
 */
export function useNavEntries(): SidebarEntry[] {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const { data: centers } = useCenters();

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  // Role-aware Centers menu entry.
  const centerItem: NavItem | null =
    (user?.role === 'STAFF' || user?.role === 'PARENT') && user.centerId
      ? {
          title: t('centers.titleSingular'),
          href: `/centers/${user.centerId}`,
          icon: Building2,
          active: true,
        }
      : user?.role === 'DIRECTOR' &&
          (centers?.pagination.total ?? 0) >= 1 &&
          centers!.data.length > 0
        ? {
            title: t('centers.titleSingular'),
            href: `/centers/${centers!.data[0].id}`,
            icon: Building2,
            active: true,
          }
        : {
            title: t('centers.title'),
            href: '/centers',
            icon: Building2,
            active: true,
          };

  const staffGroup: NavGroup | null =
    user?.role === 'DIRECTOR'
      ? {
          kind: 'group',
          title: t('admin.staffGroup'),
          icon: Users,
          items: [
            {
              title: t('admin.staffAllNav'),
              href: '/staff',
              icon: GraduationCap,
              active: true,
            },
            {
              title: t('admin.staffInvitationsNav'),
              href: '/staff/invite',
              icon: Mail,
              active: true,
            },
          ],
        }
      : null;

  const usersGroup: NavGroup | null = isSuperAdmin
    ? {
        kind: 'group',
        title: t('admin.usersGroup'),
        icon: Users,
        items: [
          {
            title: t('admin.staffNav'),
            href: '/staff',
            icon: GraduationCap,
            active: true,
          },
          {
            title: t('admin.invitationsNav'),
            href: '/admin/invitations',
            icon: Mail,
            active: true,
          },
          {
            title: t('admin.directorsNav'),
            href: '/admin/directors',
            icon: UserCog,
            active: true,
          },
          {
            title: t('admin.parentsNav'),
            href: '/admin/parents',
            icon: UsersRound,
            active: true,
          },
          {
            title: t('admin.lockedAccountsNav'),
            href: '/admin/locked-accounts',
            icon: ShieldAlert,
            active: true,
          },
        ],
      }
    : null;

  const parentsFlatItem: NavItem | null = isSuperAdmin
    ? null
    : { title: 'Parents', href: '/parents', icon: UserCog, active: false };

  const profileItem: NavItem = {
    title: 'Profile',
    href: '/profile',
    icon: User,
    active: true,
  };

  const attendanceEntry: SidebarEntry =
    user?.role === 'STAFF'
      ? {
          kind: 'group',
          title: 'Attendance',
          icon: Calendar,
          items: [
            {
              title: 'Time Clock',
              href: '/attendance',
              icon: Clock,
              active: true,
            },
            {
              title: 'My Schedule',
              href: '/attendance/my-schedule',
              icon: Calendar,
              active: true,
            },
            {
              title: 'My Corrections',
              href: '/attendance/my-corrections',
              icon: Settings,
              active: true,
            },
          ],
        }
      : user?.role === 'DIRECTOR' || isSuperAdmin
        ? {
            kind: 'group',
            title: 'Attendance',
            icon: Calendar,
            items: [
              {
                title: 'Team Clock',
                href: '/attendance/team',
                icon: Users,
                active: true,
              },
              {
                title: 'Corrections',
                href: '/attendance/corrections',
                icon: Settings,
                active: true,
              },
              {
                title: 'Schedules',
                href: '/attendance/schedules',
                icon: Calendar,
                active: true,
              },
            ],
          }
        : { title: 'Attendance', href: '/attendance', icon: Calendar, active: false };

  // Children (Etapa 2): live for DIRECTOR / SUPER_ADMIN (center roster) and
  // PARENT (their own kids → read-only). STAFF has no access — the backend
  // denies it too, so we hide the entry entirely rather than show it disabled.
  const childrenItem: NavItem | null =
    user?.role === 'STAFF'
      ? null
      : { title: 'Children', href: '/children', icon: Baby, active: true };

  return [
    { title: 'Dashboard', href: '/dashboard', icon: Home, active: true },
    profileItem,
    ...(usersGroup ? [usersGroup] : []),
    ...(centerItem ? [centerItem] : []),
    ...(childrenItem ? [childrenItem] : []),
    ...(staffGroup ? [staffGroup] : []),
    ...(parentsFlatItem ? [parentsFlatItem] : []),
    attendanceEntry,
    ...(user?.role === 'DIRECTOR' || isSuperAdmin
      ? [{ title: 'Kiosk', href: '/kiosk-settings', icon: Store, active: true } satisfies NavItem]
      : []),
    ...(user?.role === 'DIRECTOR' || isSuperAdmin
      ? [
          {
            kind: 'group' as const,
            title: 'Reports',
            icon: BarChart3,
            items: [
              {
                title: 'Payroll',
                href: '/reports/payroll',
                icon: DollarSign,
                active: true,
              },
            ],
          } satisfies NavGroup,
        ]
      : user?.role === 'STAFF'
        ? [
            {
              kind: 'group' as const,
              title: 'Reports',
              icon: BarChart3,
              items: [
                {
                  title: 'My Payroll',
                  href: '/reports/my-payroll',
                  icon: DollarSign,
                  active: true,
                },
              ],
            } satisfies NavGroup,
          ]
        : [{ title: 'Reports', href: '/reports', icon: BarChart3, active: false } as NavItem]),
    { title: 'Billing', href: '/billing', icon: CreditCard, active: false },
  ];
}
