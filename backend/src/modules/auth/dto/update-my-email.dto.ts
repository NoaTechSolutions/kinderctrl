import { IsEmail, IsString } from 'class-validator';

// PATCH /auth/me/email — self-service email change. The current password
// is required to reauthorize the destructive action: changing your email
// rotates all sessions (you get kicked back to /login) so we want a
// freshness check beyond the JWT. Same shape used by changeMyPassword.
export class UpdateMyEmailDto {
  @IsEmail({}, { message: 'Must be a valid email address' })
  newEmail!: string;

  @IsString()
  currentPassword!: string;
}
