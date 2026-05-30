import { IsDateString, IsOptional, IsString, Length } from 'class-validator';

export class ApproveCorrectionDto {
  @IsOptional()
  @IsDateString()
  clockIn?: string;

  @IsOptional()
  @IsDateString()
  breakIn?: string;

  @IsOptional()
  @IsDateString()
  breakOut?: string;

  @IsOptional()
  @IsDateString()
  clockOut?: string;

  @IsOptional()
  @IsString()
  @Length(0, 500)
  directorComment?: string;
}
