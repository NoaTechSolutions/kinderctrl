import {
  IsString,
  IsNotEmpty,
  IsDate,
  IsOptional,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateChildDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  firstName: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  lastName: string;

  @IsDate()
  @Type(() => Date)
  dateOfBirth: Date;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  gender: string;

  @IsDate()
  @Type(() => Date)
  @IsOptional()
  enrollmentDate?: Date;
}
