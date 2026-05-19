import { PartialType } from '@nestjs/mapped-types';
import { IsEnum, IsOptional } from 'class-validator';
import { StaffStatus } from '@prisma/client';
import { CreateStaffDto } from './create-staff.dto';

// Inherits Partial<CreateStaffDto> + adds optional status transitions.
// Note: the service does NOT propagate `email` changes to the linked User
// record (would require an extra cross-table tx and an email uniqueness
// check). Email edits on Staff are silently no-op for now; see service.
export class UpdateStaffDto extends PartialType(CreateStaffDto) {
  @IsOptional()
  @IsEnum(StaffStatus)
  status?: StaffStatus;
}
