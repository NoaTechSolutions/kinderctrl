import { useAuthStore } from '@/store/auth';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3002';

export class ApiError extends Error {
  status: number;
  body: unknown;

  constructor(status: number, body: unknown, message?: string) {
    super(message ?? `HTTP ${status}`);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
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
      user: {
        id: string;
        email: string;
        role: 'DIRECTOR' | 'STAFF' | 'PARENT' | 'SUPER_ADMIN';
        centerId: string | null;
      };
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
    const msg =
      typeof parsed === 'object' && parsed !== null && 'message' in parsed
        ? String((parsed as { message: unknown }).message)
        : `HTTP ${response.status}`;
    throw new ApiError(response.status, parsed, msg);
  }

  return parsed as T;
}
