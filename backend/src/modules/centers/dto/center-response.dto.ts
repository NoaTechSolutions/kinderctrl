import { CenterStatus } from '@prisma/client';

export class CenterResponseDto {
  id: string;
  name: string;
  street: string;
  city: string;
  state: string;
  zipCode: string;
  phone: string;
  email: string;
  timezone: string;
  capacity: number;
  licenseNumber: string | null;
  status: CenterStatus;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;

  owner?: {
    id: string;
    email: string;
  };
}
