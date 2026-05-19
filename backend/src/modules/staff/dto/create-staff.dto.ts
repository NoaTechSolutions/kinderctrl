import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Matches,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { StaffRole } from '@prisma/client';

// Schema stores employmentType as a plain string ("full_time" / "part_time").
// Whitelist values here so callers get a clear 400 instead of bad data.
const EMPLOYMENT_TYPES = ['full_time', 'part_time'] as const;

export class CreateStaffDto {
  @IsString()
  @Length(2, 50)
  firstName: string;

  @IsString()
  @Length(2, 50)
  lastName: string;

  // Used for BOTH the Staff record and the linked User account. User.email
  // is @unique, so the service rejects duplicates upstream of Prisma.
  @IsEmail()
  email: string;

  @IsEnum(StaffRole)
  role: StaffRole;

  @IsDateString()
  hireDate: string;

  @IsString()
  @IsIn(EMPLOYMENT_TYPES, {
    message: 'employmentType must be one of: full_time, part_time',
  })
  employmentType: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  hourlyRate?: number;

  // Optional US phone (digits, optional +1 prefix). Same regex as
  // CreateCenterDto.phone so behavior is consistent across modules.
  @IsOptional()
  @IsString()
  @Matches(/^\+?1?\d{10,14}$/, {
    message: 'Phone must be a valid US phone number',
  })
  phone?: string;

  // Free-text notes capped at 500 chars to keep payloads reasonable.
  @IsOptional()
  @IsString()
  @Length(0, 500)
  notes?: string;
}
