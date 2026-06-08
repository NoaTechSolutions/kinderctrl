import { IsBoolean, IsDate, IsOptional, IsString, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

// Children Fase 2 (2C) — input for PATCH /children/:id/consents. Partial MERGE
// upsert of the daycare permission checklist. NOTE: signedByUserId + signedAt
// are intentionally NOT part of this DTO — the service stamps them from the
// authenticated user on every save, so the legal trail can't be spoofed by the
// client.
export class UpdateConsentsDto {
  @IsBoolean() @IsOptional() waterPlay?: boolean;
  @IsBoolean() @IsOptional() photoInternal?: boolean;
  @IsBoolean() @IsOptional() photoMarketing?: boolean;

  @IsBoolean() @IsOptional() sunscreenRepellent?: boolean;
  @IsString() @IsOptional() @MaxLength(500) sunscreenProducts?: string;
  @IsString() @IsOptional() @MaxLength(1000) sunscreenInstructions?: string;
  @IsDate() @Type(() => Date) @IsOptional() sunscreenStartDate?: Date;
  @IsDate() @Type(() => Date) @IsOptional() sunscreenEndDate?: Date;

  @IsBoolean() @IsOptional() emergencyMedical?: boolean;
  @IsBoolean() @IsOptional() emergencyTransport?: boolean;
}
