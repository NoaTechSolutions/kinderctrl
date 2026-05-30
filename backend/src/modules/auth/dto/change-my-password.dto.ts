import { IsString, Matches, MinLength } from 'class-validator';

// PATCH /auth/me/password — in-app password change. Requires the current
// password (NOT just the JWT) so a stolen device with a live session
// can't silently rotate the credential. Successful change revokes every
// session for the user — both this device and every other — forcing a
// re-login with the new password. The newPassword rule mirrors
// RegisterDto / ResetPasswordDto exactly; changing one means changing
// all three.
export class ChangeMyPasswordDto {
  @IsString()
  currentPassword!: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @Matches(/((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/, {
    message:
      'Password must contain uppercase, lowercase, and number/special character',
  })
  newPassword!: string;
}
