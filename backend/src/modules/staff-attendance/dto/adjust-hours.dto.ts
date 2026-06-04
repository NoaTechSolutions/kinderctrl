import {
  IsDateString,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
} from 'class-validator';

export class AdjustHoursDto {
  @IsUUID()
  staffId: string;

  /** 'YYYY-MM-DD' — the calendar day being adjusted. */
  @IsDateString()
  date: string;

  @IsOptional()
  @IsISO8601()
  adjustedClockIn?: string;

  @IsOptional()
  @IsISO8601()
  adjustedClockOut?: string;

  @IsOptional()
  @IsISO8601()
  adjustedBreakIn?: string;

  @IsOptional()
  @IsISO8601()
  adjustedBreakOut?: string;

  @IsString()
  @MinLength(5)
  reason: string;
}
