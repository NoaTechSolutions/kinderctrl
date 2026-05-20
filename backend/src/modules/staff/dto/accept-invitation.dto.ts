import {
  IsOptional,
  IsString,
  Length,
  Matches,
  MinLength,
} from 'class-validator';

export class AcceptInvitationDto {
  // The invitation token from the URL. Hex 64-char string (randomBytes(32)).
  @IsString()
  @Length(32, 128)
  token: string;

  @IsString()
  @Length(2, 50)
  firstName: string;

  @IsString()
  @Length(2, 50)
  lastName: string;

  // Required at registration — Director's expectation is to have a contact
  // number for every staff member. Same US phone regex as other modules.
  @IsString()
  @Matches(/^\+?1?\d{10,14}$/, {
    message: 'Phone must be a valid US phone number',
  })
  phone: string;

  // Free-text job title (e.g. "Lead Toddler Teacher"). 50 chars matches
  // schema.prisma Staff.position VarChar(50).
  @IsOptional()
  @IsString()
  @Length(0, 50)
  position?: string;

  // Same minimum as auth/register. Bcrypt-hashed in the service.
  @IsString()
  @MinLength(8, {
    message: 'Password must be at least 8 characters',
  })
  password: string;
}
