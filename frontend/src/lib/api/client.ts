import { useAuthStore, type AuthUser } from '@/store/auth';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3002';

// Stable identifiers the backend returns in error bodies. Keep in sync with
// backend/src/modules/auth/constants/auth-error-code.enum.ts.
export type ApiErrorCode =
  | 'INVALID_CREDENTIALS'
  | 'ACCOUNT_NOT_ACTIVE'
  | 'ACCOUNT_LOCKED'
  | 'RATE_LIMITED'
  | 'EMAIL_EXISTS'
  | 'RESET_TOKEN_INVALID'
  // Issue #6 — surfaced by /auth/me/email + /auth/me/password when the
  // currentPassword field doesn't match. UI scopes the error to that
  // field instead of showing a generic 401 banner.
  | 'CURRENT_PASSWORD_INVALID';

export class ApiError extends Error {
  status: number;
  body: unknown;
  errorCode?: ApiErrorCode;
  // Seconds until the client may retry — populated for RATE_LIMITED /
  // ACCOUNT_LOCKED responses. The UI uses it to drive a countdown.
  retryAfter?: number;

  constructor(status: number, body: unknown, message?: string) {
    super(message ?? `HTTP ${status}`);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
    if (typeof body === 'object' && body !== null) {
      const b = body as { errorCode?: unknown; retryAfter?: unknown };
      if (typeof b.errorCode === 'string') {
        this.errorCode = b.errorCode as ApiErrorCode;
      }
      if (typeof b.retryAfter === 'number') {
        this.retryAfter = b.retryAfter;
      }
    }
  }
}

async function refreshAccessToken(): Promise<boolean> {
  const { refreshToken, setTokens, clearTokens } = useAuthStore.getState();
  if (!refreshToken) return false;

  try {
    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!res.ok) {
      clearTokens();
      return false;
    }

    const data = (await res.json()) as {
      access_token: string;
      refresh_token: string;
      user: AuthUser;
    };

    setTokens(data.access_token, data.refresh_token, data.user);
    return true;
  } catch {
    clearTokens();
    return false;
  }
}

export interface ApiRequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  skipAuth?: boolean;
}

export async function apiRequest<T = unknown>(
  endpoint: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const { body, skipAuth, headers: extraHeaders, ...rest } = options;

  const buildHeaders = () => {
    const h: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(extraHeaders as Record<string, string> | undefined),
    };
    if (!skipAuth) {
      const token = useAuthStore.getState().accessToken;
      if (token) h.Authorization = `Bearer ${token}`;
    }
    return h;
  };

  const doFetch = () =>
    fetch(`${API_URL}${endpoint}`, {
      ...rest,
      headers: buildHeaders(),
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

  let response = await doFetch();

  if (response.status === 401 && !skipAuth) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      response = await doFetch();
    } else {
      useAuthStore.getState().clearTokens();
      throw new ApiError(401, null, 'Session expired');
    }
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  let parsed: unknown = null;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = text;
    }
  }

  if (!response.ok) {
    if (response.status === 403 && typeof window !== 'undefined') {
      const redirectTo =
        typeof parsed === 'object' && parsed !== null && 'redirectTo' in parsed
          ? String((parsed as { redirectTo: unknown }).redirectTo)
          : null;
      if (redirectTo && window.location.pathname !== redirectTo) {
        window.location.href = redirectTo;
      }
    }
    const msg =
      typeof parsed === 'object' && parsed !== null && 'message' in parsed
        ? String((parsed as { message: unknown }).message)
        : `HTTP ${response.status}`;
    throw new ApiError(response.status, parsed, msg);
  }

  return parsed as T;
}
