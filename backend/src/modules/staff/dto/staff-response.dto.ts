import { StaffRole, StaffStatus } from '@prisma/client';

export class StaffResponseDto {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: StaffRole;
  status: StaffStatus;
  hireDate: Date;
  // Decimal in DB → number in API. Null when not set (Staff.hourlyRate optional).
  hourlyRate: number | null;
  employmentType: string;
  phone: string | null;
  notes: string | null;
  centerId: string;
  centerName?: string;
  createdAt: Date;
  updatedAt: Date;
  activatedAt: Date | null;
}
