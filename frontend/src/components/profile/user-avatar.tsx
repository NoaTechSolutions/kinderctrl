'use client';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

// Issue #6 — generated initials avatar shared by /profile + topbar.
// No image upload yet (storage backend not decided); when that lands
// we'll layer an AvatarImage in front of the fallback inside this
// component and the rest of the app keeps using it unchanged.
//
// Initials algorithm:
//   - firstName + lastName  → first letter of each (uppercased)
//   - firstName only       → first two letters of firstName
//   - email fallback       → first two letters of the local part
//   - nothing              → "U"
// Matches the topbar's existing inline calculation so the same user
// reads the same letters in both surfaces.
export function initialsFor({
  firstName,
  lastName,
  email,
}: {
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
}): string {
  const f = firstName?.trim();
  const l = lastName?.trim();
  if (f && l) return (f[0] + l[0]).toUpperCase();
  if (f) return f.slice(0, 2).toUpperCase();
  if (email) {
    const local = email.split('@')[0] ?? email;
    return local.slice(0, 2).toUpperCase();
  }
  return 'U';
}

interface UserAvatarProps {
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  size?: 'sm' | 'default' | 'lg' | 'xl';
  className?: string;
}

// `xl` is /profile-page-specific (the hero card).
//
// CRITICAL CSS specificity gotcha (discovered in v7): the Avatar
// primitive has `data-[size=lg]:size-10` baked in, which is a class+
// attribute selector — higher CSS specificity (0,2,0) than a plain
// `.size-N` class (0,1,0). If you pass `size="lg"` to the primitive
// AND add a `size-N` className, the primitive's lg rule silently wins
// and the avatar renders at 40px regardless of N.
//
// Solution kept here: pass size="default" to the primitive so neither
// the lg nor sm data-size rules trigger. Only the primitive's plain
// `size-8` is active, which my appended `size-N` cleanly overrides
// via twMerge.
//
// Sizing intent — v8 (Israel's spec): avatar sized to the hero's
// right-column vertical footprint (3 lines: name + email + badges).
// size-20 (80px) matches that height. text-2xl initials read
// centered without cramping at this size. ring-offset-2 lives in
// HeroCard (offset reads off the card surface, not from in here).
export function UserAvatar({
  firstName,
  lastName,
  email,
  size = 'default',
  className,
}: UserAvatarProps) {
  const initials = initialsFor({ firstName, lastName, email });
  const isXL = size === 'xl';
  return (
    <Avatar
      // size="default" so neither data-[size=lg]:size-10 nor
      // data-[size=sm]:size-6 kicks in and the size-20 below wins.
      size={isXL ? 'default' : size}
      className={cn(isXL && 'size-20', className)}
    >
      <AvatarFallback
        className={cn(
          'text-white font-semibold',
          isXL && 'text-2xl',
        )}
        style={{ background: 'var(--kc-p-600)' }}
      >
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}
