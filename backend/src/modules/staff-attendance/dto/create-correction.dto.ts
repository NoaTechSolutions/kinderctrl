import {
  IsBoolean,
  IsDateString,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';

export class CreateCorrectionDto {
  @IsDateString()
  date: string;

  @IsOptional()
  @IsDateString()
  requestedClockIn?: string;

  @IsOptional()
  @IsDateString()
  requestedBreakIn?: string;

  @IsOptional()
  @IsDateString()
  requestedBreakOut?: string;

  @IsOptional()
  @IsDateString()
  requestedClockOut?: string;

  @IsString()
  @Length(1, 500)
  staffComment: string;

  @IsOptional()
  @IsBoolean()
  replaceExisting?: boolean;
}
