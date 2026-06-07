import { IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { CHILD_CONTACT_TYPES } from '../children.constants';

// Children Fase 2 (2A) — input for POST /children/:id/contacts. All three
// contact kinds (EMERGENCY / AUTHORIZED_PICKUP / RESPONSIBLE) share this shape;
// `contactType` is the discriminator, validated against the whitelist.
export class CreateChildContactDto {
  @IsIn(CHILD_CONTACT_TYPES)
  contactType: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  relationship?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  homePhone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  workPhone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  addressStreet?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  addressCity?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2)
  addressState?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  addressZip?: string;
}
