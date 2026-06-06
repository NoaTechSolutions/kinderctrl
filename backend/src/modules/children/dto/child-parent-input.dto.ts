import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { CHILD_PARENT_RELATIONSHIPS } from '../children.constants';

/**
 * One parent link on a child. Two mutually-exclusive modes:
 *   • Link an EXISTING parent     → pass `parentId`.
 *   • Create a NEW parent          → omit `parentId`; firstName/lastName/email
 *     become required (ValidateIf). The new parent gets a User (role PARENT,
 *     password=null) + a welcome-setup email, reusing the Staff create flow.
 * Either way, the relationship metadata (relationship / isPrimary /
 * livesWithChild) describes the ChildParent pivot row.
 */
export class ChildParentInputDto {
  @IsOptional()
  @IsUUID()
  parentId?: string;

  @ValidateIf((o: ChildParentInputDto) => !o.parentId)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  firstName?: string;

  @ValidateIf((o: ChildParentInputDto) => !o.parentId)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  lastName?: string;

  @ValidateIf((o: ChildParentInputDto) => !o.parentId)
  @IsEmail()
  email?: string;

  // Optional HOME contact for a new parent.
  @IsOptional() @IsString() @MaxLength(20) homePhone?: string;
  @IsOptional() @IsString() @MaxLength(20) homeAddressNumber?: string;
  @IsOptional() @IsString() @MaxLength(200) homeAddressStreet?: string;
  @IsOptional() @IsString() @MaxLength(100) homeAddressCity?: string;
  @IsOptional() @IsString() @MaxLength(2) homeAddressState?: string;
  @IsOptional() @IsString() @MaxLength(10) homeAddressZip?: string;

  // Optional WORK contact for a new parent.
  @IsOptional() @IsString() @MaxLength(20) workPhone?: string;
  @IsOptional() @IsString() @MaxLength(200) workEmployer?: string;
  @IsOptional() @IsString() @MaxLength(20) workAddressNumber?: string;
  @IsOptional() @IsString() @MaxLength(200) workAddressStreet?: string;
  @IsOptional() @IsString() @MaxLength(100) workAddressCity?: string;
  @IsOptional() @IsString() @MaxLength(2) workAddressState?: string;
  @IsOptional() @IsString() @MaxLength(10) workAddressZip?: string;

  // ChildParent pivot metadata.
  @IsIn(CHILD_PARENT_RELATIONSHIPS)
  relationship: string;

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;

  @IsOptional()
  @IsBoolean()
  livesWithChild?: boolean;
}
