export type CenterStatus = 'SETUP_PENDING' | 'ACTIVE' | 'SUSPENDED' | 'CLOSED';

export interface CenterOwner {
  id: string;
  email: string;
}

export interface Center {
  id: string;
  name: string;
  street: string;
  city: string;
  state: string;
  zipCode: string;
  phone: string;
  email: string;
  website: string | null;
  capacity: number;
  licenseNumber: string | null;
  timezone: string;
  status: CenterStatus;
  ownerId: string;
  setupCompletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  owner?: CenterOwner;
}

export interface CenterHours {
  id: string;
  centerId: string;
  dayOfWeek: number;
  openTime: string;
  closeTime: string;
  isOpen: boolean;
}

export const VALID_TIMEZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Anchorage',
  'Pacific/Honolulu',
] as const;

export type ValidTimezone = (typeof VALID_TIMEZONES)[number];
