import { UserRole } from '@prisma/client';

// Trimmed view used by the locked-accounts admin UI. Intentionally omits
// password, sessions, and unrelated relations — this endpoint only needs
// enough to show "who is locked, why, and where they belong" plus the
// fields the unlock action will reset.
export interface LockedUserDto {
  id: string;
  email: string;
  role: UserRole;
  failedLoginAttempts: number;
  lockedUntil: Date;
  lastLoginAt: Date | null;
  center: { id: string; name: string } | null;
}
