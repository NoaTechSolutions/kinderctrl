import { IsBoolean, IsEnum, IsOptional } from 'class-validator';
import { BackgroundCheckStatus } from '@prisma/client';

// PO QA #46: simplified to status + approved. The old date / expiryDate /
// notes columns were dropped — the new model only tracks where in the
// lifecycle the check is and (when COMPLETED) what the outcome was.
export class UpdateBackgroundCheckDto {
  @IsEnum(BackgroundCheckStatus)
  status: BackgroundCheckStatus;

  // Outcome of the check — only meaningful when status === COMPLETED.
  // The service nulls it out on PENDING / CANCELLED so a partially
  // filled form doesn't leak stale outcome data after a state change.
  @IsOptional()
  @IsBoolean()
  approved?: boolean;
}
