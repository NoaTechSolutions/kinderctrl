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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';

interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  active: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { title: 'Dashboard', href: '/dashboard', icon: Home, active: true },
  { title: 'Centers', href: '/centers', icon: Building2, active: true },
  { title: 'Children', href: '/children', icon: Baby, active: false },
  { title: 'Staff', href: '/staff', icon: Users, active: false },
  { title: 'Parents', href: '/parents', icon: UserCog, active: false },
  { title: 'Attendance', href: '/attendance', icon: Calendar, active: false },
  { title: 'Reports', href: '/reports', icon: BarChart3, active: false },
  { title: 'Billing', href: '/billing', icon: CreditCard, active: false },
  { title: 'Settings', href: '/settings', icon: Settings, active: false },
];

interface MobileNavProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MobileNav({ open, onOpenChange }: MobileNavProps) {
  const pathname = usePathname();

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
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = pathname.startsWith(item.href);

            if (!item.active) {
              return (
                <div
                  key={item.href}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium opacity-60 cursor-not-allowed select-none"
                  style={{ color: 'var(--kc-text-3)' }}
                  aria-disabled="true"
                >
                  <Icon className="h-5 w-5 flex-none" />
                  <span className="flex-1">{item.title}</span>
                  <Badge
                    variant="secondary"
                    className="text-[10px] px-1.5 py-0"
                  >
                    Soon
                  </Badge>
                </div>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => onOpenChange(false)}
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
                onMouseEnter={(e) => {
                  if (!isActive)
                    e.currentTarget.style.background = 'var(--kc-surface-2)';
                }}
                onMouseLeave={(e) => {
                  if (!isActive)
                    e.currentTarget.style.background = 'transparent';
                }}
              >
                <Icon className="h-5 w-5 flex-none" />
                <span>{item.title}</span>
              </Link>
            );
          })}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
