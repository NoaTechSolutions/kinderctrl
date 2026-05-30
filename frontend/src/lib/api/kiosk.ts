import { apiRequest, ApiError } from './client';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3002';

export interface KioskSettings {
  id?: string;
  centerId: string;
  isEnabled: boolean;
  timeoutMin: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface KioskStaff {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
  shiftStatus: {
    clockedIn: boolean;
    onBreak: boolean;
    clockedOut: boolean;
    nextActions: string[];
  };
  scheduleToday: { startTime: string; endTime: string } | null;
  workedMinutes: number;
}

export interface KioskStaffResponse {
  center: { name: string; directorEmail: string | null };
  staff: KioskStaff[];
}

// Thrown when launching a kiosk that hasn't been configured with a PIN yet.
export class KioskNotConfiguredError extends Error {
  constructor() {
    super('Kiosk not configured');
    this.name = 'KioskNotConfiguredError';
  }
}

// Thrown when the kiosk PIN is wrong (or the kiosk gets locked) on exit.
// Carries the structured payload from the backend so callers can branch on lockout.
export class KioskPinError extends Error {
  attemptsRemaining?: number;
  locked?: boolean;
  email?: string | null;
  constructor(message: string, opts: { attemptsRemaining?: number; locked?: boolean; email?: string | null } = {}) {
    super(message);
    this.name = 'KioskPinError';
    this.attemptsRemaining = opts.attemptsRemaining;
    this.locked = opts.locked;
    this.email = opts.email;
  }
}

export interface KioskPunchResponse {
  entry: {
    id: string;
    staffId: string;
    type: string;
    deviceTimestamp: string;
    source: string;
  };
  shiftStatus: {
    clockedIn: boolean;
    onBreak: boolean;
    clockedOut: boolean;
    nextActions: string[];
  };
}

export interface KioskActivityEntry {
  id: string;
  staffName: string;
  type: string;
  deviceTimestamp: string;
  date: string;
}

export interface KioskActivity {
  todayCount: number;
  lastActivity: string | null;
  entries: KioskActivityEntry[];
}

export function getKioskActivity() {
  return apiRequest<KioskActivity>('/attendance/kiosk/activity');
}

export function getKioskSettings() {
  return apiRequest<KioskSettings>('/attendance/kiosk/settings');
}

export function setupKiosk(data: { pin: string; timeoutMin: number }) {
  return apiRequest<KioskSettings>('/attendance/kiosk/setup', {
    method: 'POST',
    body: data,
  });
}

// Launches the kiosk — no PIN required. Throws KioskNotConfiguredError (404)
// when the center hasn't set up a PIN yet.
export async function activateKiosk() {
  try {
    return await apiRequest<{ kioskSessionToken: string; timeoutMin: number }>(
      '/attendance/kiosk/activate',
      { method: 'POST' },
    );
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      throw new KioskNotConfiguredError();
    }
    throw err;
  }
}

export function deactivateKiosk() {
  return apiRequest<{ deactivated: boolean }>('/attendance/kiosk/deactivate', {
    method: 'POST',
  });
}

export function resetKioskPin() {
  return apiRequest<{ reset: boolean }>('/attendance/kiosk/reset-pin', {
    method: 'POST',
  });
}

export async function getKioskStaff(token: string) {
  const res = await fetch(`${API_URL}/attendance/kiosk/staff`, {
    headers: { 'x-kiosk-token': token, 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw new Error(`Kiosk staff fetch failed: ${res.status}`);
  return res.json() as Promise<KioskStaffResponse>;
}

// Verifies the kiosk PIN (used to exit kiosk mode). Throws KioskPinError on a
// wrong PIN (with remaining attempts) or on lockout (423).
export async function verifyKioskPin(token: string, pin: string) {
  const res = await fetch(`${API_URL}/attendance/kiosk/verify-pin`, {
    method: 'POST',
    headers: { 'x-kiosk-token': token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ pin }),
  });
  if (res.ok) return res.json() as Promise<{ valid: true }>;

  const body = await res.json().catch(() => ({}));
  if (res.status === 423) {
    throw new KioskPinError(body.message ?? 'Kiosk locked', { locked: true, email: body.email });
  }
  throw new KioskPinError(body.message ?? 'Incorrect PIN', {
    attemptsRemaining: body.attemptsRemaining,
  });
}

export async function kioskPunch(
  token: string,
  data: { staffId: string; type: string; deviceTimestamp: string; latitude?: number; longitude?: number },
) {
  const res = await fetch(`${API_URL}/attendance/kiosk/punch`, {
    method: 'POST',
    headers: { 'x-kiosk-token': token, 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? `Punch failed: ${res.status}`);
  }
  return res.json() as Promise<KioskPunchResponse>;
}

// Exit-screen "Forgot PIN" — disables the kiosk and emails the director a
// reset link. Authenticated by the kiosk session token.
export async function requestKioskReset(token: string) {
  const res = await fetch(`${API_URL}/attendance/kiosk/request-reset`, {
    method: 'POST',
    headers: { 'x-kiosk-token': token, 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw new Error(`Reset request failed: ${res.status}`);
  return res.json() as Promise<{ email: string | null }>;
}

// Public (no auth) — validate a reset token for the no-login reset page.
export function getKioskResetInfo(token: string) {
  return apiRequest<{ centerName: string }>(
    `/attendance/kiosk/reset-pin/info?token=${encodeURIComponent(token)}`,
    { skipAuth: true },
  );
}

// Public (no auth) — set a new PIN via a valid reset token.
export function confirmKioskResetPin(data: { token: string; newPin: string }) {
  return apiRequest<{ success: boolean }>('/attendance/kiosk/reset-pin/confirm', {
    method: 'POST',
    body: data,
    skipAuth: true,
  });
}
