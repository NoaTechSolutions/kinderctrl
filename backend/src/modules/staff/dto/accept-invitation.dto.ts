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

  // Position field removed per PO QA #8 (Opción C) — invitee skips it.
  // Director can set it later via PATCH /staff/:id if needed. Field is
  // still present on the Staff DB column (not destructive to drop yet).

  // Same minimum as auth/register. Bcrypt-hashed in the service.
  @IsString()
  @MinLength(8, {
    message: 'Password must be at least 8 characters',
  })
  password: string;
}
