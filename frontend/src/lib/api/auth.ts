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
