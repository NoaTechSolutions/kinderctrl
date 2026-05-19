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
 * Heading shown on /dashboard. Reads "Welcome, {center name}" for any user
 * whose center is populated; SUPER_ADMIN (typically center-less) gets its
 * role as the salutation. The DIRECTOR-without-center branch is a defensive
 * fallback — the (dashboard) layout normally bounces those users to setup
 * before the page renders.
 */
export function getDashboardGreeting(user: AuthUser): string {
  if (user.role === 'SUPER_ADMIN') {
    return 'Welcome, Super Admin';
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
