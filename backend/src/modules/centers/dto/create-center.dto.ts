import {
  IsString,
  IsEmail,
  IsInt,
  Min,
  IsOptional,
  IsIn,
  Length,
  Matches,
} from 'class-validator';
import { VALID_TIMEZONES } from '../types/center.types';

export class CreateCenterDto {
  @IsString()
  @Length(2, 100)
  name: string;

  @IsString()
  @Length(5, 200)
  street: string;

  @IsString()
  @Length(2, 100)
  city: string;

  @IsString()
  @Length(2, 2)
  @Matches(/^[A-Z]{2}$/, { message: 'State must be 2-letter code (e.g., CA, NY)' })
  state: string;

  @IsString()
  @Matches(/^\d{5}(-\d{4})?$/, { message: 'Zip code must be 5 digits or ZIP+4 format' })
  zipCode: string;

  @IsString()
  @Matches(/^\+?1?\d{10,14}$/, { message: 'Phone must be valid US format' })
  phone: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsIn(VALID_TIMEZONES, { message: 'Invalid timezone' })
  timezone?: string;

  @IsInt()
  @Min(1, { message: 'Capacity must be at least 1' })
  capacity: number;

  @IsOptional()
  @IsString()
  licenseNumber?: string;
}
