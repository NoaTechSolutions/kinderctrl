'use client';

import { useRouter } from 'next/navigation';
import { LogOut, Menu, Settings, User } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ThemeDropdown } from '@/components/auth/theme-dropdown';
import { LanguageDropdown } from '@/components/auth/language-dropdown';
import { useAuthStore } from '@/store/auth';
import { logout as logoutApi } from '@/lib/api/auth';

interface TopbarProps {
  onMenuClick?: () => void;
}

export function Topbar({ onMenuClick }: TopbarProps) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const clearTokens = useAuthStore((s) => s.clearTokens);

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

  const initials = user?.email
    ? user.email.substring(0, 2).toUpperCase()
    : 'U';

  return (
    <div
      className="flex h-16 items-center justify-between border-b px-6"
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
        <ThemeDropdown />
        <LanguageDropdown />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="relative h-10 w-10 rounded-full ml-1 p-0"
              aria-label="User menu"
            >
              <Avatar className="h-10 w-10">
                <AvatarFallback
                  className="text-white font-semibold"
                  style={{ background: 'var(--kc-p-600)' }}
                >
                  {initials}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col gap-0.5">
                <p className="text-sm font-medium truncate">{user?.email}</p>
                <p
                  className="text-xs"
                  style={{ color: 'var(--kc-text-3)' }}
                >
                  {user?.role}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled>
              <User className="mr-2 h-4 w-4" />
              <span>Profile</span>
              <Badge variant="secondary" className="ml-auto text-[10px] px-1.5 py-0">
                Soon
              </Badge>
            </DropdownMenuItem>
            <DropdownMenuItem disabled>
              <Settings className="mr-2 h-4 w-4" />
              <span>Settings</span>
              <Badge variant="secondary" className="ml-auto text-[10px] px-1.5 py-0">
                Soon
              </Badge>
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
