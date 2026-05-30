import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class ScheduleDayDto {
  @IsInt()
  @Min(1)
  @Max(7)
  dayOfWeek: number; // ISO 8601: 1=Mon, 7=Sun

  @IsOptional()
  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: 'startTime must be HH:mm format' })
  startTime?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: 'endTime must be HH:mm format' })
  endTime?: string;

  @IsOptional()
  @IsBoolean()
  isOff?: boolean;
}

export class CreateScheduleDto {
  @IsUUID()
  staffId: string;

  @IsDateString()
  weekStart: string; // Must be a Monday

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(7)
  @ValidateNested({ each: true })
  @Type(() => ScheduleDayDto)
  days: ScheduleDayDto[];
}
