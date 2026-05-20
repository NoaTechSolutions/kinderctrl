import {
  IsBoolean,
  IsDateString,
  IsEmail,
  IsEnum,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
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

  // Optional. Director can leave blank at create; staff fills later from
  // their profile. ISO date string (yyyy-mm-dd); stored as DATE in DB.
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

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

  // Free-text job title — display + HR reporting only, NOT used for authz.
  // 50 chars matches schema.prisma VarChar(50). Per PO decision: free
  // text, no controlled vocabulary.
  @IsOptional()
  @IsString()
  @Length(0, 50)
  position?: string;

  // SUPER_ADMIN MUST provide this (which center to put the staff into).
  // DIRECTOR omits it (auto-derived from User.centerId), or passes one of
  // their owned centers for multi-center DIRECTORs (validated via
  // resolveCenterIdForUser in the service).
  @IsOptional()
  @IsUUID()
  centerId?: string;

  // UI shortcut: a Director creating a new hire can flip these to true
  // when the new hire already has compliance verified. Service translates
  // `true` → backgroundCheckStatus=APPROVED + date=now + verifier=current
  // user. For richer edits (expiry date, notes, provider, transitions),
  // use the dedicated PATCH /staff/:id/background-check + /cpr endpoints
  // (or the Compliance Card on the detail page).
  @IsOptional()
  @IsBoolean()
  backgroundCheckCompleted?: boolean;

  @IsOptional()
  @IsBoolean()
  cprCertified?: boolean;
}
