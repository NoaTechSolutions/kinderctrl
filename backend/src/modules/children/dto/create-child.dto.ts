import {
  ArrayMinSize,
  IsArray,
  IsDate,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CHILD_GENDERS } from '../children.constants';
import { ChildParentInputDto } from './child-parent-input.dto';

export class CreateChildDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  firstName: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  middleName?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  lastName: string;

  @IsDate()
  @Type(() => Date)
  dateOfBirth: Date;

  @IsIn(CHILD_GENDERS)
  gender: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  photoUrl?: string;

  // Child's own address + phone (all optional).
  @IsOptional() @IsString() @MaxLength(20) addressNumber?: string;
  @IsOptional() @IsString() @MaxLength(200) addressStreet?: string;
  @IsOptional() @IsString() @MaxLength(100) addressCity?: string;
  @IsOptional() @IsString() @MaxLength(2) addressState?: string;
  @IsOptional() @IsString() @MaxLength(10) addressZip?: string;
  @IsOptional() @IsString() @MaxLength(20) phone?: string;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  admissionDate?: Date;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  firstCareDay?: Date;

  // Spec: at least ONE parent is required at create time. Each entry either
  // links an existing parent or creates a new one, with the pivot metadata.
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one parent is required' })
  @ValidateNested({ each: true })
  @Type(() => ChildParentInputDto)
  parents: ChildParentInputDto[];
}
