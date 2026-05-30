import { PartialType } from '@nestjs/mapped-types';
import { IsEnum, IsOptional } from 'class-validator';
import { StaffStatus } from '@prisma/client';
import { CreateStaffDto } from './create-staff.dto';

// Inherits Partial<CreateStaffDto> + adds optional status transitions.
// PO QA #45: email + centerId changes are NOW honored (SUPER_ADMIN-only,
// gated in the service). Email change triggers session revoke + welcome
// setup email; center change validates the destination exists.
export class UpdateStaffDto extends PartialType(CreateStaffDto) {
  @IsOptional()
  @IsEnum(StaffStatus)
  status?: StaffStatus;
}
