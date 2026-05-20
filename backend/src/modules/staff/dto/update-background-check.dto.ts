import { IsDateString, IsEnum, IsOptional, IsString, Length } from 'class-validator';
import { BackgroundCheckStatus } from '@prisma/client';

export class UpdateBackgroundCheckDto {
  @IsEnum(BackgroundCheckStatus)
  status: BackgroundCheckStatus;

  // The date the check was performed. Service-level rule: REQUIRED when
  // status === APPROVED (we want a verifiable timestamp on approval).
  // For other statuses it's optional.
  @IsOptional()
  @IsDateString()
  date?: string;

  // When the check expires (e.g. 5 years out for CA Live Scan). Optional —
  // not every jurisdiction issues a hard expiry, and the cron alert just
  // skips rows with null.
  @IsOptional()
  @IsDateString()
  expiryDate?: string;

  // Free-text — internal notes for the Director (e.g. "Live Scan ref #...").
  @IsOptional()
  @IsString()
  @Length(0, 1000)
  notes?: string;
}
