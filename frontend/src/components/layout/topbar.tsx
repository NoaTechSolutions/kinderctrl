'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ChevronDown,
  Loader2,
  LogOut,
  Menu,
  Moon,
  Palette,
  Play,
  Settings,
  Sun,
  User,
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { TopbarAlertsBell } from '@/components/layout/alerts-bell';
import { UserAvatar } from '@/components/profile/user-avatar';
import { useAuthStore } from '@/store/auth';
import { logout as logoutApi } from '@/lib/api/auth';
import { activateKiosk, KioskNotConfiguredError } from '@/lib/api/kiosk';
import { getDisplayRole } from '@/lib/user-display';
import { useTheme, type Theme } from '@/lib/theme';

interface TopbarProps {
  onMenuClick?: () => void;
}

// Theme segmented control (Light / Dark) shown inside the user dropdown. Reuses
// the same useTheme().setTheme so the app-wide theme switch is unchanged — only
// the affordance moved here from the standalone ThemeDropdown.
const THEME_SEGMENTS: { value: Theme; Icon: typeof Sun; label: string }[] = [
  { value: 'light', Icon: Sun, label: 'Light' },
  { value: 'dark', Icon: Moon, label: 'Dark' },
];

export function Topbar({ onMenuClick }: TopbarProps) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const clearTokens = useAuthStore((s) => s.clearTokens);

  const [kioskLoading, setKioskLoading] = useState(false);
  const { theme, setTheme } = useTheme();

  const canAccessKiosk = user?.role === 'DIRECTOR' || user?.role === 'SUPER_ADMIN';

  // Topbar identity — the USER's own name (role-aware: STAFF/PARENT names live
  // in their sub-objects), with the center name as a fallback when the user has
  // no name configured yet.
  const idSub =
    user?.role === 'STAFF'
      ? user.staff
      : user?.role === 'PARENT'
        ? user.parent
        : null;
  const fName = idSub?.firstName ?? user?.firstName;
  const lName = idSub?.lastName ?? user?.lastName;
  const userName = [fName, lName].filter(Boolean).join(' ');
  // Fallback chain: user's name → center name (per spec) → brand (SA, no center).
  const displayName = userName || user?.center?.name || 'KinderCtrl';
  const role = user ? getDisplayRole(user) : '';

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
        {/* Alerts bell — left of the user button, always visible. */}
        <TopbarAlertsBell />

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
              className="flex items-center gap-1.5 ml-1 hover:opacity-80 transition-opacity focus:outline-none focus-visible:outline-none focus:ring-0"
              aria-label="User menu"
            >
              {/* Avatar-only trigger — the full identity (name / email / role)
                  lives in the dropdown header, so the button stays compact and
                  doesn't repeat what the header already shows. */}
              <UserAvatar
                firstName={fName}
                lastName={lName}
                email={user?.email}
                className="h-[30px] w-[30px]"
              />
              <ChevronDown className="h-3.5 w-3.5" style={{ color: 'var(--kc-text-3)' }} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            {/* Header: avatar + name + email + role pill (the button is just the
                avatar now, so the full identity lives here). */}
            <div className="flex items-center gap-3 px-2 py-2">
              <UserAvatar
                firstName={fName}
                lastName={lName}
                email={user?.email}
                className="h-[42px] w-[42px]"
              />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold" style={{ color: 'var(--kc-text-1)' }}>
                  {displayName}
                </p>
                {user?.email && (
                  <p className="truncate text-xs" style={{ color: 'var(--kc-text-3)' }}>
                    {user.email}
                  </p>
                )}
                {role && (
                  <span
                    className="mt-1 inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium"
                    style={{ background: 'var(--kc-p-50)', color: 'var(--kc-p-600)' }}
                  >
                    {role}
                  </span>
                )}
              </div>
            </div>

            <DropdownMenuSeparator />

            <DropdownMenuItem asChild>
              <Link href="/profile">
                <User className="mr-2 h-4 w-4" />
                <span>Profile</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/settings">
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </Link>
            </DropdownMenuItem>

            {/* Theme row — a custom (non-item) row so the segmented buttons
                don't dismiss the menu; setTheme is the same app-wide switch. */}
            <div className="flex items-center justify-between gap-2 px-2 py-1.5">
              <span className="flex items-center gap-2 text-sm" style={{ color: 'var(--kc-text-2)' }}>
                <Palette className="h-4 w-4" />
                Theme
              </span>
              <div
                className="flex rounded-md border p-0.5"
                style={{ borderColor: 'var(--kc-border)', background: 'var(--kc-surface-2)' }}
              >
                {THEME_SEGMENTS.map(({ value, Icon, label }) => {
                  const active = theme === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setTheme(value)}
                      aria-label={label}
                      aria-pressed={active}
                      className="flex h-6 w-7 items-center justify-center rounded transition-colors"
                      style={
                        active
                          ? { background: 'var(--kc-p-600)', color: '#fff' }
                          : { color: 'var(--kc-text-3)' }
                      }
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </button>
                  );
                })}
              </div>
            </div>

            <DropdownMenuSeparator />

            <DropdownMenuItem variant="destructive" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
