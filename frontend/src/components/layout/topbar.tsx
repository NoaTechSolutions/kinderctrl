'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ChevronDown,
  Loader2,
  LogOut,
  Menu,
  Play,
  Settings,
  User,
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ThemeDropdown } from '@/components/auth/theme-dropdown';
import { TopbarAlertsBell } from '@/components/layout/alerts-bell';
import { UserAvatar } from '@/components/profile/user-avatar';
import { useAuthStore } from '@/store/auth';
import { logout as logoutApi } from '@/lib/api/auth';
import { activateKiosk, KioskNotConfiguredError } from '@/lib/api/kiosk';
import { getTopbarTitle, getTopbarSubtitle } from '@/lib/user-display';

interface TopbarProps {
  onMenuClick?: () => void;
}

export function Topbar({ onMenuClick }: TopbarProps) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const clearTokens = useAuthStore((s) => s.clearTokens);

  const [kioskLoading, setKioskLoading] = useState(false);

  const canAccessKiosk = user?.role === 'DIRECTOR' || user?.role === 'SUPER_ADMIN';

  const handleLogout = async () => {
    try {
      await logoutApi();
    } catch {
      // ignore: even if backend call fails we still clear local state
    } finally {
      clearTokens();
      router.replace('/login');
    }
  };

  // Launch the kiosk directly — no PIN required (the PIN is only used to exit).
  const handleLaunchKiosk = async () => {
    setKioskLoading(true);
    try {
      const result = await activateKiosk();
      sessionStorage.setItem('kc-kiosk-token', result.kioskSessionToken);
      sessionStorage.setItem('kc-kiosk-timeout', String(result.timeoutMin));
      router.push('/kiosk');
    } catch (e) {
      if (e instanceof KioskNotConfiguredError) {
        toast.error('Set up a PIN first');
      } else {
        toast.error('Could not launch kiosk');
      }
      router.push('/kiosk-settings');
    } finally {
      setKioskLoading(false);
    }
  };

  return (
    <div
      className="flex h-16 items-center justify-between border-b px-3 md:px-6"
      style={{
        background: 'var(--kc-surface)',
        borderColor: 'var(--kc-border)',
      }}
    >
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={onMenuClick}
        aria-label="Open navigation"
      >
        <Menu className="h-5 w-5" />
      </Button>

      <div className="flex-1 lg:flex-none" />

      <div className="flex items-center gap-2">
        {/* Alerts bell — left of the theme toggle, always visible. */}
        <TopbarAlertsBell />
        <ThemeDropdown />

        {canAccessKiosk && (
          <Button
            variant="outline"
            size="sm"
            title="Launch Kiosk Mode"
            onClick={handleLaunchKiosk}
            disabled={kioskLoading}
          >
            {kioskLoading
              ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              : <Play className="mr-1.5 h-3.5 w-3.5 fill-current" />}
            Kiosk
          </Button>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="flex items-center gap-2 ml-1 hover:opacity-80 transition-opacity focus:outline-none focus-visible:outline-none focus:ring-0"
              aria-label="User menu"
            >
              <UserAvatar
                firstName={user?.firstName}
                lastName={user?.lastName}
                email={user?.email}
                className="h-9 w-9"
              />
              {user && (
                <div className="hidden md:flex flex-col items-start leading-tight">
                  <span className="text-sm font-semibold truncate max-w-[160px]" style={{ color: 'var(--kc-text-1)' }} title={getTopbarTitle(user)}>
                    {getTopbarTitle(user)}
                  </span>
                  <span className="text-xs truncate max-w-[160px]" style={{ color: 'var(--kc-text-3)' }} title={getTopbarSubtitle(user)}>
                    {getTopbarSubtitle(user)}
                  </span>
                </div>
              )}
              <ChevronDown className="h-3.5 w-3.5 hidden md:block" style={{ color: 'var(--kc-text-3)' }} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem asChild>
              <Link href="/profile">
                <User className="mr-2 h-4 w-4" />
                <span>Profile</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem disabled>
              <Settings className="mr-2 h-4 w-4" />
              <span>Settings</span>
              <Badge variant="secondary" className="ml-auto text-[10px] px-1.5 py-0">Soon</Badge>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Logout</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
