import {
  IsArray,
  IsInt,
  IsString,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CenterHourDto {
  @IsInt()
  @Min(0, { message: 'dayOfWeek must be 0 (Sunday) through 6 (Saturday)' })
  @Max(6, { message: 'dayOfWeek must be 0 (Sunday) through 6 (Saturday)' })
  dayOfWeek: number;

  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'Time must be in HH:MM format (24-hour)',
  })
  openTime: string;

  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'Time must be in HH:MM format (24-hour)',
  })
  closeTime: string;
}

export class SetCenterHoursDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CenterHourDto)
  hours: CenterHourDto[];
}
