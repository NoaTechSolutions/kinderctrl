import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEmail,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

// Optional operational data the inviter can pre-populate at invite-time
// (PO QA #28 Opción F). Persists as JSON on StaffInvitationToken and
// gets merged into the new Staff record when the invitee accepts. The
// invitee-supplied fields (firstName, lastName, phone, password) take
// precedence over anything in here — prefill is purely additive.
//
// All fields optional individually. If the inviter doesn't open the
// pre-fill section in the UI at all, this object is omitted entirely.
export class InviteStaffPrefillDto {
  @IsOptional()
  @IsDateString()
  hireDate?: string;

  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @IsOptional()
  @IsIn(['full_time', 'part_time'])
  employmentType?: 'full_time' | 'part_time';

  @IsOptional()
  @IsNumber()
  @Min(0)
  hourlyRate?: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  position?: string;
}

export class InviteStaffDto {
  // Email of the person being invited. Lowercased server-side before lookup
  // so casing variants can't slip past the "one active invite per email" rule.
  @IsEmail()
  email: string;

  // Optional for DIRECTOR (auto-derived from user.centerId); REQUIRED for
  // SUPER_ADMIN (validated in the service). The schema-level check rejects
  // malformed UUIDs early.
  @IsOptional()
  @IsUUID()
  centerId?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => InviteStaffPrefillDto)
  prefill?: InviteStaffPrefillDto;
}
