import {
  IsBoolean,
  IsDateString,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';

export class UpdateCprDto {
  @IsBoolean()
  certified: boolean;

  // Service-level rule: REQUIRED when certified === true. Optional otherwise.
  @IsOptional()
  @IsDateString()
  certificationDate?: string;

  @IsOptional()
  @IsDateString()
  expiryDate?: string;

  // Free text — typically "Red Cross", "American Heart Association", etc.
  @IsOptional()
  @IsString()
  @Length(0, 100)
  provider?: string;

  @IsOptional()
  @IsString()
  @Length(0, 1000)
  notes?: string;
}
