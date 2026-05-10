'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Baby,
  BarChart3,
  Building2,
  Calendar,
  CreditCard,
  Home,
  Settings,
  UserCog,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/store/auth';
import { useCenters } from '@/lib/hooks/use-centers';
import { useTranslation } from '@/lib/i18n';

interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  active: boolean;
}

const FOOTER_ITEM: NavItem = {
  title: 'Settings',
  href: '/settings',
  icon: Settings,
  active: false,
};

export function Sidebar() {
  const pathname = usePathname();
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const { data: centers } = useCenters();

  // Directors land directly on their primary center (centers[0] by
  // createdAt desc from backend). Multi-center cases use the dashboard
  // banner or URL bar to reach other centers; SUPER_ADMIN and others
  // keep the plural list view.
  const directorWithCenter =
    user?.role === 'DIRECTOR' && (centers?.length ?? 0) >= 1;

  const centerItem: NavItem = directorWithCenter
    ? {
        title: t('centers.titleSingular'),
        href: `/centers/${centers![0].id}`,
        icon: Building2,
        active: true,
      }
    : {
        title: t('centers.title'),
        href: '/centers',
        icon: Building2,
        active: true,
      };

  const NAV_ITEMS: NavItem[] = [
    { title: 'Dashboard', href: '/dashboard', icon: Home, active: true },
    centerItem,
    { title: 'Children', href: '/children', icon: Baby, active: false },
    { title: 'Staff', href: '/staff', icon: Users, active: false },
    { title: 'Parents', href: '/parents', icon: UserCog, active: false },
    { title: 'Attendance', href: '/attendance', icon: Calendar, active: false },
    { title: 'Reports', href: '/reports', icon: BarChart3, active: false },
    { title: 'Billing', href: '/billing', icon: CreditCard, active: false },
  ];

  return (
    <div
      className="flex h-full w-64 flex-col border-r"
      style={{
        background: 'var(--kc-surface)',
        borderColor: 'var(--kc-border)',
      }}
    >
      <div
        className="flex h-16 items-center border-b px-6"
        style={{ borderColor: 'var(--kc-border)' }}
      >
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-lg text-white font-display"
            style={{ background: 'var(--kc-p-600)' }}
          >
            <span className="text-lg font-bold leading-none">K</span>
          </div>
          <span className="font-display text-lg font-semibold tracking-tight">
            KinderCtrl
          </span>
        </Link>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-4">
        {NAV_ITEMS.map((item) => (
          <SidebarItem key={item.href} item={item} pathname={pathname} />
        ))}
      </nav>

      <div
        className="border-t p-4"
        style={{ borderColor: 'var(--kc-border)' }}
      >
        <SidebarItem item={FOOTER_ITEM} pathname={pathname} />
      </div>
    </div>
  );
}

function SidebarItem({ item, pathname }: { item: NavItem; pathname: string }) {
  const Icon = item.icon;
  const isActive = item.href.startsWith('/centers')
    ? pathname.startsWith('/centers')
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
      className={cn(
        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
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
        if (!isActive) e.currentTarget.style.background = 'var(--kc-surface-2)';
      }}
      onMouseLeave={(e) => {
        if (!isActive) e.currentTarget.style.background = 'transparent';
      }}
    >
      <Icon className="h-5 w-5 flex-none" />
      <span>{item.title}</span>
    </Link>
  );
}
