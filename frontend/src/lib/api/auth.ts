import type { AuthUser, UserRole } from '@/store/auth';
import { apiRequest } from './client';

export interface LoginInput {
  email: string;
  password: string;
}

export interface SignupInput {
  email: string;
  password: string;
  role: UserRole;
  firstName?: string;
  lastName?: string;
  centerId?: string;
}

export interface AuthTokensResponse {
  access_token: string;
  refresh_token: string;
  user: AuthUser;
}

export function login(input: LoginInput) {
  return apiRequest<AuthTokensResponse>('/auth/login', {
    method: 'POST',
    body: input,
    skipAuth: true,
  });
}

export function signup(input: SignupInput) {
  return apiRequest<AuthTokensResponse>('/auth/register', {
    method: 'POST',
    body: input,
    skipAuth: true,
  });
}

export function getCurrentUser() {
  return apiRequest<AuthUser>('/auth/me', {
    method: 'GET',
  });
}

export function logout() {
  return apiRequest<void>('/auth/logout', {
    method: 'POST',
  });
}

export function forgotPassword(email: string) {
  return apiRequest<void>('/auth/forgot-password', {
    method: 'POST',
    body: { email },
    skipAuth: true,
  });
}

export function resetPassword(token: string, newPassword: string) {
  return apiRequest<void>('/auth/reset-password', {
    method: 'POST',
    body: { token, newPassword },
    skipAuth: true,
  });
}

// ──────────────────────────────────────────────────────────────────
// /profile module (Issue #6). Unified self-service surface. All four
// endpoints are JwtAuthGuard'd; me/email + me/password each rate-limit
// 5/15min per IP and revoke every session on success, so the caller
// MUST clear local auth state and redirect to /login after a 204.
// ──────────────────────────────────────────────────────────────────

export type UserStatus =
  | 'ACTIVE'
  | 'PENDING_ACTIVATION'
  | 'SUSPENDED'
  | 'DELETED';

export interface MyEmergencyContact {
  name: string | null;
  phone: string | null;
  relationship: string | null;
}

export interface MyCenter {
  id: string;
  name: string;
  street: string;
  city: string;
  state: string;
  zipCode: string;
  timezone: string;
}

// v2/v3/v6: extended response feeding the full /profile surface. v1
// callers reading firstName/lastName/email/phone/role keep working
// unchanged — the new fields are additive. v3 added address; v6
// switched the single emergencyContact to a pair (emergencyContact1
// + emergencyContact2) to back the 2-tabs UI.
export interface MyProfile {
  firstName: string | null;
  lastName: string | null;
  email: string;
  phone: string | null;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
  timeFormat: '12h' | '24h';
  street: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  // v14: STAFF-only DOB. YYYY-MM-DD string; null for any other role.
  // The PersonalInfo card + modal both gate render on role === 'STAFF'
  // so this field is invisible to DIRECTOR / SUPER_ADMIN even though
  // the API still returns null for them.
  dateOfBirth: string | null;
  emergencyContact1: MyEmergencyContact | null;
  emergencyContact2: MyEmergencyContact | null;
  center: MyCenter | null;
}

export interface UpdateMyProfileInput {
  firstName?: string;
  lastName?: string;
  phone?: string;
  street?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  // v14: STAFF-only. Backend silently drops it for non-STAFF roles.
  // Format: ISO date (YYYY-MM-DD). Empty string must be transformed
  // to undefined by the caller — IsDateString rejects "".
  dateOfBirth?: string;
}

export interface UpdateMyEmailInput {
  newEmail: string;
  currentPassword: string;
}

export interface ChangeMyPasswordInput {
  currentPassword: string;
  newPassword: string;
}

export interface UpdateMyPreferencesInput {
  timeFormat: '12h' | '24h';
}

export interface UpdateMyEmergencyContactInput {
  // v6: picks which contact this payload targets. 1 = primary (the
  // first tab), 2 = secondary. Backend dispatches to the matching
  // column set in either the User row or the Staff satellite per role.
  slot: 1 | 2;
  name?: string;
  phone?: string;
  relationship?: string;
}

export function getMyProfile() {
  return apiRequest<MyProfile>('/auth/me/profile', { method: 'GET' });
}

export function updateMyProfile(input: UpdateMyProfileInput) {
  return apiRequest<MyProfile>('/auth/me/profile', {
    method: 'PATCH',
    body: input,
  });
}

export function updateMyEmail(input: UpdateMyEmailInput) {
  return apiRequest<void>('/auth/me/email', {
    method: 'PATCH',
    body: input,
  });
}

export function changeMyPassword(input: ChangeMyPasswordInput) {
  return apiRequest<void>('/auth/me/password', {
    method: 'PATCH',
    body: input,
  });
}

export function updateMyPreferences(input: UpdateMyPreferencesInput) {
  return apiRequest<MyProfile>('/auth/me/preferences', {
    method: 'PATCH',
    body: input,
  });
}

export function updateMyEmergencyContact(input: UpdateMyEmergencyContactInput) {
  return apiRequest<MyProfile>('/auth/me/emergency-contact', {
    method: 'PATCH',
    body: input,
  });
}
