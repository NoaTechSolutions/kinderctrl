import {
  IsBoolean,
  IsDate,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CHILD_PACIFIER_USE, CHILD_SLEEP_LOCATIONS } from '../children.constants';

// Children Fase 2 (2D) — input for PATCH /children/:id/infant-sleep (LIC 9227).
// Partial MERGE upsert: omitted fields are left untouched, null clears.
export class UpdateInfantSleepDto {
  @IsIn(CHILD_SLEEP_LOCATIONS) @IsOptional() sleepLocation?: string;
  @IsString() @IsOptional() @MaxLength(200) sleepLocationOther?: string;
  @IsString() @IsOptional() @MaxLength(200) usualSleepHours?: string;
  @IsString() @IsOptional() @MaxLength(200) averageNapDuration?: string;

  @IsIn(CHILD_PACIFIER_USE) @IsOptional() usesPacifier?: string;
  @IsString() @IsOptional() @MaxLength(200) pacifierBrand?: string;

  @IsBoolean() @IsOptional() canRollOver?: boolean;
  @IsDate() @Type(() => Date) @IsOptional() rollOverDate?: Date;
  @IsBoolean() @IsOptional() providerObservedRoll?: boolean;

  @IsBoolean() @IsOptional() medicalExemption?: boolean;
  @IsString() @IsOptional() @MaxLength(2000) medicalExemptionInstructions?: string;
}
