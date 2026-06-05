import type { AuthUser, StaffRole } from '@/store/auth';

// "ADMIN" as a StaffRole is rendered "Center Admin" to disambiguate from
// the auth-level SUPER_ADMIN role — surfacing it as plain "Admin" in the
// topbar/dashboard would read as elevated permission it doesn't carry.
const STAFF_ROLE_LABEL: Record<StaffRole, string> = {
  TEACHER: 'Teacher',
  ASSISTANT: 'Assistant',
  ADMIN: 'Center Admin',
};

/**
 * Heading shown on /dashboard.
 *  - STAFF / PARENT → greeted by their own profile name ("Welcome, Jane Doe"),
 *    NOT the center name — they read their own identity, not the org's.
 *  - DIRECTOR → keeps the center name (pending Israel's confirmation).
 *  - SUPER_ADMIN (typically center-less) → its role as the salutation.
 * The name-less branches fall back to a bare "Welcome" defensively.
 */
export function getDashboardGreeting(user: AuthUser): string {
  if (user.role === 'SUPER_ADMIN') {
    return 'Welcome, Super Admin';
  }
  // STAFF and PARENT greet by their own name. Both carry a center, so these
  // checks MUST precede the center-name branch below.
  if (user.role === 'STAFF') {
    const name = user.staff
      ? `${user.staff.firstName} ${user.staff.lastName}`.trim()
      : '';
    return name ? `Welcome, ${name}` : 'Welcome';
  }
  if (user.role === 'PARENT') {
    const name = user.parent
      ? `${user.parent.firstName} ${user.parent.lastName}`.trim()
      : '';
    return name ? `Welcome, ${name}` : 'Welcome';
  }
  if (user.center?.name) {
    return `Welcome, ${user.center.name}`;
  }
  if (user.role === 'DIRECTOR') {
    return 'Welcome, Director';
  }
  return 'Welcome';
}

/**
 * Topbar identity — line 1 (bold). Center name for DIRECTOR, full name for
 * STAFF, "KinderCtrl" for SUPER_ADMIN.
 */
export function getTopbarTitle(user: AuthUser): string {
  if (user.role === 'SUPER_ADMIN') return 'KinderCtrl';
  if (user.role === 'STAFF' && user.staff) {
    return `${user.staff.firstName} ${user.staff.lastName}`.trim();
  }
  return user.center?.name ?? 'KinderCtrl';
}

/**
 * Topbar identity — line 2 (muted). Director name for DIRECTOR, job title for
 * STAFF, "Super Admin" for SUPER_ADMIN.
 */
export function getTopbarSubtitle(user: AuthUser): string {
  if (user.role === 'DIRECTOR') {
    const name = [user.firstName, user.lastName].filter(Boolean).join(' ');
    return name || 'Director';
  }
  return getDisplayRole(user);
}

/**
 * Job-title or auth-role string for the topbar / dashboard subheading.
 * For STAFF, prefers the `staff.role` (TEACHER → "Teacher") over the
 * generic "Staff" — see UserRole vs StaffRole in the data model.
 */
export function getDisplayRole(user: AuthUser): string {
  switch (user.role) {
    case 'SUPER_ADMIN':
      return 'Super Admin';
    case 'DIRECTOR':
      return 'Director';
    case 'STAFF':
      return user.staff?.role ? STAFF_ROLE_LABEL[user.staff.role] : 'Staff';
    case 'PARENT':
      return 'Parent';
    default:
      return '';
  }
}
